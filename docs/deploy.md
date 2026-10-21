# Desplegar FamilyTask a producción (Vercel + Supabase)

Esta guía deja la app accesible desde internet (no solo en `localhost`), para que toda la familia pueda entrar desde su celular — **100% gratis y sin pedir tarjeta de crédito en ningún paso**.

Usamos:
- **[Supabase](https://supabase.com)**: base de datos Postgres gratis.
- **[Vercel](https://vercel.com)**: aloja el frontend (sitio estático) y el backend (como función serverless), ambos del mismo repo de GitHub.

No hace falta tocar código: todo lo que pide esta guía se hace desde los paneles de Supabase y Vercel, conectando el repo de GitHub.

> **Tip:** una vez desplegada, abrí la URL del frontend desde el navegador del celular y tocá "Agregar a pantalla de inicio" (o "Instalar app"). Queda con ícono propio y pantalla completa, como una app nativa — es la PWA que ya tiene la app, no hace falta nada más para eso.

## 1. Base de datos en Supabase

1. Entrá a [supabase.com](https://supabase.com/dashboard) y creá una cuenta (con GitHub es lo más rápido). No pide tarjeta.
2. **New Project**. Elegí un nombre (ej. `familytask`), una contraseña para la base (guardala, la vas a necesitar) y una región cercana.
3. Esperá a que el proyecto termine de aprovisionarse (1-2 minutos).
4. Andá a **Project Settings → Database → Connection string**, pestaña **URI**. Copiá la cadena — algo como:
   ```
   postgresql://postgres.xxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-xx-xxxx-x.pooler.supabase.com:6543/postgres
   ```
   Reemplazá `[YOUR-PASSWORD]` por la contraseña que elegiste en el paso 2. Esa es tu `DATABASE_URL`.

### Migrar y cargar los datos de demo (una sola vez)

Desde tu computadora, con el repo clonado (ver [README](../README.md#puesta-en-marcha-paso-a-paso)):

```bash
cd backend
npm install
DATABASE_URL="postgresql://...la-que-copiaste..." npm run db:migrate
DATABASE_URL="postgresql://...la-que-copiaste..." npm run db:seed
```

Esto crea las tablas y carga los usuarios/tareas de demo (ver [README](../README.md#usuarios-demo-seed)). Solo hace falta la primera vez.

## 2. Backend en Vercel (función serverless)

1. Entrá a [vercel.com/new](https://vercel.com/new) y creá una cuenta (con GitHub). No pide tarjeta en el plan Hobby.
2. Importá el repositorio `Migarzabal024/taskflow`.
3. En la configuración del proyecto:
   - **Project Name**: por ejemplo `familytask-backend`.
   - **Root Directory**: `backend` (importante).
   - Framework: dejalo en "Other" (Vercel va a detectar sola la función en `backend/api/index.js`).
4. En **Environment Variables**, agregá:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | la cadena de conexión de Supabase del paso 1 |
   | `JWT_SECRET` | cualquier string largo y aleatorio (podés generarlo en <https://1password.com/password-generator> o similar) |
   | `JWT_EXPIRES_IN` | `7d` |
   | `CORS_ORIGIN` | lo completás en el paso 4, después de crear el frontend |

5. **Deploy**. Cuando termine, copiá la URL (algo como `https://familytask-backend.vercel.app`).
6. Confirmá que responde: abrí `https://TU-URL.vercel.app/api/health` — debería mostrar `{"success":true,"data":{"status":"ok"}}`.

## 3. Frontend en Vercel

1. De nuevo en [vercel.com/new](https://vercel.com/new), importá **el mismo repositorio** otra vez (como un segundo proyecto).
2. En la configuración:
   - **Project Name**: por ejemplo `familytask`.
   - **Root Directory**: `client` (importante).
   - Framework: Vercel detecta **Vite** solo.
3. En **Environment Variables**, agregá:

   | Name | Value |
   |---|---|
   | `VITE_API_URL` | `https://TU-URL-DEL-BACKEND.vercel.app/api` (la del paso 2, con `/api` al final) |

4. **Deploy**. Copiá la URL pública (algo como `https://familytask.vercel.app`).

El archivo [`client/vercel.json`](../client/vercel.json) ya está en el repo y redirige cualquier ruta a `index.html`, necesario para que las rutas de React Router (`/app/tasks`, `/app/dashboard`, etc.) funcionen al entrar directo o recargar la página. El archivo [`backend/vercel.json`](../backend/vercel.json) hace lo mismo del lado del backend, para que todas las rutas de la API lleguen a la función en [`backend/api/index.js`](../backend/api/index.js).

## 4. Conectar el backend con el frontend (CORS)

Volvé al proyecto del backend en Vercel → **Settings → Environment Variables**, y completá (o editá) `CORS_ORIGIN` con la URL del frontend del paso 3:

```
CORS_ORIGIN=https://familytask.vercel.app
```

Guardá y hacé **Redeploy** del proyecto del backend (Vercel no reinicia solo con un cambio de variable de entorno). Sin este paso, el navegador va a bloquear los pedidos del frontend al backend por CORS.

## 5. Probarlo

Abrí la URL del frontend desde el celular de cualquiera de la familia y entrá con alguno de los [usuarios demo](../README.md#usuarios-demo-seed), o creá una cuenta nueva desde "Registrarse".

## Actualizaciones futuras

Los dos proyectos de Vercel quedan conectados al repo: cada `git push` a `main` dispara un deploy automático de ambos (frontend y backend). No hace falta repetir ningún paso de este instructivo salvo que cambien las variables de entorno.

## Límites del plan gratuito

- **Supabase free**: 500 MB de base, el proyecto se pausa tras ~1 semana sin uso (se reactiva solo con el primer pedido, tarda unos segundos) y hasta 2 proyectos gratis por cuenta.
- **Vercel Hobby**: pensado para uso personal/no comercial — perfecto para esto. Las funciones del backend tienen un límite de 5 minutos de ejecución (de sobra, acá las respuestas son instantáneas) y "duermen" entre pedidos, así que el primer pedido después de un rato sin uso puede tardar un par de segundos más (cold start).

Ninguno de estos límites afecta el uso normal de una familia.
