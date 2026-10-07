# FamilyTask (TaskFlow)

Aplicación web mobile-first para la gestión de tareas del hogar. Un líder (o líderes) de familia crea y asigna tareas a los integrantes, hace seguimiento de su ejecución, se comunica dentro de cada tarea, recibe notificaciones y consulta historial y estadísticas básicas.

Flujo core: **PLAN → ASSIGN → EXECUTE → COMMUNICATE → SUPERVISE**

La especificación completa (reglas de negocio, modelo de datos, API, fases de desarrollo, criterios de aceptación) vive en [`docs/spec.md`](./docs/spec.md) y es la fuente de verdad del alcance del MVP.

<p>
  <img src="docs/screenshots/dashboard.png" width="260" alt="Dashboard mobile" />
  <img src="docs/screenshots/task-detail.png" width="260" alt="Detalle de tarea" />
  <img src="docs/screenshots/dashboard-desktop.png" width="420" alt="Dashboard desktop" />
</p>

---

## Índice

1. [Requisitos previos](#requisitos-previos)
2. [Stack](#stack)
3. [Puesta en marcha paso a paso](#puesta-en-marcha-paso-a-paso)
4. [Variables de entorno](#variables-de-entorno)
5. [Usuarios demo (seed)](#usuarios-demo-seed)
6. [Scripts disponibles](#scripts-disponibles)
7. [Tests](#tests)
8. [Build de producción](#build-de-producción)
9. [Estructura del repositorio](#estructura-del-repositorio)
10. [Problemas comunes](#problemas-comunes)
11. [Documentación adicional](#documentación-adicional)

---

## Requisitos previos

Necesitás tener instalado en tu computadora:

| Herramienta | Versión mínima | Para qué se usa | Cómo verificar |
|---|---|---|---|
| [Node.js](https://nodejs.org/) | 20.19 o superior (recomendado 22 LTS) | correr el backend y el frontend | `node -v` |
| npm | viene con Node | instalar dependencias | `npm -v` |
| [PostgreSQL](https://www.postgresql.org/download/) | 14 o superior (desarrollado y probado con 16) | base de datos | `psql --version` |
| [Git](https://git-scm.com/) | cualquiera reciente | clonar el repo | `git --version` |

No hace falta instalar nada más: ni Docker, ni Redis, ni un gestor de procesos. El resto de las dependencias (Express, React, Drizzle ORM, etc.) se instalan con `npm install` dentro de cada carpeta.

> **Nota sobre PostgreSQL:** si no querés instalar Postgres localmente, podés usar un servicio gratuito en la nube (por ejemplo [Neon](https://neon.tech/) o [Supabase](https://supabase.com/)) y pegar la cadena de conexión que te den en `DATABASE_URL` (ver más abajo). El resto de los pasos no cambia.

## Stack

**Backend**
- Node.js + Express
- PostgreSQL + Drizzle ORM (ver desviación respecto a Prisma en [`docs/decisiones.md`](./docs/decisiones.md))
- JWT + bcryptjs para autenticación
- Jest + Supertest para tests

**Frontend**
- React + Vite (JavaScript, sin TypeScript)
- React Router
- Axios
- React Hook Form + Zod
- PWA instalable (vite-plugin-pwa)

## Puesta en marcha paso a paso

### 1. Clonar el repositorio

```bash
git clone https://github.com/Migarzabal024/TaskFlow.git
cd TaskFlow
```

### 2. Crear la base de datos

Con PostgreSQL corriendo localmente, creá un usuario y una base (podés usar otro nombre/usuario, solo tiene que coincidir con lo que pongas en `DATABASE_URL`):

```bash
sudo -u postgres psql -c "CREATE USER familytask WITH PASSWORD 'familytask_dev_pw' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE familytask OWNER familytask;"
```

(En Windows/Mac, con `psql` o pgAdmin, el equivalente es crear un rol y una base con esos mismos datos, o los que prefieras.)

### 3. Configurar y levantar el backend

```bash
cd backend
cp .env.example .env
```

Abrí `backend/.env` y completá al menos `DATABASE_URL` y `JWT_SECRET` (ver [Variables de entorno](#variables-de-entorno)).

```bash
npm install
npm run db:migrate    # crea las tablas
npm run db:seed       # carga datos de demo (familia, usuarios, tareas de ejemplo)
npm run dev            # levanta la API en http://localhost:3000
```

Dejá esta terminal abierta. Probá que funciona con:

```bash
curl http://localhost:3000/api/health
# {"success":true,"data":{"status":"ok"}}
```

### 4. Configurar y levantar el frontend

En **otra terminal**:

```bash
cd TaskFlow/client
cp .env.example .env    # ya apunta a http://localhost:3000/api, no hace falta tocarlo
npm install
npm run dev
```

Vite te va a mostrar una URL, normalmente `http://localhost:5173`.

### 5. Entrar a la app

Abrí `http://localhost:5173` en tu navegador y logueate con uno de los [usuarios demo](#usuarios-demo-seed). El seed ya deja tareas, mensajes, notificaciones e historial de ejemplo, así que no hace falta crear nada desde cero para explorarla.

## Variables de entorno

### `backend/.env` (copiar desde `backend/.env.example`)

| Variable | Ejemplo | Descripción |
|---|---|---|
| `PORT` | `3000` | puerto donde escucha la API |
| `DATABASE_URL` | `postgresql://familytask:familytask_dev_pw@localhost:5432/familytask` | cadena de conexión a Postgres |
| `JWT_SECRET` | cualquier string largo y aleatorio | firma los tokens de sesión — **no lo compartas ni lo subas a git** |
| `NODE_ENV` | `development` | entorno de ejecución |
| `CORS_ORIGIN` | `http://localhost:5173` | origen(es) permitidos a llamar a la API (el del frontend); separar con comas si hay más de uno |

### `client/.env` (copiar desde `client/.env.example`)

| Variable | Ejemplo | Descripción |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000/api` | URL base de la API que consume el frontend |

Ninguno de los dos `.env` se sube al repositorio (están en `.gitignore`); solo los `.env.example` con valores de ejemplo.

## Usuarios demo (seed)

Después de `npm run db:seed`, todos los usuarios de ejemplo usan la contraseña `Password123!`:

| Email | Rol | Qué vas a ver |
|---|---|---|
| `ana.leader@familytask.dev` | Líder | dashboard con todas las tareas de la familia, puede crear/asignar/cancelar |
| `juan.member@familytask.dev` | Integrante | sus tareas asignadas, una subtarea completada |
| `sofia.member@familytask.dev` | Integrante | sus tareas asignadas, una subtarea en curso |

## Scripts disponibles

### `backend/`

| Comando | Qué hace |
|---|---|
| `npm run dev` | levanta la API con recarga automática (nodemon) |
| `npm start` | levanta la API en modo normal |
| `npm run db:generate` | genera migraciones SQL a partir de `src/db/schema.js` |
| `npm run db:migrate` | aplica las migraciones pendientes a la base |
| `npm run db:seed` | carga los datos de demo |
| `npm run db:studio` | abre Drizzle Studio (explorador visual de la base) |
| `npm test` | corre la suite de tests contra una base separada (ver [Tests](#tests)) |

### `client/`

| Comando | Qué hace |
|---|---|
| `npm run dev` | levanta el frontend en modo desarrollo (Vite) |
| `npm run build` | genera el build de producción en `client/dist/` |
| `npm run preview` | sirve el build de producción localmente para probarlo |
| `npm run lint` | corre el linter (oxlint) |

## Tests

Los tests del backend corren contra una base de datos Postgres **separada** de la de desarrollo, para no pisar los datos del seed.

```bash
cd backend
sudo -u postgres psql -c "CREATE DATABASE familytask_test OWNER familytask;"   # una sola vez
cp .env.test.example .env.test                                                 # completar DATABASE_URL de esa base
NODE_ENV=test npm run db:migrate                                               # aplica las migraciones a familytask_test
npm test
```

Cubren los 12 puntos mínimos de la spec (sección 23): autenticación, autorización, membresía de familia, creación/asignación de tareas, transiciones de estado inválidas, permisos de "no puede completarse", cancelación, estado derivado de tareas compuestas, autorización de mensajes, creación de notificaciones y límites de estadísticas.

## Build de producción

```bash
# Backend: no requiere build, se corre directamente con Node
cd backend
NODE_ENV=production npm start

# Frontend: genera archivos estáticos listos para servir
cd client
npm run build      # salida en client/dist/
npm run preview    # para probar ese build localmente
```

El build del frontend incluye el manifest y el service worker de la PWA (instalable desde el navegador).

## Estructura del repositorio

```
taskflow/
  client/   # Frontend React + Vite
  backend/  # API Express
  docs/     # Especificación, decisiones de diseño y checklist de aceptación
```

### Backend (`backend/src/`)
```
config/        # configuración y variables de entorno
controllers/   # controladores HTTP (delgados)
middleware/    # auth, autorización, manejo de errores
routes/        # definición de rutas /api
services/      # lógica de negocio
validators/    # validación de entrada (Zod)
utils/         # utilidades
db/            # schema de Drizzle, cliente, migraciones y seed
app.js         # configuración de Express (sin listen)
server.js      # punto de entrada, levanta el servidor
```
`backend/tests/` contiene la suite de Jest + Supertest.

### Frontend (`client/src/`)
```
app/            # guards de ruta (autenticación, familia, rol)
components/     # componentes presentacionales reutilizables
features/       # lógica específica de un dominio (auth, tasks)
pages/          # una pantalla por ruta
layouts/        # el shell autenticado (nav + header)
hooks/          # hooks compartidos (useAuth)
services/       # llamadas a la API (un archivo por recurso)
utils/          # formateo de fechas, etc.
styles/         # global.css (tokens de diseño y estilos compartidos)
```

## Problemas comunes

**"ECONNREFUSED" o el backend no arranca** — Postgres no está corriendo, o `DATABASE_URL` en `backend/.env` no coincide con el usuario/base que creaste. Verificá con `pg_isready` o `psql $DATABASE_URL`.

**El frontend carga pero ningún pedido funciona / error de CORS en la consola** — el backend no está corriendo, o `CORS_ORIGIN` en `backend/.env` no incluye la URL donde corre el frontend (por defecto `http://localhost:5173`).

**"port already in use"** — ya hay algo corriendo en el puerto 3000 o 5173. Cerralo, o cambiá `PORT` (backend) y volvé a correr `npm run dev` (Vite te va a ofrecer otro puerto para el frontend).

**`npm run db:migrate` falla con un error de permisos** — el usuario de `DATABASE_URL` necesita permisos sobre esa base (ver el `CREATE USER ... CREATEDB` del paso 2).

**Los tests fallan con un error de conexión** — faltó crear `familytask_test` y/o `backend/.env.test`, o no se corrieron las migraciones ahí (ver [Tests](#tests)).

## Documentación adicional

- [`docs/spec.md`](./docs/spec.md) — especificación funcional completa (fuente de verdad del alcance).
- [`docs/decisiones.md`](./docs/decisiones.md) — las 14 desviaciones/decisiones de diseño respecto a la spec, con su justificación.
- [`docs/acceptance-checklist.md`](./docs/acceptance-checklist.md) — checklist de aceptación del MVP, verificado punto por punto.

## Estado

✅ MVP completo (Phases 0-11). Backend (auth, familias, invitaciones, tareas simples/compuestas, mensajes, historial, notificaciones, estadísticas) y frontend (React mobile-first, PWA instalable, tema oscuro azul/violeta) funcionales de punta a punta, con tests automatizados y seed de datos de demo.
