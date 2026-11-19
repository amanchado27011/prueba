# Alcance y no alcance

## Dentro del MVP

- Conexión configurable a Jira Cloud (URL del sitio, email y API token) por variables de entorno.
- Lectura paginada de proyectos, tableros, backlog, sprints activos y cerrados, épicas, historias, tareas, estados, personas asignadas, worklogs, estimación original, tiempo imputado, tiempo restante y story points.
- Resolución de épica por parent, Epic Link, jerarquía de la respuesta y fallback explícito si no se puede resolver.
- Proyección local idempotente, fecha de última sincronización, registro de errores y aviso de datos desactualizados.
- Sincronización manual. Sincronización simulada (fixture) cuando no hay credenciales o se pide a propósito, nunca contra Jira.
- Catálogos locales: objetivos, iniciativas, subáreas, familias de servicios, tipos de actividad. Tipos de mantenimiento fijos: adaptativo, correctivo, evolutivo.
- Personas sincronizadas desde Jira, con subárea y familia editables en local.
- Demanda impulsiva con alta rápida e importación CSV o Excel y plantilla descargable.
- Vistas: tablero de trabajo en curso, jerarquía, detalle de épica, detalle de iniciativa, productividad, demanda impulsiva, calidad Jira, catálogos, configuración Jira y exportaciones.
- Calidad Jira con totales, previsualización de correo y envío SMTP a IT.PIME. Modo de prueba que no envía.
- Excel de diez hojas y CSV sencillo, ambos respetando los filtros de pantalla.
- Autenticación local JWT. Rol ADMIN para cambios y envío real. Rol VIEWER para consulta y exportación.

## Fuera del alcance

- Escribir, transicionar, asignar, comentar o borrar en Jira.
- Subtareas.
- Multi-tenant, varios sitios Jira a la vez o permisos finos por proyecto.
- Planificación de sprints, tableros Kanban editables o réplica de Jira.
- IA, predicción de esfuerzo o recomendaciones automáticas de prioridad.
- OAuth 3LO. Se deja fuera para no arrastrar el flujo de escritura usado en SGSI. La integración vive en un módulo propio (`apps/api/src/jira`) y solo admite HTTP GET.
- Edición del texto, estado o estimación que vienen de Jira. Solo se editan los campos locales de clasificación.
- Borrado físico de issues que desaparecen de Jira. Se marcan `activeInJira = false` y dejan de entrar en los cálculos.

## Supuestos de alcance

- Una base MySQL de esta aplicación. No se lee la base de SGSI.
- Los bugs y otros tipos de nivel 0 que no son subtarea se proyectan como trabajo (`OTHER`) para no perder horas. El recuento de "historias" de una épica incluye historias, tareas y esos otros tipos hijos.
- El destinatario del correo es `IT_PIME_EMAIL` o el valor guardado en configuración por un ADMIN. Si no hay ninguno, el envío real se rechaza y el modo de prueba sigue disponible.
- Si SMTP no está configurado, el modo de prueba registra el intento y el envío real falla de forma visible.
