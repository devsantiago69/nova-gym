# Auditoría de seguridad de Nova Gym

Fecha: 22 de julio de 2026  
Alcance: aplicación web Nova Gym, API `/api/v1`, autenticación, autorización, carga y entrega de archivos, dependencias, configuración de Next.js, Nginx, systemd, Redis, PostgreSQL, MinIO y artefactos Docker del repositorio.

## Resumen ejecutivo

La revisión encontró una base razonable de seguridad en contraseñas, validación de archivos privados e identificación de propietarios, pero también superficies importantes: protección CSRF no centralizada, cobertura incompleta de autorización en el borde, ausencia de límites globales, sesiones que no se revocaban al cambiar contraseña, políticas de navegador permisivas, exposición directa del proceso web y dependencias con avisos conocidos.

Las correcciones de prioridad alta y media quedaron desplegadas. La aplicación ahora aplica autenticación y roles centralmente, valida el origen de mutaciones web, limita abuso mediante Redis, revoca sesiones por cambio de contraseña o estado del usuario, endurece cargas, cabeceras y runtime, se ejecuta con Node.js LTS y escucha únicamente en `127.0.0.1:3000` detrás de Nginx.

Esta auditoría reduce de forma material el riesgo; no constituye una garantía de invulnerabilidad ni reemplaza monitoreo, copias de seguridad, rotación periódica de credenciales y pruebas externas independientes.

## Hallazgos y correcciones

| Riesgo inicial | Severidad | Estado | Corrección |
| --- | --- | --- | --- |
| APIs y páginas con cobertura de acceso fragmentada | Alta | Corregido | Proxy central para sesión, estado de cuenta y rol administrador en todas las rutas privadas. |
| Mutaciones expuestas a solicitudes entre sitios | Alta | Corregido | Validación de `Origin`, `Referer` y Fetch Metadata; se rechazan orígenes `cross-site` y `same-site` no confiables. |
| Intentos y consumo de API sin límite global | Alta | Corregido | Límites distribuidos en Redis por IP/usuario, con fallback local y límites más estrictos en login, registro, contraseña y archivos. |
| Sesiones válidas después de cambiar contraseña o suspender cuenta | Alta | Corregido | El JWT comprueba periódicamente estado, rol y `passwordChangedAt`; invalida sesiones antiguas. |
| Dependencias con avisos conocidos | Alta | Corregido | Next.js y NextAuth actualizados; dependencias transitivas fijadas. `pnpm audit --prod`: 0 avisos. |
| Puerto del proceso Next.js expuesto en todas las interfaces | Alta | Corregido | Servicio limitado a `127.0.0.1:3000`; solo Nginx publica la aplicación. |
| Política CSP con `unsafe-eval` en producción | Media | Corregido | CSP de producción sin `unsafe-eval`, bloqueo de marcos, objetos y orígenes no requeridos. |
| Cargas JSON y fotografías susceptibles a abuso de recursos | Media | Corregido | JSON limitado a 1 MiB en API y límites por hora en fotografías; se conservan validaciones de magic bytes, dimensiones y almacenamiento privado. |
| Contraseñas nuevas con política insuficiente | Media | Corregido | Longitud entre 12 y 128 caracteres y rechazo de contraseñas comunes conocidas. |
| Runtime obsoleto | Media | Corregido | Node.js 24 LTS verificado e instalado; servicio y contenedor actualizados. |
| Proceso con permisos amplios | Media | Corregido | Usuario sin privilegios y sandbox de systemd (`NoNewPrivileges`, `ProtectSystem`, dispositivos privados y restricciones de kernel). |
| Renderizado directo de SVG mediante HTML | Media | Corregido | Los QR se muestran como imágenes `data:` generadas en servidor; se eliminó el sink `dangerouslySetInnerHTML`. |
| Docker con secretos predeterminados y puertos públicos | Media | Corregido | Secretos obligatorios por entorno y publicación local del puerto web. |
| Directorio raíz del proyecto escribible globalmente | Media | Corregido | Permisos reducidos de `777` a `755`; salidas auxiliares a `750`. |
| Cabeceras defensivas incompletas | Baja | Corregido | HSTS, CSP, anti-framing, nosniff, referrer policy, COOP, CORP y permissions policy. |

