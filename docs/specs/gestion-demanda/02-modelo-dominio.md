# Modelo de dominio

Una sola organización. Identificadores locales `cuid`. Las claves de Jira se guardan como texto y no son la clave primaria.

## Catálogos locales

### Objetivo

`id`, `nombre`, `descripcion`, `activo`, `orden`.

### Iniciativa

`nombre`, `descripcion`, `objetivoId` opcional, `estado` (borrador, activa, pausada, hecha, cancelada), `prioridad` (baja, media, alta, crítica), `notas`, `fechaAlta`, `fechaActualizacion`.

Una iniciativa tiene muchas épicas. El objetivo de la iniciativa es el que heredan sus épicas.

### Subárea

Catálogo con nombre, slug, activo y orden. Valores iniciales: soporte, atención, operaciones IT, desarrollo, administración, otro.

### Familia de servicios

Igual estructura. Valores iniciales: editoriales, corporativos, terceros, infraestructura, seguridad, otro.

### Tipo de actividad

Catálogo configurable. Valores de sistema: soporte, atención, desarrollo de negocio, operaciones IT, otro. No se eliminan si una épica los usa; se desactivan.

### Tipo de mantenimiento

Enumeración fija de la épica: `ADAPTIVE`, `CORRECTIVE`, `EVOLUTIVE`.

## Proyección Jira

### Persona

`accountId`, `nombre`, `email` si Jira lo devuelve, `activo`, `subareaId`, `familiaId`, `lastSeenAt`.

La subárea y la familia no se pisan en una sincronización posterior. La persona asignada a una issue y la persona que imputa horas son relaciones distintas. Una historia puede tener worklogs de varias personas.

### Proyecto, tablero y sprint

Se guardan id de Jira, nombre y, en el sprint, estado, inicio y fin. El backlog no es un sprint: la issue lleva `inBacklog`.

Una issue puede aparecer en varios sprints (`IssueSprint`). `currentSprint` es el sprint activo si pertenece a uno; si no, el de fecha de fin más reciente.

### Épica

Proyección más clasificación local:

- id y clave de Jira, resumen, descripción, estado, responsable;
- iniciativa;
- objetivo: el de la iniciativa salvo `objectiveExplicit`;
- tipo de mantenimiento y tipo de actividad;
- estimación, tiempo imputado y restante propios de la épica en Jira (no el agregado de hijas);
- story points propios de Jira;
- URL, `activeInJira`, `lastSyncedAt`.

Los totales que ve el usuario (número de historias, terminadas, horas, story points, personas) se calculan al leer. No se persisten como fuente de verdad.

### Historia, tarea u otro trabajo

- id y clave de Jira, resumen, descripción, tipo, `kind` (`STORY`, `TASK`, `OTHER`);
- estado y categoría (`new`, `indeterminate`, `done`);
- épica y `epicResolution` (`PARENT`, `EPIC_LINK`, `HIERARCHY`, `UNRESOLVED`);
- persona asignada, sprints, backlog;
- estimación original, tiempo imputado, tiempo restante y story points de esa issue;
- creación, resolución, URL, `activeInJira`, `lastSyncedAt`.

Indicadores derivados, no columnas:

- terminada: categoría `done`;
- en curso: categoría `indeterminate`;
- pendiente: categoría `new`;
- con horas: segundos imputados mayores que cero o algún worklog;
- sin épica: sin `epicId` o resolución `UNRESOLVED`.

Las subtareas no se almacenan. La propia épica también tiene fila de issue `kind = EPIC` para colgar sus worklogs directos, y no cuenta como historia hija.

### Worklog

`jiraId`, issue, `accountId`, nombre visible, segundos, fecha de inicio y sprint cuando el id viene en el dato o la fecha cae dentro del inicio y fin de un sprint.

### Sincronización

`SyncRun`: inicio, fin, estado (`RUNNING`, `SUCCESS`, `FAILED`), disparador (`MANUAL`), modo (`cloud` o `fixture`), error y estadísticas. La última correcta y el último error se consultan aquí. Los datos se consideran desactualizados si no hay éxito, si el último intento posterior falló o si el éxito supera `STALE_AFTER_HOURS` (24 por defecto).

## Demanda impulsiva

Entrada local: título, descripción, solicitante, fecha, prioridad, esfuerzo estimado en horas, iniciativa, objetivo, subárea, familia, estado, épica opcional, clave Jira opcional, observaciones.

No crea una issue en Jira. La clave, si se informa, es solo una referencia.

## Correo de calidad

`EmailDispatch`: fecha, destinatario, usuario, número de issues, resultado (`SENT`, `DRY_RUN`, `FAILED`), error y motivos incluidos.

## Reglas de herencia y de horas

- El objetivo visible de una épica es `objectiveId` si `objectiveExplicit`; si no, el objetivo de su iniciativa.
- El total de una épica es la suma de sus hijas (historias, tareas y otros) más los worklogs imputados directamente en la épica. El tiempo propio guardado en la épica no se suma otra vez si ya está en esos worklogs.
- El total de una iniciativa es la suma de sus épicas, con personas distintas unidas, no sumadas dos veces.
- Sin sprint ni periodo, las horas de una issue son `timeSpent` de Jira, una sola vez, aunque la issue esté en varios sprints.
- Con sprint, las horas son los worklogs de ese sprint. Un worklog sin sprint se atribuye solo si su fecha cae en el intervalo del sprint. Sumar dos sprints no duplica un worklog.
- Con periodo, las horas son los worklogs cuya fecha de inicio cae en el intervalo.
- Si además se filtra persona, subárea o familia, las horas son solo las de quienes cumplen el filtro. La subárea y la familia salen de la persona que imputó; si no hay worklog, de la persona asignada.
- La estimación original y el restante no se prorratean por sprint: si la issue entra en el sprint, se muestra su estimación completa en esa vista. Las horas no se duplican. Este criterio evita repartir una estimación que Jira no parte por sprint.
- Los story points de la épica que ve el usuario son la suma de los de sus hijas. Los story points propios de la épica en Jira se muestran como referencia.
- La distribución adaptativo/correctivo/evolutivo y por tipo de actividad atribuye las horas de las hijas a la clasificación de su épica. Lo que no tiene épica queda en "sin clasificar".
