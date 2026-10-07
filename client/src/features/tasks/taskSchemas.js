import { z } from "zod";

const priorityEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);

const subtaskSchema = z.object({
  title: z.string().trim().min(2, "Mínimo 2 caracteres"),
  description: z.string().trim().optional(),
  dueTime: z.string().optional(),
  priority: priorityEnum,
  assignedToId: z.coerce.number({ message: "Elegí un integrante" }).int().positive("Elegí un integrante"),
});

export const createTaskSchema = z
  .object({
    mode: z.enum(["simple", "composite"]),
    title: z.string().trim().min(2, "El título debe tener al menos 2 caracteres"),
    description: z.string().trim().optional(),
    dueDate: z.string().min(1, "La fecha de vencimiento es obligatoria"),
    dueTime: z.string().optional(),
    priority: priorityEnum,
    assignedToId: z.string().optional(),
    subtasks: z.array(subtaskSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "simple" && !data.assignedToId) {
      ctx.addIssue({ code: "custom", path: ["assignedToId"], message: "Elegí a quién asignar la tarea" });
    }
    if (data.mode === "composite" && (!data.subtasks || data.subtasks.length === 0)) {
      ctx.addIssue({ code: "custom", path: ["subtasks"], message: "Agregá al menos una subtarea" });
    }
  });
