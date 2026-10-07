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
