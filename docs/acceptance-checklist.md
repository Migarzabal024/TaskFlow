# Checklist de aceptación (spec sección 27)

Verificado al cierre de Phase 11. Cada ítem indica dónde se prueba (test automatizado y/o verificación manual).

## AUTH
- [x] El usuario puede registrarse, loguearse y cerrar sesión — `backend/tests/auth.test.js`; `POST /api/auth/logout`.
- [x] Las rutas protegidas funcionan — middleware `authenticate`, probado en todos los `tests/*.test.js` (toda request de negocio lleva `Authorization`).
- [x] Los pedidos no autorizados son rechazados — `auth.test.js` (sin token / token inválido → 401).

## FAMILY
- [x] El usuario puede crear una familia — `family.test.js`.
- [x] El líder puede invitar — `family.test.js`.
- [x] El miembro puede aceptar/rechazar — `family.test.js`.
- [x] La membresía se hace cumplir — `family.test.js` (403 sin familia; solo LEADER invita/elimina).

## TASKS
- [x] El líder puede crear tareas simples — `tasks.test.js`.
- [x] El líder puede asignar/reasignar — `tasks.test.js`.
- [x] Los miembros ven sus tareas — `GET /api/tasks` filtra por `assignedToId` para MEMBER (`backend/src/services/taskService.js`).
- [x] Los miembros pueden iniciar y completar tareas válidas — `tasks.test.js` (PENDING→IN_PROGRESS→COMPLETED, transición inválida rechazada).
- [x] "No puede completarse" exige una razón — `tasks.test.js` (razón vacía → 400).
- [x] La cancelación es lógica (no DELETE físico) — `tasks.test.js` (tarea cancelada sigue siendo consultable).
- [x] El historial se conserva — `taskHistory` se inserta en cada transición; expuesto en `GET /api/tasks/:id/history`.

## COMPOSITE TASKS
- [x] El padre puede contener subtareas — `tasks.test.js`.
- [x] Las subtareas tienen asignados individuales — `tasks.test.js`.
- [x] No hay subtareas anidadas — `tasks.test.js` (`POST /subtasks` sobre una subtarea → 400).
- [x] El estado del padre se deriva correctamente — `tasks.test.js` (parcial→IN_PROGRESS, completo→COMPLETED, nueva subtarea revierte a IN_PROGRESS).

## COMMUNICATION
- [x] Los mensajes son específicos de cada tarea — `messages.test.js`.
- [x] Solo usuarios autorizados pueden comunicarse — `messages.test.js` (403 para quien no tiene relación con la tarea).
- [x] Los mensajes nuevos generan notificaciones según lo definido — `notifications.test.js` (TASK_MESSAGE a watchers, no al remitente).

## NOTIFICATIONS
- [x] Los eventos de tarea requeridos generan notificaciones in-app — `notifications.test.js` (TASK_ASSIGNED, TASK_COMPLETED, TASK_MESSAGE); cobertura completa de tipos en `docs/decisiones.md` sección 10.

## STATISTICS
- [x] Los conteos básicos por estado son correctos — `statistics.test.js` (total, por estado, alcance por rol, caso límite de tareas canceladas).

## UX
- [x] Mobile-first — `client/src/styles/global.css`, layout con bottom nav en mobile.
- [x] Responsive en desktop — sidebar + `.two-col` a partir de 768px/1024px.
- [x] Estados loading/empty/error/success — presentes en todas las pantallas de datos (`Spinner`, `EmptyState`, `ErrorAlert`).
- [x] Controles básicos accesibles — labels, `aria-label`, foco visible, sin dependencia exclusiva del color (ver `docs/decisiones.md` sección 14).

## QUALITY
- [x] Sin secretos en el repositorio — solo `.env.example`/`.env.test.example` versionados; `.env`, `.env.test` ignorados.
- [x] Migraciones reproducibles — `npm run db:migrate` corrido desde cero contra una base vacía (`familytask_test`) sin errores.
- [x] El seed funciona — `npm run db:seed` verificado contra una base truncada.
- [x] Los tests pasan — `npm test` (backend): 46/46 tests, 6 suites, cubriendo los 12 puntos mínimos de la sección 23.
- [x] El build de producción funciona — `npm run build` (frontend): genera `dist/` + PWA sin errores.
