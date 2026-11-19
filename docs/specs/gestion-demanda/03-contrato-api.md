# Contrato API

Base `/v1`. JSON. Autenticación `Authorization: Bearer` salvo login y `GET /health`.

Todo cuerpo y toda query se validan con Zod. Un fallo responde `400` con `message: "Validation error"` e `issues` aplanados. `401` si no hay sesión. `403` si el rol no alcanza. `409` si ya hay una sincronización en curso.

Los errores de negocio llegan como `{ statusCode, error, message }` y la interfaz los muestra.

Paginación de listados: `limit` (1–100, defecto 25) y `offset`. Respuesta `{ items, total, limit, offset, hasMore }`.

## Autenticación

| Método | Ruta | Rol | Notas |
| --- | --- | --- | --- |
| POST | `/v1/auth/login` | público | `{ email, password }` → `{ accessToken, user }` |
| GET | `/v1/auth/me` | sesión | Usuario actual |

No hay registro público.

## Jira y sincronización

| Método | Ruta | Rol | Notas |
| --- | --- | --- | --- |
| GET | `/v1/jira/config` | sesión | Host, flags de configuración, destinatario y SMTP. Sin token ni contraseña |
| POST | `/v1/jira/sync` | ADMIN | `{ mode?: "cloud" \| "fixture" }`. `cloud` solo GET. `fixture` no llama a Jira |
| GET | `/v1/jira/sync/status` | sesión | Último éxito, último error, `isStale`, antigüedad |

`POST /v1/jira/sync` con `cloud` sin credenciales responde `400`. `fixture` en producción solo si `JIRA_ALLOW_FIXTURE=true`.

## Consulta de trabajo

Filtro común de query: `sprintId`, `from`, `to` (fecha `YYYY-MM-DD`), `personId`, `subareaId`, `serviceFamilyId`, `initiativeId`, `objectiveId`, `epicId`, `maintenanceType`, `activityTypeId`, `q`.

| Método | Ruta | Notas |
| --- | --- | --- |
| GET | `/v1/filters/options` | Combos de los filtros |
| GET | `/v1/work/tree` | Jerarquía iniciativa → épica → issue ya agregada. Incluye `withoutEpic` y totales |
| GET | `/v1/initiatives` | Listado |
| POST | `/v1/initiatives` | ADMIN |
| GET | `/v1/initiatives/:id` | Detalle con sumatorio |
| PATCH | `/v1/initiatives/:id` | ADMIN |
| GET | `/v1/epics` | Listado con métricas |
| GET | `/v1/epics/:id` | Detalle, hijas, horas por persona y distribuciones |
| PATCH | `/v1/epics/:id` | ADMIN. Solo clasificación local |
| GET | `/v1/issues` | Paginado |
| GET | `/v1/issues/:id` | Detalle de historia o tarea |
| GET | `/v1/sprints` | Sprints proyectados |
| GET | `/v1/people` | Personas |
| PATCH | `/v1/people/:id` | ADMIN. Subárea, familia, activo |
| GET | `/v1/productivity` | Carga, distribución, tendencia y no planificado |

El árbol y la productividad aplican las reglas de horas del modelo de dominio. Las personas de productividad se ordenan por nombre, no por horas.

## Catálogos

CRUD de sesión de lectura y escritura ADMIN:

- `/v1/objectives`
- `/v1/subareas`
- `/v1/service-families`
- `/v1/activity-types`

`GET /v1/maintenance-types` devuelve la enumeración fija. Desactivar (`active: false`) sustituye al borrado cuando hay referencias.

## Demanda impulsiva

| Método | Ruta | Rol |
| --- | --- | --- |
| GET | `/v1/demand` | sesión |
| POST | `/v1/demand` | ADMIN |
| PATCH | `/v1/demand/:id` | ADMIN |
| DELETE | `/v1/demand/:id` | ADMIN |
| GET | `/v1/demand/template.csv` | sesión |
| POST | `/v1/demand/import` | ADMIN. Multipart `file` CSV o XLSX, o JSON `{ csv }` |

La importación es parcial: filas válidas se crean y las inválidas vuelven en `errors` con número de fila. No llama a Jira.

## Calidad y correo

| Método | Ruta | Rol |
| --- | --- | --- |
| GET | `/v1/quality` | Conteos por motivo y, si viene `kind`, el listado |
| POST | `/v1/quality/email/preview` | No envía. Devuelve totales, filas y cuerpo |
| POST | `/v1/quality/email/send` | ADMIN. `{ kinds, dryRun }`. `dryRun: true` no abre SMTP |
| GET | `/v1/quality/emails` | Histórico local |

Motivos: `no_epic`, `no_estimate`, `sprint_no_hours`, `hours_open`, `closed_no_hours`, `incomplete`, `no_assignee`.

El correo incluye resumen, total, tabla (clave, resumen, sprint, responsable, enlace) y una recomendación de corrección. El histórico guarda fecha, destinatario, usuario, total, resultado y error.

## Exportación

| Método | Ruta | Notas |
| --- | --- | --- |
| GET | `/v1/exports/excel` | Diez hojas, mismos filtros de query. Binario |
| GET | `/v1/exports/issues.csv` | Historias y tareas filtradas |
| GET | `/v1/exports/demand.csv` | Demanda filtrada por fecha, iniciativa, objetivo, subárea y familia |

Hojas Excel: Resumen ejecutivo, Trabajo en curso, Iniciativas, Épicas, Historias y tareas, Worklogs por persona, Productividad, Trabajo sin épica, Demanda impulsiva, Catálogos y criterios.

## Salud

`GET /health` → `{ ok: true }`.
