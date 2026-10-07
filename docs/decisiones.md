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
