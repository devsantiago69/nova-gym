# GymChallenge

SaaS mobile-first para registrar asistencias, construir hábitos y competir con amigos. El nombre visible se controla con `APP_NAME`.

## Inicio local

1. Copia `.env.example` a `.env` y cambia todos los secretos y credenciales de seed.
2. Ejecuta `corepack enable && pnpm install`.
3. Inicia dependencias con `docker compose up -d postgres redis minio`.
4. Ejecuta `pnpm db:generate && pnpm db:migrate && pnpm db:seed`.
5. Inicia la web con `pnpm dev`.

Para ejecutar todo en contenedores: `docker compose up --build`. La web queda en `http://localhost:3000` y la consola de MinIO en `http://localhost:9001`.

## Comandos

- `pnpm lint`, `pnpm typecheck`, `pnpm test`: verificaciones.
- `pnpm db:migrate`: aplica migraciones versionadas.
- `pnpm db:seed`: crea planes FREE/PRO y el administrador definido por entorno.
- `pnpm build`: compila web y worker.

## Estado

La Fase 1 incluye monorepo, PostgreSQL/Prisma, autenticación Argon2id, bloqueo temporal, cambio inicial obligatorio, RBAC, administración de usuarios, layout responsive, auditoría base, Docker y pruebas iniciales. Los módulos visibles de asistencia, comunidad y retos quedan como destinos informativos hasta sus fases funcionales correspondientes; no simulan operaciones de backend.

Consulta [Arquitectura](docs/architecture.md) y [producción](docs/production.md).
