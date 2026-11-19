# Gestión de la demanda

Aplicación de solo lectura para analizar la demanda de Jira y priorizar el trabajo en curso. No crea, edita ni mueve issues en Jira.

El contrato funcional está en `docs/specs/gestion-demanda/`.

## Arranque

1. Crear la base MySQL `gestion_demanda`.
2. Copiar `.env.example` a `.env` y completar `DATABASE_URL` y `JWT_SECRET`.
3. Instalar y preparar:

```bash
npm install
npx prisma migrate dev
npm run prisma:seed
npm run dev:api
npm run dev:web
```

La web queda en `http://localhost:5173` y la API en `http://localhost:3000`.

El usuario inicial sale de `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD`.

## Jira

`JIRA_BASE_URL`, `JIRA_EMAIL` y `JIRA_API_TOKEN` se leen solo en el servidor. La sincronización usa únicamente HTTP GET. Si no hay credenciales, un administrador puede lanzar la sincronización simulada desde Configuración Jira.

## Correo

`IT_PIME_EMAIL` y las variables `SMTP_*`. El modo de prueba registra el envío y no abre SMTP.

## Comprobaciones

```bash
npx prisma validate
npm run build:api
npm run build:web
npm test
npm run verify
```
