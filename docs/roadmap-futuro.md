# FamilyTask — Ideas para futuras mejoras

Estado al 2026-10-06: MVP cerrado (Phases 0-11), tema oscuro azul/violeta aplicado, README documentado.

Estas son propuestas para una próxima etapa, **nada implementado todavía** — se evalúan y priorizan cuando se retome el desarrollo. No forman parte del alcance del MVP ni de [`docs/spec.md`](./spec.md).

## Funcionalidad

- **Tareas recurrentes**: que una tarea se pueda marcar como diaria/semanal/mensual y se regenere sola en vez de crearla a mano cada vez.
- **Recordatorios / vencimientos**: aviso cuando una tarea está por vencer o venció, no solo notificación al crearla/asignarla.
- **Adjuntos en tareas**: poder subir una foto como "prueba" de que la tarea se completó (por ejemplo, limpiar un cuarto).
- **Gamificación liviana**: puntos o racha por tareas completadas a tiempo, para motivar a los integrantes (especialmente si hay chicos en la familia).
- **Múltiples familias por usuario**: hoy un usuario pertenece a una sola familia; permitir pertenecer a más de una y cambiar entre ellas (útil para familias separadas/ensambladas).
- **Roles intermedios**: un "co-líder" con permisos limitados, además de Líder/Integrante.
- **Plantillas de tareas**: tareas comunes del hogar predefinidas para asignar rápido sin escribir todo de cero.
- **Recuperación de contraseña**: flujo de "olvidé mi contraseña" (hoy no existe).
- **Avatares/foto de perfil** por usuario.
- **Reportes exportables**: estadísticas del mes en PDF o Excel para repasar en familia.

## Experiencia / diseño

- **Selector de tema**: dejar el modo oscuro como default pero permitir modo claro opcional (hoy el oscuro está fijo).
- **Internacionalización**: la app está en español fijo; si hace falta, estructura i18n para otros idiomas.
- **Notificaciones push reales**: las notificaciones hoy son in-app; se podría sumar Web Push para avisos aunque la app esté cerrada.

## Técnico / infraestructura

- **CI automático**: correr `npm test` y `npm run build` en GitHub Actions en cada push/PR, en vez de solo local.
- **Dockerización**: Dockerfile + docker-compose para levantar backend+Postgres con un solo comando (bajaría la barrera de instalar Postgres a mano).
- **Deploy real**: instrucciones/paso a producción (por ejemplo Render/Railway para el backend, Vercel/Netlify para el frontend) para que la familia la use desde internet y no solo en localhost.
- **Offline-first más robusto**: hoy el PWA cachea el shell de la app; se podría sumar cola de acciones offline (crear/completar tareas sin conexión y sincronizar al volver a tener señal).
- **Hardening de seguridad**: rate limiting en login, rotación de JWT, validaciones adicionales antes de un uso más amplio.

---
*Este documento es una lista de ideas para discutir y priorizar en una próxima etapa, no un compromiso de alcance.*
