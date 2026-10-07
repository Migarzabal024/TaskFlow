const { z } = require("zod");

const createInvitationSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email invalido"),
});

module.exports = { createInvitationSchema };
