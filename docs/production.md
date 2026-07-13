# Producción

Usa PostgreSQL, Redis y almacenamiento S3 administrados; TLS en el proxy; `AUTH_SECRET` aleatorio de al menos 32 bytes; credenciales con mínimo privilegio; bucket privado con ciclo de vida; y copias cifradas diarias de PostgreSQL con pruebas periódicas de restauración. Ejecuta `prisma migrate deploy` antes de cambiar el tráfico. Mantén web y worker como procesos independientes y configura health checks en `/health/live` y `/health/ready`.

Nunca uses los valores de `.env.example`. Rota secretos, restringe CORS al dominio de `APP_URL`, centraliza logs sin datos sensibles y conserva auditorías conforme a la política de retención aplicable.
