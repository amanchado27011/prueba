# Decisiones técnicas

## Aplicación independiente

El código no importa SGSI. Se repiten los patrones que encajan: monorepo npm (`apps/api`, `apps/web`), Fastify 5, Vue 3, Pinia, Vue Router, Prisma, MySQL, Zod, Vitest, ExcelJS y Vite. La autenticación es JWT local con bcrypt, el error de API tiene la misma forma y el listado usa `limit`/`offset`. El estilo es propio (`gd-*`), con la misma idea de superficie, borde y tarjetas de SGSI, sin compartir la hoja de estilos.

## Jira en un módulo cerrado

`apps/api/src/jira` es la única zona que conoce HTTP de Jira.

- Autenticación básica de Jira Cloud (email + API token). El token se lee de entorno en el servidor.
- `ReadOnlyHttp` rechaza cualquier método que no sea GET antes de llamar a `fetch`.
- Las rutas quedan bajo el host configurado y el prefijo `/rest/`.
- Paginación por `startAt` o `nextPageToken`, tamaño `JIRA_PAGE_SIZE` (50), pausa `JIRA_MIN_INTERVAL_MS` y reintento ante 429 o 503 usando `Retry-After`.
- La búsqueda usa `GET /rest/api/3/search/jql` y, si el sitio no la expone, `GET /rest/api/3/search`. No se usa el POST de búsqueda, para que la auditoría de métodos siga siendo solo GET.
- Epic Link y Story Points se descubren en `GET /rest/api/3/field`.
- Los worklogs se completan con `GET /rest/api/3/issue/{id}/worklog` cuando el embebido viene truncado.
- Tope `JIRA_MAX_ISSUES` y `JIRA_MAX_PROJECTS` para respetar el ritmo del sitio.
- El modo `fixture` construye la misma proyección sin red. Sirve para pruebas y para la sincronización simulada.

La sincronización aplica la proyección por upsert de id de Jira. Un fallo marca `SyncRun` como `FAILED`. Dos sincronizaciones no se solapan (mutex en proceso, `409`).

## Cálculo

`apps/api/src/domain` no importa Prisma ni Fastify. Recibe una foto ya mapeada y devuelve métricas, motivos de calidad, el cuerpo del correo y las filas de exportación. Las pruebas Vitest cubren esa capa sin MySQL.

La lectura de API carga la proyección activa en memoria y filtra ahí. Es coherente con una sola organización y evita que el SQL reimplemente las reglas de sprint.

## Correo

Nodemailer aislado en `email.service.ts`. `dryRun` no construye transporte. El histórico se escribe siempre. El destinatario efectivo es el ajuste local y, si no existe, `IT_PIME_EMAIL`.

## Excel y CSV

ExcelJS genera el libro en memoria. El CSV de demanda se interpreta sin otra librería. El XLSX de importación lo lee ExcelJS. No se usa el paquete `xlsx`.

## Auth mínima

Usuarios sembrados. ADMIN muta catálogos, demanda, clasificación, sincronización y envío real. VIEWER consulta, previsualiza y exporta. No hay tenants ni cabecera `X-Tenant-Id`.

## Qué no se hizo

- No hay cola de trabajos. La sincronización corre en la petición, con el mutex.
- No hay cifrado del token de Jira en base de datos porque el token no se guarda: solo vive en el entorno.
- No se prorratea la estimación por sprint (véase el modelo de dominio).
- No se borran issues ausentes; se desactivan en la proyección.

## Verificación prevista al cierre

Ejecutada el 19 de noviembre de 2026: `prisma validate`, build de API, build de web, Vitest (12 pruebas) y `npm run verify` con la sincronización simulada. El detalle está en los criterios de aceptación. No hubo sitio Jira real ni MySQL en ese entorno.
