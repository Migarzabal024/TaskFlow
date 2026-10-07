const { z } = require("zod");

const createFamilySchema = z.object({
  name: z.string().trim().min(2, "El nombre de la familia debe tener al menos 2 caracteres").max(120),
});

module.exports = { createFamilySchema };
