const { eq, and } = require("drizzle-orm");
const { db } = require("../db/client");
const { tasks } = require("../db/schema");
const { expireOverdueFamilyTasks } = require("./taskService");

const STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANNOT_COMPLETE", "CANCELLED", "EXPIRED"];

function emptyCounts() {
  return STATUSES.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});
}

// Mismo alcance de visibilidad que listTasks (seccion 17/22 no distinguen una
// vista de estadisticas propia por rol): un LEADER ve el conteo de toda la
// familia; un MEMBER ve el conteo de las tareas (simples, padre o subtareas)
// que le corresponden a el. Ver docs/decisiones.md seccion 11.
async function getStatistics(user, familyMembership) {
  await expireOverdueFamilyTasks(familyMembership.familyId);

  // No se filtra por deletedAt: en este esquema una tarea cancelada tiene
  // status CANCELLED *y* deletedAt seteado (es el mismo marcador). Excluir
  // deletedAt dejaria el conteo de CANCELLED siempre en 0, lo cual
  // contradice que la spec (seccion 14) pide "cancelled" como categoria de
  // estadistica. Ver docs/decisiones.md seccion 11.
  const conditions = [eq(tasks.familyId, familyMembership.familyId)];

  if (familyMembership.role !== "LEADER") {
    conditions.push(eq(tasks.assignedToId, user.id));
  }

  const rows = await db
    .select({ status: tasks.status })
    .from(tasks)
    .where(and(...conditions));

  const counts = emptyCounts();
  for (const row of rows) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }

  return {
    total: rows.length,
    counts,
  };
}

module.exports = { getStatistics, STATUSES };
