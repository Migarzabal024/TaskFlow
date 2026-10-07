const { z } = require("zod");
const { subtaskInputSchema } = require("./subtaskValidators");

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;

const priorityEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);

// Tarea simple o compuesta (spec secciones 4 y 9). Simple: title, dueDate
// y assignedToId requeridos. Compuesta: title, dueDate y al menos una
// subtarea; el assignee del padre debe quedar vacio (se distribuye en las
// subtareas). Ambos modos son mutuamente excluyentes.
const createTaskSchema = z
  .object({
    title: z.string().trim().min(2, "El titulo debe tener al menos 2 caracteres").max(200),
    description: z.string().trim().max(2000).optional(),
    dueDate: z.string().regex(dateRegex, "dueDate debe tener formato YYYY-MM-DD"),
    dueTime: z.string().regex(timeRegex, "dueTime debe tener formato HH:mm").optional(),
    priority: priorityEnum.optional().default("MEDIUM"),
    assignedToId: z.number().int().positive().optional(),
    subtasks: z.array(subtaskInputSchema).min(1).optional(),
  })
  .superRefine((data, ctx) => {
    const hasAssignee = data.assignedToId !== undefined;
    const hasSubtasks = data.subtasks !== undefined;

    if (hasAssignee && hasSubtasks) {
      ctx.addIssue({
        code: "custom",
        message: "Una tarea no puede tener assignedToId y subtasks a la vez (simple o compuesta, no ambas)",
      });
    }

    if (!hasAssignee && !hasSubtasks) {
      ctx.addIssue({
        code: "custom",
        message: "Indica assignedToId (tarea simple) o subtasks (tarea compuesta)",
      });
    }
  });

// Edicion de campos descriptivos. Status y asignacion tienen sus propios
// endpoints (PATCH /status, PATCH /assign) con sus propias reglas.
const updateTaskSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  dueDate: z.string().regex(dateRegex, "dueDate debe tener formato YYYY-MM-DD").optional(),
  dueTime: z.string().regex(timeRegex, "dueTime debe tener formato HH:mm").nullable().optional(),
  priority: priorityEnum.optional(),
});

const assignTaskSchema = z.object({
  assignedToId: z.number().int().positive(),
});

// Este endpoint solo cubre la transicion "normal" (iniciar/completar).
// CANNOT_COMPLETE y CANCELLED tienen sus propios endpoints (Phase 6).
const statusTransitionSchema = z.object({
  status: z.enum(["IN_PROGRESS", "COMPLETED"]),
});

const listTasksQuerySchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANNOT_COMPLETE", "CANCELLED", "EXPIRED"]).optional(),
  priority: priorityEnum.optional(),
  dueDate: z.string().regex(dateRegex).optional(),
  assignedToId: z.coerce.number().int().positive().optional(),
});

module.exports = {
  createTaskSchema,
  updateTaskSchema,
  assignTaskSchema,
  statusTransitionSchema,
  listTasksQuerySchema,
};
