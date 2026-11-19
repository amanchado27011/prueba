# Criterios de aceptación

## Sincronización

- Dado un sitio configurado, al sincronizar solo se emiten peticiones HTTP GET bajo `/rest/` de ese host.
- Una segunda sincronización de la misma foto no duplica proyectos, sprints, épicas, issues ni worklogs.
- La clasificación local de una épica (iniciativa, objetivo explícito, mantenimiento, actividad) sobrevive a la sincronización.
- Subárea y familia de una persona sobreviven a la sincronización.
- Si Jira falla, la ejecución queda `FAILED` con el mensaje, y la interfaz lo enseña.
- Si el último éxito supera el umbral, o el último intento falló después del último éxito, la interfaz marca los datos como desactualizados.
- Parent de tipo épica gana a Epic Link. Sin parent, se usa Epic Link. Sin ambos, se usa la jerarquía que venga en la respuesta. Si nada cuadra, la issue queda `UNRESOLVED`, sin épica.
- Una subtarea no se proyecta.

## Cálculos

- La suma de horas de las historias de una épica más las horas imputadas en la propia épica es el total de la épica.
- La suma de los totales de las épicas de una iniciativa es el total de la iniciativa.
- Una issue en dos sprints, con un worklog en cada uno, aporta sus horas una sola vez al total sin filtro, y cada sprint recibe solo su worklog. La suma de los dos sprints coincide con el total.
- El porcentaje consumido es horas imputadas / estimación original cuando hay estimación. Si no hay estimación, el porcentaje queda vacío y la issue cuenta como "sin estimación".
- Las personas de productividad salen ordenadas por nombre.

## Calidad y correo

- Cada motivo devuelve su `total` junto al listado.
- Previsualizar no crea un envío `SENT` ni abre SMTP.
- El modo de prueba registra `DRY_RUN` con destinatario, usuario y número de issues.
- El envío real sin destinatario o sin SMTP registra `FAILED` y muestra el error. No escribe en Jira.

## Demanda y exportación

- El alta rápida persiste una demanda local sin llamar a Jira.
- La plantilla CSV se descarga con las columnas acordadas.
- Una importación con una fila válida y otra inválida crea solo la válida e informa la fila errónea.
- El Excel tiene exactamente las diez hojas, en este orden: Resumen ejecutivo, Trabajo en curso, Iniciativas, Épicas, Historias y tareas, Worklogs por persona, Productividad, Trabajo sin épica, Demanda impulsiva, Catálogos y criterios.
- Con un filtro de iniciativa, el Excel no incluye épicas de otra iniciativa.

## Seguridad

- `GET /v1/jira/config` no contiene el API token ni la contraseña SMTP.
- El cliente HTTP de Jira lanza error ante POST, PUT, PATCH o DELETE y deja constancia del intento rechazado.

## Verificación ejecutada

Comprobado el 19 de noviembre de 2026, sin base MySQL disponible en el entorno:

- `prisma validate`: el esquema es válido.
- Build de la API (`tsc`) y build del frontend (`vue-tsc` y Vite): correctos.
- Vitest: 12 pruebas en `apps/api/test/critical.test.ts`, todas correctas.
- `npm run verify` sobre la sincronización simulada: proyección sin subtareas y solo GET, segunda pasada idempotente, 10 h de la historia repartidas 6 h y 4 h entre sprints, 34 h de épicas iguales a la iniciativa, personas en orden Ana, Luis, Zoe, previsualización sin envío y Excel de diez hojas.
- El cliente rechaza POST antes de llamar a la red. La búsqueda de prueba solo registró GET.

No se abrió un sitio Jira real: no hay credenciales en el entorno. La interfaz se compiló, pero no se recorrió con un navegador porque la API no puede arrancar sin `DATABASE_URL`.
