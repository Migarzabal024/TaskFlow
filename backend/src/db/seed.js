const bcrypt = require("bcryptjs");
const { db, pool } = require("./client");
const {
  users,
  families,
  familyMembers,
  tasks,
  taskMessages,
  taskHistory,
  notifications,
} = require("./schema");

// Datos de desarrollo ficticios. Nunca usar datos personales reales.
async function main() {
  console.log("Sembrando datos de desarrollo...");

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // --- Usuarios ---------------------------------------------------------
  const [leader] = await db
    .insert(users)
    .values({ name: "Ana Lider", email: "ana.leader@familytask.dev", passwordHash })
    .returning();

  const [memberOne] = await db
    .insert(users)
    .values({ name: "Juan Perez", email: "juan.member@familytask.dev", passwordHash })
    .returning();

  const [memberTwo] = await db
    .insert(users)
    .values({ name: "Sofia Perez", email: "sofia.member@familytask.dev", passwordHash })
    .returning();

  // --- Familia ------------------------------------------------------------
  const [family] = await db
    .insert(families)
    .values({ name: "Familia Perez" })
    .returning();

  await db.insert(familyMembers).values([
    { familyId: family.id, userId: leader.id, role: "LEADER" },
    { familyId: family.id, userId: memberOne.id, role: "MEMBER" },
    { familyId: family.id, userId: memberTwo.id, role: "MEMBER" },
  ]);

  // --- Tareas simples -------------------------------------------------------
  const today = new Date().toISOString().slice(0, 10);

  const [simpleTaskDone] = await db
    .insert(tasks)
    .values({
      familyId: family.id,
      createdById: leader.id,
      assignedToId: memberOne.id,
      title: "Sacar la basura",
      description: "Sacar la basura antes de las 8pm",
      status: "COMPLETED",
      priority: "LOW",
      dueDate: today,
      startedAt: new Date(),
      completedAt: new Date(),
    })
    .returning();

  const [simpleTaskPending] = await db
    .insert(tasks)
    .values({
      familyId: family.id,
      createdById: leader.id,
      assignedToId: memberTwo.id,
      title: "Comprar leche",
      description: "Comprar leche en el supermercado",
      status: "PENDING",
      priority: "MEDIUM",
      dueDate: today,
    })
    .returning();

  // --- Tarea compuesta con subtareas ----------------------------------------
  const [parentTask] = await db
    .insert(tasks)
    .values({
      familyId: family.id,
      createdById: leader.id,
      assignedToId: null,
      title: "Preparar la casa para la visita",
      description: "Tareas de limpieza y orden antes de que lleguen los abuelos",
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: today,
    })
    .returning();

  const [subtaskOne] = await db
    .insert(tasks)
    .values({
      familyId: family.id,
      parentTaskId: parentTask.id,
      createdById: leader.id,
      assignedToId: memberOne.id,
      title: "Limpiar el living",
      status: "COMPLETED",
      priority: "MEDIUM",
      dueDate: today,
      startedAt: new Date(),
      completedAt: new Date(),
    })
    .returning();

  const [subtaskTwo] = await db
    .insert(tasks)
    .values({
      familyId: family.id,
      parentTaskId: parentTask.id,
      createdById: leader.id,
      assignedToId: memberTwo.id,
      title: "Ordenar el cuarto de huespedes",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      dueDate: today,
      startedAt: new Date(),
    })
    .returning();

  // --- Mensajes -----------------------------------------------------------
  await db.insert(taskMessages).values([
    {
      taskId: parentTask.id,
      senderId: leader.id,
      content: "Por favor terminen antes del mediodia, llegan a las 3pm.",
    },
    {
      taskId: parentTask.id,
      senderId: memberOne.id,
      content: "Living listo!",
    },
    {
      taskId: subtaskTwo.id,
      senderId: memberTwo.id,
      content: "Ya arranque con el cuarto de huespedes.",
    },
  ]);

  // --- Historial ------------------------------------------------------------
  await db.insert(taskHistory).values([
    {
      taskId: simpleTaskDone.id,
      userId: memberOne.id,
      action: "CREATED",
      newStatus: "PENDING",
    },
    {
      taskId: simpleTaskDone.id,
      userId: memberOne.id,
      action: "COMPLETED",
      previousStatus: "IN_PROGRESS",
      newStatus: "COMPLETED",
    },
    {
      taskId: subtaskOne.id,
      userId: memberOne.id,
      action: "COMPLETED",
      previousStatus: "IN_PROGRESS",
      newStatus: "COMPLETED",
    },
    {
      taskId: subtaskTwo.id,
      userId: memberTwo.id,
      action: "STARTED",
      previousStatus: "PENDING",
      newStatus: "IN_PROGRESS",
    },
  ]);

  // --- Notificaciones ---------------------------------------------------------
  await db.insert(notifications).values([
    {
      userId: memberOne.id,
      type: "TASK_ASSIGNED",
      taskId: simpleTaskDone.id,
      message: "Se te asigno la tarea 'Sacar la basura'",
    },
    {
      userId: leader.id,
      type: "TASK_COMPLETED",
      taskId: simpleTaskDone.id,
      message: "Juan completo la tarea 'Sacar la basura'",
    },
    {
      userId: memberTwo.id,
      type: "TASK_ASSIGNED",
      taskId: subtaskTwo.id,
      message: "Se te asigno la subtarea 'Ordenar el cuarto de huespedes'",
    },
    {
      userId: leader.id,
      type: "TASK_MESSAGE",
      taskId: parentTask.id,
      message: "Nuevo mensaje en 'Preparar la casa para la visita'",
    },
  ]);

  console.log("Seed completado:");
  console.log(`  Familia: ${family.name} (id ${family.id})`);
  console.log(`  Lider: ${leader.email}`);
  console.log(`  Miembros: ${memberOne.email}, ${memberTwo.email}`);
  console.log(`  Password de todos los usuarios demo: Password123!`);

  await pool.end();
}

main().catch((err) => {
  console.error("Error al sembrar datos:", err);
  process.exit(1);
});
