# Flujos de usuario

## Entrar

La persona abre la aplicación, inicia sesión con email y contraseña locales y llega al tablero. El token queda en `localStorage` de esta aplicación. No hay token de Jira en el navegador. Si la sesión caduca, la siguiente llamada muestra el error y vuelve al login.

## Ver el trabajo en curso

El tablero muestra si los datos están al día, los totales del filtro actual y la jerarquía iniciativa → épica → historia. Se expande y se contrae sin cambiar de pantalla. Los filtros (sprint o periodo, persona, subárea, familia, iniciativa, objetivo, épica, mantenimiento, actividad y texto) viven en la query de la URL y se comparten con productividad, calidad y exportación.

La jerarquía es la misma información con el árbol abierto para recorrerlo. Desde una épica o una iniciativa se abre su ficha.

## Clasificar una épica

En la ficha, un ADMIN asocia iniciativa, marca si el objetivo es explícito o heredado, elige mantenimiento y actividad. La próxima lectura recalcula la iniciativa y las distribuciones. Un VIEWER ve los datos y no el formulario de guardado.

## Sincronizar Jira

En Configuración Jira se ve el host, si hay email y token (nunca el valor), la última sincronización y el último error. Un ADMIN pulsa Sincronizar. Si ya hay una en curso, la interfaz muestra el conflicto. Al terminar, el tablero deja de marcarse desactualizado si el resultado fue correcto.

Si no hay credenciales, puede lanzar una sincronización simulada. Esa vía no abre red hacia Jira y sirve para comprobar sumatorios y exportación.

## Revisar productividad

La vista repite los filtros y muestra horas, historias terminadas y en curso, estimación terminada y pendiente, worklogs por persona en orden alfabético, distribución de horas, carga por subárea y familia, tendencia por sprint y el bloque de trabajo no planificado (demanda impulsiva más issues sin épica). No hay puesto ni medalla.

## Capturar demanda impulsiva

El formulario pide primero título, solicitante, fecha, prioridad y esfuerzo. El resto (descripción, iniciativa, objetivo, subárea, familia, estado, épica, clave Jira, observaciones) va en un segundo bloque. También se descarga la plantilla y se importa un CSV o Excel. Las filas rechazadas se listan sin deshacer las válidas.

## Avisar de calidad Jira

La vista lista los siete motivos con su total. Al elegir uno se ven las claves, el resumen, el responsable, el sprint y el motivo. Previsualizar abre una pantalla con el número de historias, el listado y el cuerpo del correo. Confirmar envía a IT.PIME. El modo de prueba registra el mismo contenido con resultado `DRY_RUN` y no contacta el SMTP. El histórico queda en la misma vista.

## Exportar para Dirección General

Exportaciones usa los filtros aplicados. El Excel trae las diez hojas. Los CSV cubren historias y demanda. La descarga viaja con el Bearer; el navegador no abre una URL anónima.

## Mantener catálogos

Objetivos, subáreas, familias y actividades se crean, renombran, reordenan y desactivan. Los tipos de mantenimiento se consultan y no se editan. En la misma zona se asigna subárea y familia a cada persona.
