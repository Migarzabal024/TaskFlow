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
npm install
npm run dev
```

## Desviaciones registradas respecto a la especificación

Ver [`docs/decisiones.md`](./docs/decisiones.md).

## Estado

🚧 En desarrollo — Phase 7 completa (mensajes de tarea, historial, notificaciones).
