# Visión

Gestión de la demanda es una aplicación web independiente para que Dirección General vea el trabajo en curso que vive en Jira, lo clasifique con criterios propios (objetivo, iniciativa, mantenimiento, actividad, subárea y familia) y decida qué priorizar.

La aplicación es un vertical informacional. Jira sigue siendo el sistema donde se ejecuta el trabajo. Esta aplicación solo lee Jira, guarda una proyección local y añade catálogos y demanda no planificada que Jira no modela.

## Problema

La demanda real mezcla épicas planificadas, historias sueltas, horas de varias personas y trabajo impulsivo que no siempre entra en un sprint. Dirección General no puede leer eso directamente en Jira sin un criterio común de objetivo, iniciativa y tipo de esfuerzo.

## Resultado esperado

Una sola organización consulta, filtra y exporta:

- trabajo en curso en jerarquía iniciativa, épica, historia o tarea;
- esfuerzo estimado, imputado y restante, sin duplicar horas entre sprints;
- productividad como capacidad, carga y distribución, no como ranking de personas;
- huecos de calidad de los datos de Jira, con aviso por correo a IT.PIME tras una previsualización;
- demanda impulsiva capturada en local, con importación CSV o Excel.

## Principios

- Solo lectura hacia Jira. Ninguna operación crea, edita, borra o mueve issues, sprints ni worklogs.
- La proyección local es idempotente y guarda la fecha de la última sincronización correcta y el error de la última tentativa.
- Los cálculos de épica salen de sus historias y tareas. Los de iniciativa salen de sus épicas.
- Los tokens y el secreto SMTP no salen del servidor y no se guardan en el navegador.
- Una organización, permisos mínimos (administrador y consulta) y sin planificación avanzada ni IA.

## Supuesto de producto

Quien prioriza es Dirección General y quien corrige la higiene de Jira es IT.PIME. La aplicación les da el mismo recorte filtrado en pantalla y en el Excel.