## Controles implementados

- `apps/web/src/proxy.ts`: perímetro común para autenticación, autorización, CSRF, tamaño y rate limiting.
- `apps/web/src/lib/request-security.ts`: validación de procedencia de solicitudes mutables.
- `apps/web/src/lib/rate-limit.ts`: limitador Redis con claves anonimizadas mediante SHA-256.
- `apps/web/src/lib/auth.ts`: sesión de 8 horas, cookies seguras, bloqueo, auditoría y revocación.
- `apps/web/src/modules/auth/password-policy.ts`: política compartida para registro, administración y cambio de contraseña.
- `apps/web/src/lib/private-storage.ts`: almacenamiento privado y rechazo de S3 remoto sin TLS en producción.
- `apps/web/scripts/validate-runtime-env.mjs`: validación previa al arranque de secretos, URLs y almacenamiento.
- `apps/web/next.config.ts`: cabeceras de navegador y caché privada de API.
- `/etc/nginx/sites-enabled/nova-gym`: TLS/HSTS, límites de conexión y timeouts.
- `/etc/systemd/system/nova-gym.service`: bind local, Node.js LTS y sandbox del proceso.

## Evidencia de validación

- Compilación de producción de Next.js 16.2.11: correcta.
- Suite automatizada: 18 archivos y 69 pruebas aprobadas.
- Auditoría de dependencias de producción: 0 vulnerabilidades informativas, bajas, moderadas, altas o críticas.
- Solicitud cross-site simulada: HTTP 403.
- API privada sin sesión: HTTP 401.
- JSON superior a 1 MiB: HTTP 413.
- Bucket privado consultado anónimamente: HTTP 403.
- Servicio Next.js: escucha solo en `127.0.0.1:3000`.
- Evaluación de sandbox de systemd: exposición `2.8 OK`.
- CSP de producción: sin `unsafe-eval`.
- Nginx y unidad systemd: configuración válida.

## Riesgos residuales y siguientes acciones

1. Activar MFA para administradores y códigos de recuperación. Es la siguiente medida de mayor impacto contra robo de credenciales.
2. Rotar las claves de integraciones que hayan sido compartidas previamente por canales humanos, especialmente Evolution API, y actualizar el entorno mediante un gestor de secretos. No guardar claves en Git.
3. Configurar copias de seguridad cifradas y probar restauración de PostgreSQL y del almacenamiento de evidencias.
4. Centralizar alertas de auditoría: bloqueos de cuenta, picos de 401/403/429, cambios de rol, descargas de evidencia y errores de almacenamiento.
5. Aplicar CSP con nonce para poder retirar también `unsafe-inline`; requiere adaptar la carga de scripts/estilos de Next.js y probar todo el frontend.
6. Ejecutar una auditoría independiente del servidor completo. Existen otros servicios públicos en el host que no pertenecen a Nova Gym y quedaron fuera del alcance de cambios para no interrumpir otros sistemas.
7. Programar escaneo de dependencias y pruebas de seguridad en CI para impedir que una actualización vuelva a introducir avisos críticos.

## Operación recomendada

- Revisar semanalmente eventos de seguridad y mensualmente las dependencias.
- Rotar secretos ante cualquier exposición o cambio de personal; no esperar al calendario ordinario.
- Mantener producción detrás de HTTPS y Nginx, sin publicar directamente el puerto 3000.
- Realizar una restauración de prueba de backups al menos cada trimestre.
- Repetir la auditoría después de cambios relevantes en pagos, OAuth, permisos sociales o visualización de evidencias privadas.
