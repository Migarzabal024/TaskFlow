# Decisiones y desviaciones respecto a la especificación

Este documento registra las excepciones a `docs/spec.md` (la fuente de verdad del MVP) y el motivo de cada una, según pide la sección 26 de la spec.

## 1. ORM: Drizzle en lugar de Prisma

**Spec dice:** "Use PostgreSQL + Prisma" (sección 6).

**Qué se usó:** PostgreSQL + [Drizzle ORM](https://orm.drizzle.team/) (`drizzle-orm` + `drizzle-kit`) con el driver `pg`.

**Motivo:** el entorno de ejecución de Claude Code (sandbox) tiene el tráfico de red restringido a una lista de dominios permitidos (npm, GitHub, etc.). Tanto Prisma 5 (estable) como la 8.0.0-rc.20 (la que `npm install prisma` trae por defecto) necesitan descargar un binario de motor de consultas nativo desde `binaries.prisma.sh` en cada instalación/generación, dominio que no está permitido. Sin ese binario, `prisma generate`, `migrate dev` y `db seed` no pueden ejecutarse en este entorno.

Drizzle no depende de un motor binario externo: usa el driver `pg` (node-postgres) directamente y `drizzle-kit` para generar/correr migraciones SQL, todo instalable vía npm sin llamadas de red adicionales.

**Impacto funcional:** ninguno sobre las reglas de negocio de la spec. El modelo de datos (sección 6: User, Family, FamilyMember, Invitation, Task, TaskMessage, TaskHistory, Notification, y todos los enums) está implementado 1:1 en `backend/src/db/schema.js`. Las migraciones SQL versionadas viven en `backend/src/db/migrations/`.

**Si se quiere volver a Prisma:** es viable fuera de este sandbox (en una máquina/CI con acceso de red completo a `binaries.prisma.sh`). El schema de Drizzle es directamente traducible a `schema.prisma` dado que el modelo de datos es el mismo.

## 2. bcryptjs en lugar de bcrypt

**Spec dice:** "bcrypt for passwords" (sección 7).

**Qué se usó:** [`bcryptjs`](https://www.npmjs.com/package/bcryptjs), una implementación en JavaScript puro del mismo algoritmo, API-compatible con `bcrypt` (`hash`, `compare`).

**Motivo:** `bcrypt` nativo requiere compilación local con `node-gyp`; para evitar cualquier dependencia adicional de toolchain nativo en este entorno y simplificar la portabilidad, se optó por la variante pura en JS. El algoritmo y el nivel de seguridad son equivalentes.

**Impacto funcional:** ninguno. Si se prefiere la versión nativa en producción por performance, es un cambio de una sola dependencia (`bcrypt` en vez de `bcryptjs`, misma API).

## 3. IDs como enteros autoincrementales (serial) en lugar de UUID

**Spec dice:** solo lista `id` como campo, sin especificar el tipo.

**Qué se usó:** `serial` (entero autoincremental) de PostgreSQL para todas las primary keys.

**Motivo:** simplicidad para el MVP; evita depender de la extensión `pgcrypto`/`uuid-ossp` para generar UUIDs en la base. No afecta ninguna regla de negocio de la spec.

## 4. Familia: un solo LEADER por familia en el MVP

**Spec dice:** define roles LEADER/MEMBER y permisos de cada uno, pero no dice explícitamente si una familia puede tener más de un LEADER.

**Qué se implementó:** el creador de la familia (`POST /api/families`) es el único LEADER. Todo usuario que se une vía invitación se agrega siempre con rol MEMBER. `DELETE /api/families/members/:memberId` rechaza eliminar un miembro con rol LEADER, y un LEADER no puede eliminarse a sí mismo (no hay flujo de "transferir liderazgo" ni "abandonar familia" en el MVP).

**Motivo:** es la interpretación más simple y segura compatible con la spec (sección 26: "prefer the smallest implementation compatible with this document"). Si se necesita soportar múltiples líderes o transferencia de liderazgo, es una extensión aislada a `familyService`.

## 5. `GET /api/invitations`: comportamiento dual segun el usuario

**Spec dice:** solo lista el endpoint, sin aclarar si lista invitaciones enviadas (vista del líder) o recibidas (vista del invitado durante el onboarding en `/onboarding/invitation`).

**Qué se implementó:**
- Si el usuario autenticado ya pertenece a una familia: devuelve las invitaciones **enviadas** por esa familia (requiere rol LEADER para crear, cualquier miembro puede listar).
- Si el usuario no pertenece a ninguna familia: devuelve las invitaciones **recibidas** (pendientes, no expiradas) a su email — esto es lo que necesita la pantalla de onboarding para mostrarle sus invitaciones.

**Motivo:** cubre ambos casos de uso reales de la spec (pantalla de líder gestionando invitaciones, pantalla de onboarding del invitado) con un único endpoint, sin inventar una ruta nueva no listada en la spec.

## 6. Subtareas: heredan la dueDate del padre y bloquean el status manual del padre por completo

**Spec dice:** cada subtarea tiene "title; assignee; optional description/dueTime/priority as appropriate" (sin `dueDate` propio). También dice que el status del padre "se computa" de las subtareas y que "a parent with pending subtasks cannot be manually marked COMPLETED".

**Qué se implementó:**
- Las subtareas no reciben `dueDate` propio en el payload: heredan automáticamente el `dueDate` de la tarea padre (la columna es NOT NULL y la spec no la lista como campo de la subtarea).
- `PATCH /api/tasks/:id/status` rechaza **cualquier** cambio manual de estado (no solo hacia COMPLETED) cuando la tarea tiene subtareas — el estado del padre solo se recalcula automáticamente al cambiar el estado de una subtarea. Esto es una lectura más estricta que "no se puede marcar COMPLETED manualmente", pero consistente con "Do not store a manually editable parent progress percentage" y evita un estado inconsistente (ej. marcar IN_PROGRESS manualmente un padre cuyas subtareas están todas PENDING).

**Motivo:** son las interpretaciones más simples y seguras compatibles con la spec (sección 26).

## 7. Expiración: barrido perezoso en cada lectura, sin scheduler

**Spec dice:** "Overdue incomplete tasks can become EXPIRED according to backend expiration logic" — sin especificar el mecanismo.

**Qué se implementó:** no hay un cron/scheduler corriendo en background. En cambio, cada vez que se listan o leen tareas de una familia (`GET /api/tasks`, `GET /api/tasks/:id`, `GET /api/tasks/:id/subtasks`), el backend primero revisa si alguna tarea PENDING/IN_PROGRESS de esa familia ya venció (`dueDate` + `dueTime`, o fin del día si no tiene hora) y la pasa a EXPIRED antes de responder, registrando el cambio en `TaskHistory` (acción `STATUS_CHANGED`, atribuida al creador de la tarea ya que no hay un usuario actuando).

**Motivo:** cubre la regla de negocio sin infraestructura adicional (no hay cron en este entorno sandbox ni se pidió explícitamente). Los datos siempre quedan correctos en el momento en que alguien los consulta. Si en el futuro se necesita que la expiración ocurra exactamente en el instante del vencimiento (p. ej. para notificar sin que nadie abra la app), se puede agregar un script `backend/src/db/expireTasks.js` que llame a la misma lógica (`expireOverdueFamilyTasks`) desde un cron externo, sin reescribir nada.

## 8. cannot-complete y cancelación operan sobre cualquier tarea por id (simple, padre o subtarea)

**Spec dice:** `PATCH /api/tasks/:id/cannot-complete` y `DELETE /api/tasks/:id` están listados una sola vez en la sección 8 (API Design), sin una ruta anidada equivalente bajo `/api/tasks/:id/subtasks/:subtaskId` (a diferencia de `status` y `assign`, que sí tienen version anidada para subtareas).

**Qué se implementó:** ambos endpoints genéricos (`/api/tasks/:id/...`) funcionan igual sobre una tarea simple, una tarea compuesta (padre) o una subtarea, porque internamente una subtarea es una fila más de la tabla `tasks` identificada por su propio `id`. Si la tarea afectada es una subtarea, se recalcula el status del padre después de la operación. Si es un padre con subtareas activas, cancelarlo cancela en cascada esas subtareas (una tarea cancelada no puede dejar responsabilidades sueltas activas).

**Motivo:** respeta la lista literal de endpoints de la spec (no inventa rutas nuevas) y resuelve el caso de uso real (reportar o cancelar una subtarea puntual) con el mismo endpoint genérico.

## 9. Mensajes: no generan una entrada en TaskHistory

**Spec dice:** "Sending a message: ... creates task history where appropriate" (sección 11), pero el enum `TaskHistoryAction` (sección 6) no incluye ninguna acción de tipo "mensaje" (CREATED, UPDATED, ASSIGNED, REASSIGNED, STARTED, COMPLETED, CANNOT_COMPLETE, CANCELLED, STATUS_CHANGED).

**Qué se implementó:** enviar un mensaje no crea una fila en `TaskHistory`. La propia tabla `TaskMessage` (con su `createdAt`) ya funciona como el registro cronológico de la conversación; mezclarla con `TaskHistory` duplicaría información sin un `action` que la represente correctamente.

**Motivo:** "where appropriate" se interpreta como "cuando aplica", y aquí no aplica porque no hay una acción de historial que lo represente sin forzar el modelo de datos de la spec.

## 10. Notificaciones: a quién se notifica cada evento

**Spec dice:** section 13 lista los *tipos* de evento que deben notificar (TASK_ASSIGNED, TASK_REASSIGNED, TASK_COMPLETED, TASK_CANNOT_COMPLETE, TASK_MESSAGE, TASK_EXPIRED, TASK_CANCELLED) sin especificar el destinatario de cada uno más allá de "leader receives notification" (mencionado explícitamente solo para cannot-complete, sección 10) y "Notify relevant assignee(s)" (para cancelación, sección 12).

**Qué se implementó:**
- `TASK_ASSIGNED` / `TASK_REASSIGNED` → al nuevo assignee.
- `TASK_COMPLETED` / `TASK_CANNOT_COMPLETE` → a todos los LEADER de la familia.
- `TASK_CANCELLED` → al assignee de la tarea cancelada (y de cada subtarea cancelada en cascada).
- `TASK_EXPIRED` → al assignee de la tarea vencida.
- `TASK_MESSAGE` → a todos los "watchers" de la tarea (LEADER(s) + assignee + assignees de subtareas) excepto quien envió el mensaje.

**Motivo:** son extensiones directas de los dos casos que la spec sí especifica explícitamente, aplicando el mismo criterio ("el lider se entera de lo que necesita decidir, el responsable se entera de lo que le toca a él") al resto de los eventos.

## 11. Estadísticas: alcance por rol y conteo de tareas canceladas

**Spec dice (sección 14):** contar al menos completed/pending/in progress/cannot complete/cancelled/expired, calculado desde los datos de tareas, "respetando límites de familia y la semántica de soft-delete/cancelación". No dice si la vista es igual para LEADER y MEMBER.

**Qué se implementó:**
- `GET /api/statistics` cuenta, por estado, **todas las filas de la tabla `tasks`** (tareas simples, padres compuestos y subtareas) de la familia del usuario — cada fila aporta su propio estado al conteo total, sin intentar deduplicar por tarea "lógica".
- El alcance de visibilidad es el mismo que `GET /api/tasks`: un LEADER ve el conteo de **toda la familia**; un MEMBER ve el conteo de **solo las filas asignadas a él** (tarea simple o subtarea).
- A diferencia de `listTasks`/`getTaskById`, el conteo **no excluye las filas con `deletedAt` seteado**. En este esquema, cancelar una tarea marca a la vez `status = CANCELLED` y `deletedAt` (es el mismo evento, ver patrón de soft-delete en la introducción de este documento) para sacarla de los listados activos. Si las estadísticas excluyeran `deletedAt`, la categoría `CANCELLED` quedaría siempre en 0, lo cual contradice que la spec la pide explícitamente como categoría de conteo. "Respetar la semántica de cancelación" se interpretó entonces como "contar lo cancelado como cancelado", no como "ocultarlo también de las estadísticas".
- Antes de contar se corre el mismo barrido de expiración perezosa (`expireOverdueFamilyTasks`) que usan `listTasks`/`getTaskById`, para que una tarea vencida no leída todavía aparezca como EXPIRED y no como PENDING/IN_PROGRESS.

**Motivo:** son las interpretaciones más simples y consistentes con el resto de la implementación (mismo criterio de visibilidad por rol ya usado en toda la sección de tareas) y con el requisito explícito de la spec de poder ver un conteo de "cancelled" (sección 26: "basic status counts are correct"), que de otro modo sería imposible de cumplir dado cómo está modelada la cancelación.

## 12. CORS

**Spec dice:** nada explícito sobre CORS.

**Qué se implementó:** `backend/src/app.js` usa el middleware `cors`, habilitado solo para el/los origen(es) listados en `CORS_ORIGIN` (`backend/.env`, por defecto `http://localhost:5173`, el puerto de desarrollo de Vite).

**Motivo:** el frontend (Vite, puerto 5173) y el backend (Express, puerto 3000) corren en orígenes distintos en desarrollo; sin CORS el navegador bloquea todas las llamadas de Axios. Se restringe a un allowlist en vez de `origin: "*"` para no exponer la API a cualquier origen una vez deployada.

## 13. Frontend: alcance del shell de React (Phase 9)

**Spec dice (secciones 15-17):** estructura de carpetas sugerida, lista de rutas públicas/autenticadas, y qué debe mostrar cada pantalla principal, sin detalle de implementación.

**Qué se implementó:**
- Estado de sesión y familia centralizado en `features/auth/AuthContext.jsx` (`useAuth`): guarda el JWT en `localStorage`, carga `user` y `family` (vía `GET /auth/me` y `GET /families/me`) al iniciar, y expone `isLeader` para UI condicional por rol (la autorización real sigue siendo la del backend).
- Guards de ruta (`app/RouteGuards.jsx`): `RequireGuest` (login/register), `RequireOnboarding` (autenticado sin familia), `RequireFamily` (autenticado y con familia, para todo `/app/*`) y `RequireLeader` (oculta pantallas de LEADER a un MEMBER por UX; el backend rechaza la acción igual si se la fuerza).
- Sin ruta `/onboarding` genérica: siguiendo el mismo criterio que el backend (no inventar rutas fuera de la spec), `/onboarding/create-family` y `/onboarding/invitation` se enlazan entre sí en vez de armar una pantalla selectora intermedia no listada.
- El layout autenticado (`layouts/AppLayout.jsx`) usa una barra de navegación inferior en mobile que se convierte en una barra lateral a partir de 768px (mobile-first, spec sección 18), con 6 destinos: dashboard, tareas, familia, notificaciones, estadísticas y perfil.
- El dashboard (`pages/DashboardPage.jsx`) muestra las mismas tareas (`GET /api/tasks`, ya filtradas por rol en el backend) agrupadas en el cliente por "vencen hoy" y "necesitan atención" (CANNOT_COMPLETE/EXPIRED); el LEADER ve además los contadores pendiente/en curso/completada y el botón de alta rápida.
- `pages/TaskDetailPage.jsx` resuelve en una sola pantalla todas las acciones de una tarea (o subtarea) según quién la mira: iniciar/completar (asignado o LEADER), reportar que no se puede completar (solo asignado), reasignar y cancelar (solo LEADER) — reutilizando los mismos endpoints genéricos que ya usa el backend para subtareas (ver decisión 8).

**Motivo:** son las interpretaciones más simples y consistentes con el resto del proyecto (mismo patrón de "no inventar superficie fuera de la spec", backend como autoridad final de permisos).
