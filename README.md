# FamilyTask (TaskFlow)

Aplicación web mobile-first para la gestión de tareas del hogar. Un líder (o líderes) de familia crea y asigna tareas a los integrantes, hace seguimiento de su ejecución, se comunica dentro de cada tarea, recibe notificaciones y consulta historial y estadísticas básicas.

Flujo core: **PLAN → ASSIGN → EXECUTE → COMMUNICATE → SUPERVISE**

La especificación completa (reglas de negocio, modelo de datos, API, fases de desarrollo, criterios de aceptación) vive en [`docs/spec.md`](./docs/spec.md) y es la fuente de verdad del alcance del MVP.

## Stack

**Backend**
- Node.js + Express
- PostgreSQL + Drizzle ORM (ver nota de desviación abajo)
- JWT + bcryptjs

**Frontend**
- React + Vite (JavaScript, sin TypeScript)
- React Router
- Axios
- React Hook Form + Zod

## Estructura del repositorio

```
taskflow/
  client/   # Frontend React + Vite
  backend/  # API Express
  docs/     # Especificación y documentación del proyecto
```

### Backend (`backend/src/`)
```
config/        # configuración y variables de entorno
controllers/   # controladores HTTP (delgados)
middleware/    # auth, autorización, manejo de errores
routes/        # definición de rutas /api
services/      # lógica de negocio
validators/    # validación de entrada
utils/         # utilidades
db/            # schema de Drizzle, cliente, migraciones y seed
app.js         # configuración de Express (sin listen)
server.js      # punto de entrada, levanta el servidor
```

### Frontend (`client/src/`)
```
app/
components/
features/
  auth/
  family/
  tasks/
  notifications/
  statistics/
pages/
layouts/
hooks/
services/
utils/
styles/
```

## Desarrollo local

### Backend
```bash
cd backend
cp .env.example .env   # completar DATABASE_URL y JWT_SECRET
npm install
npm run db:generate   # genera migraciones SQL a partir de src/db/schema.js
npm run db:migrate    # aplica las migraciones a la base
npm run db:seed       # carga datos de desarrollo (ver docs/decisiones.md)
npm run dev
```

### Frontend
```bash
cd client
cp .env.example .env   # VITE_API_URL (por defecto http://localhost:3000/api)
npm install
npm run dev
```

El backend necesita permitir el origen del frontend por CORS: `CORS_ORIGIN` en `backend/.env` (por defecto `http://localhost:5173`, el puerto de Vite).

## Tests (backend)

Los tests corren contra una base de datos Postgres separada de la de desarrollo, para no pisar los datos del seed.

```bash
cd backend
createdb familytask_test                 # una sola vez
cp .env.test.example .env.test            # completar DATABASE_URL de esa base
NODE_ENV=test npm run db:migrate          # aplica las migraciones a familytask_test
npm test
```

Cubren los 12 puntos mínimos de la spec (sección 23): autenticación, autorización, membresía de familia, creación/asignación de tareas, transiciones de estado inválidas, permisos de "no puede completarse", cancelación, estado derivado de tareas compuestas, autorización de mensajes, creación de notificaciones y límites de estadísticas.

## Usuarios demo (seed)

Después de `npm run db:seed`, todos los usuarios de ejemplo usan la contraseña `Password123!`:

| Email | Rol |
|---|---|
| ana.leader@familytask.dev | LEADER |
| juan.member@familytask.dev | MEMBER |
| sofia.member@familytask.dev | MEMBER |

## Desviaciones registradas respecto a la especificación

Ver [`docs/decisiones.md`](./docs/decisiones.md).

## Checklist de aceptación

Ver [`docs/acceptance-checklist.md`](./docs/acceptance-checklist.md) — verificación punto por punto contra la spec sección 27.

## Estado

✅ MVP completo (Phases 0-11). Backend (auth, familias, invitaciones, tareas simples/compuestas, mensajes, historial, notificaciones, estadísticas) y frontend (React mobile-first, PWA instalable) funcionales de punta a punta, con tests automatizados y seed de datos de demo.
