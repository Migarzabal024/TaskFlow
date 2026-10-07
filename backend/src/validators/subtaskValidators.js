const { z } = require("zod");

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
const priorityEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);

// Subtarea dentro de una tarea compuesta (spec seccion 9): title y
// assignee requeridos, el resto opcional. Sin "subtasks" anidado: no se
// permiten subtareas de subtareas.
const subtaskInputSchema = z.object({
  title: z.string().trim().min(2, "El titulo debe tener al menos 2 caracteres").max(200),
  description: z.string().trim().max(2000).optional(),
  dueTime: z.string().regex(timeRegex, "dueTime debe tener formato HH:mm").optional(),
  priority: priorityEnum.optional().default("MEDIUM"),
  assignedToId: z.number().int().positive("assignedToId es requerido"),
});

const createSubtaskSchema = subtaskInputSchema;

const updateSubtaskSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  dueDate: z.string().regex(dateRegex, "dueDate debe tener formato YYYY-MM-DD").optional(),
  dueTime: z.string().regex(timeRegex, "dueTime debe tener formato HH:mm").nullable().optional(),
  priority: priorityEnum.optional(),
});

const assignSubtaskSchema = z.object({
  assignedToId: z.number().int().positive(),
});

const subtaskStatusTransitionSchema = z.object({
  status: z.enum(["IN_PROGRESS", "COMPLETED"]),
});

module.exports = {
  subtaskInputSchema,
  createSubtaskSchema,
  updateSubtaskSchema,
  assignSubtaskSchema,
  subtaskStatusTransitionSchema,
};
