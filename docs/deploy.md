# Desplegar FamilyTask a producción (Render + Vercel)

Esta guía deja la app accesible desde internet (no solo en `localhost`), para que toda la familia pueda entrar desde su celular. Usa los planes gratuitos de [Render](https://render.com) (backend + base de datos Postgres) y [Vercel](https://vercel.com) (frontend).

No hace falta tocar código: todo lo que pide esta guía se hace desde los paneles de Render y Vercel, conectando el repo de GitHub.

## 1. Backend + base de datos en Render

1. Entrá a [render.com](https://dashboard.render.com) con tu cuenta.
2. **New → Blueprint**.
3. Conectá el repositorio `Migarzabal024/taskflow` (si no aparece, autorizá acceso a Render desde GitHub).
4. Render va a detectar el archivo [`render.yaml`](../render.yaml) en la raíz del repo y te va a mostrar dos recursos para crear:
   - `familytask-backend` (web service, Node)
   - `familytask-db` (base de datos Postgres)
5. Click en **Apply** / **Create**. Render crea la base, la conecta al backend (`DATABASE_URL` se completa solo) y genera un `JWT_SECRET` aleatorio automáticamente.
6. Cuando el servicio termine de deployar, copiá su URL pública (algo como `https://familytask-backend.onrender.com`). La vas a necesitar en el paso 3.
7. Confirmá que responde: abrí `https://TU-URL.onrender.com/api/health` en el navegador — debería mostrar `{"success":true,"data":{"status":"ok"}}`.

### Migrar y cargar los datos de demo (una sola vez)

En el panel del servicio `familytask-backend`, pestaña **Shell**, corré:

```bash
npm run db:migrate
npm run db:seed
```

Esto crea las tablas y carga los usuarios/tareas de demo (ver [README](../README.md#usuarios-demo-seed)). Solo hace falta la primera vez; no hace falta repetirlo en cada deploy futuro (correr `db:seed` de nuevo duplicaría los datos de ejemplo).

> El plan free de Render "duerme" el servicio tras ~15 minutos sin tráfico y tarda unos segundos en despertar con el primer pedido. Es normal, no es un error.

## 2. Frontend en Vercel

1. Entrá a [vercel.com/new](https://vercel.com/new) con tu cuenta.
2. Importá el mismo repositorio `Migarzabal024/taskflow`.
3. En la configuración del proyecto:
   - **Root Directory**: `client` (importante — el frontend vive en esa subcarpeta, no en la raíz del repo).
   - Framework: Vercel detecta **Vite** automáticamente.
4. En **Environment Variables**, agregá:

   | Name | Value |
   |---|---|
   | `VITE_API_URL` | `https://TU-URL-DE-RENDER.onrender.com/api` (la del paso 1, con `/api` al final) |

5. **Deploy**. Cuando termine, copiá la URL pública (algo como `https://familytask.vercel.app`).

El archivo [`client/vercel.json`](../client/vercel.json) ya está en el repo y le dice a Vercel que redirija cualquier ruta a `index.html`, necesario para que las rutas de React Router (`/app/tasks`, `/app/dashboard`, etc.) funcionen al entrar directo o recargar la página.

## 3. Conectar el backend con el frontend (CORS)

Volvé al panel de Render, servicio `familytask-backend` → **Environment**, y completá la variable `CORS_ORIGIN` (quedó pendiente en el blueprint) con la URL de Vercel del paso 2:

```
CORS_ORIGIN=https://familytask.vercel.app
```

Guardá — Render redeploya el servicio solo. Sin este paso, el navegador va a bloquear los pedidos del frontend al backend por CORS.

## 4. Probarlo

Abrí la URL de Vercel desde el celular de cualquiera de la familia y entrá con alguno de los [usuarios demo](../README.md#usuarios-demo-seed), o creá una cuenta nueva desde "Registrarse".

## Actualizaciones futuras

Tanto Render como Vercel quedan conectados al repo: cada `git push` a `main` dispara un deploy automático de ambos servicios. No hace falta repetir ningún paso de este instructivo salvo que cambien las variables de entorno.

## Costos

Ambos planes free alcanzan sobradamente para el uso de una familia. Limitaciones a tener en cuenta:

- Render free: el backend "duerme" sin tráfico (ver nota arriba) y la base de datos free expira a los 90 días si no se la actualiza a un plan pago (Render avisa por mail antes).
- Vercel free (Hobby): pensado para uso personal/no comercial, más que suficiente acá.
