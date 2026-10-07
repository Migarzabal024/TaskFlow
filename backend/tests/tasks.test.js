const { app, request, resetDb, closeDb, createFamilyWithMembers } = require("./helpers");

beforeEach(resetDb);
afterAll(closeDb);

function futureDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

describe("Creación de tareas", () => {
  test("el LEADER puede crear una tarea simple asignada a un MEMBER", async () => {
    const { leader, members } = await createFamilyWithMembers(2);
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${leader.token}`)
      .send({ title: "Lavar los platos", dueDate: futureDate(), assignedToId: members[0].user.id });

    expect(res.status).toBe(201);
    expect(res.body.data.task.status).toBe("PENDING");
    expect(res.body.data.task.assignedToId).toBe(members[0].user.id);
  });

  test("un MEMBER no puede crear tareas (403)", async () => {
    const { members } = await createFamilyWithMembers(1);
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${members[0].token}`)
      .send({ title: "Tarea", dueDate: futureDate(), assignedToId: members[0].user.id });

    expect(res.status).toBe(403);
  });

  test("una tarea simple requiere assignedToId o subtasks, no ninguno ni ambos", async () => {
    const { leader, members } = await createFamilyWithMembers(1);

    const neither = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${leader.token}`)
      .send({ title: "Sin nada", dueDate: futureDate() });
    expect(neither.status).toBe(400);

    const both = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${leader.token}`)
      .send({
        title: "Ambos",
        dueDate: futureDate(),
        assignedToId: members[0].user.id,
        subtasks: [{ title: "Sub", assignedToId: members[0].user.id }],
      });
    expect(both.status).toBe(400);
  });

  test("una tarea compuesta crea subtareas con sus propios assignees", async () => {
    const { leader, members } = await createFamilyWithMembers(2);
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${leader.token}`)
      .send({
        title: "Limpiar la casa",
        dueDate: futureDate(),
        subtasks: [
          { title: "Barrer", assignedToId: members[0].user.id },
          { title: "Trapear", assignedToId: members[1].user.id },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.task.assignedToId).toBeNull();

    const detail = await request(app)
      .get(`/api/tasks/${res.body.data.task.id}`)
      .set("Authorization", `Bearer ${leader.token}`);
    expect(detail.body.data.task.subtasks).toHaveLength(2);
  });
});

describe("Asignación y reasignación", () => {
  test("el LEADER puede reasignar una tarea a otro MEMBER", async () => {
    const { leader, members } = await createFamilyWithMembers(2);
    const task = (
      await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${leader.token}`)
        .send({ title: "Tarea", dueDate: futureDate(), assignedToId: members[0].user.id })
    ).body.data.task;

    const res = await request(app)
      .patch(`/api/tasks/${task.id}/assign`)
      .set("Authorization", `Bearer ${leader.token}`)
      .send({ assignedToId: members[1].user.id });

    expect(res.status).toBe(200);
    expect(res.body.data.task.assignedToId).toBe(members[1].user.id);
  });

  test("un MEMBER no puede reasignar tareas (403)", async () => {
    const { leader, members } = await createFamilyWithMembers(2);
    const task = (
      await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${leader.token}`)
        .send({ title: "Tarea", dueDate: futureDate(), assignedToId: members[0].user.id })
    ).body.data.task;

    const res = await request(app)
      .patch(`/api/tasks/${task.id}/assign`)
      .set("Authorization", `Bearer ${members[0].token}`)
      .send({ assignedToId: members[1].user.id });

    expect(res.status).toBe(403);
  });
});

describe("Transiciones de estado", () => {
  async function createSimpleTask(leader, assignee) {
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${leader.token}`)
      .send({ title: "Tarea", dueDate: futureDate(), assignedToId: assignee.user.id });
    return res.body.data.task;
  }

  test("el asignado puede pasar PENDING -> IN_PROGRESS -> COMPLETED", async () => {
    const { leader, members } = await createFamilyWithMembers(1);
    const task = await createSimpleTask(leader, members[0]);

    const started = await request(app)
      .patch(`/api/tasks/${task.id}/status`)
      .set("Authorization", `Bearer ${members[0].token}`)
      .send({ status: "IN_PROGRESS" });
    expect(started.status).toBe(200);
    expect(started.body.data.task.status).toBe("IN_PROGRESS");

    const completed = await request(app)
      .patch(`/api/tasks/${task.id}/status`)
      .set("Authorization", `Bearer ${members[0].token}`)
      .send({ status: "COMPLETED" });
    expect(completed.status).toBe(200);
    expect(completed.body.data.task.status).toBe("COMPLETED");
  });

  test("no se puede volver de COMPLETED a IN_PROGRESS (transición inválida)", async () => {
    const { leader, members } = await createFamilyWithMembers(1);
    const task = await createSimpleTask(leader, members[0]);
    await request(app)
      .patch(`/api/tasks/${task.id}/status`)
      .set("Authorization", `Bearer ${members[0].token}`)
      .send({ status: "COMPLETED" });

    const res = await request(app)
      .patch(`/api/tasks/${task.id}/status`)
      .set("Authorization", `Bearer ${members[0].token}`)
      .send({ status: "IN_PROGRESS" });

    expect(res.status).toBe(400);
  });

  test("un usuario que no es el asignado ni el líder no puede cambiar el estado (403)", async () => {
    const { leader, members } = await createFamilyWithMembers(2);
    const task = await createSimpleTask(leader, members[0]);

    const res = await request(app)
      .patch(`/api/tasks/${task.id}/status`)
      .set("Authorization", `Bearer ${members[1].token}`)
      .send({ status: "IN_PROGRESS" });

    expect(res.status).toBe(403);
  });

  test("no se puede cambiar manualmente el estado de una tarea con subtareas", async () => {
    const { leader, members } = await createFamilyWithMembers(1);
    const task = (
      await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${leader.token}`)
        .send({
          title: "Compuesta",
          dueDate: futureDate(),
          subtasks: [{ title: "Sub", assignedToId: members[0].user.id }],
        })
    ).body.data.task;

    const res = await request(app)
      .patch(`/api/tasks/${task.id}/status`)
      .set("Authorization", `Bearer ${leader.token}`)
      .send({ status: "IN_PROGRESS" });

    expect(res.status).toBe(400);
  });
});

describe("No se puede completar (cannot-complete)", () => {
  test("solo el asignado puede reportar que no puede completar la tarea", async () => {
    const { leader, members } = await createFamilyWithMembers(2);
    const task = (
      await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${leader.token}`)
        .send({ title: "Tarea", dueDate: futureDate(), assignedToId: members[0].user.id })
    ).body.data.task;

    const byLeader = await request(app)
      .patch(`/api/tasks/${task.id}/cannot-complete`)
      .set("Authorization", `Bearer ${leader.token}`)
      .send({ reason: "Falta material" });
    expect(byLeader.status).toBe(403);

    const byOtherMember = await request(app)
      .patch(`/api/tasks/${task.id}/cannot-complete`)
      .set("Authorization", `Bearer ${members[1].token}`)
      .send({ reason: "Falta material" });
    expect(byOtherMember.status).toBe(403);

    const byAssignee = await request(app)
      .patch(`/api/tasks/${task.id}/cannot-complete`)
      .set("Authorization", `Bearer ${members[0].token}`)
      .send({ reason: "Falta material" });
    expect(byAssignee.status).toBe(200);
    expect(byAssignee.body.data.task.status).toBe("CANNOT_COMPLETE");
    expect(byAssignee.body.data.task.cannotCompleteReason).toBe("Falta material");
  });

  test("la razón es obligatoria", async () => {
    const { leader, members } = await createFamilyWithMembers(1);
    const task = (
      await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${leader.token}`)
        .send({ title: "Tarea", dueDate: futureDate(), assignedToId: members[0].user.id })
    ).body.data.task;

    const res = await request(app)
      .patch(`/api/tasks/${task.id}/cannot-complete`)
      .set("Authorization", `Bearer ${members[0].token}`)
      .send({ reason: "" });

    expect(res.status).toBe(400);
  });
});

describe("Cancelación de tareas", () => {
  test("el LEADER puede cancelar una tarea; queda CANCELLED de forma lógica", async () => {
    const { leader, members } = await createFamilyWithMembers(1);
    const task = (
      await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${leader.token}`)
        .send({ title: "Tarea", dueDate: futureDate(), assignedToId: members[0].user.id })
    ).body.data.task;

    const res = await request(app)
      .delete(`/api/tasks/${task.id}`)
      .set("Authorization", `Bearer ${leader.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.task.status).toBe("CANCELLED");

    // Sigue existiendo y es consultable (cancelacion logica, no DELETE fisico).
    const detail = await request(app)
      .get(`/api/tasks/${task.id}`)
      .set("Authorization", `Bearer ${leader.token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.task.status).toBe("CANCELLED");
  });

  test("un MEMBER no puede cancelar tareas (403)", async () => {
    const { leader, members } = await createFamilyWithMembers(1);
    const task = (
      await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${leader.token}`)
        .send({ title: "Tarea", dueDate: futureDate(), assignedToId: members[0].user.id })
    ).body.data.task;

    const res = await request(app)
      .delete(`/api/tasks/${task.id}`)
      .set("Authorization", `Bearer ${members[0].token}`);

    expect(res.status).toBe(403);
  });

  test("no se puede cancelar una tarea ya completada", async () => {
    const { leader, members } = await createFamilyWithMembers(1);
    const task = (
      await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${leader.token}`)
        .send({ title: "Tarea", dueDate: futureDate(), assignedToId: members[0].user.id })
    ).body.data.task;
    await request(app)
      .patch(`/api/tasks/${task.id}/status`)
      .set("Authorization", `Bearer ${members[0].token}`)
      .send({ status: "COMPLETED" });

    const res = await request(app)
      .delete(`/api/tasks/${task.id}`)
      .set("Authorization", `Bearer ${leader.token}`);

    expect(res.status).toBe(400);
  });

  test("cancelar un padre cancela en cascada sus subtareas activas", async () => {
    const { leader, members } = await createFamilyWithMembers(2);
    const task = (
      await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${leader.token}`)
        .send({
          title: "Compuesta",
          dueDate: futureDate(),
          subtasks: [
            { title: "Sub1", assignedToId: members[0].user.id },
            { title: "Sub2", assignedToId: members[1].user.id },
          ],
        })
    ).body.data.task;

    await request(app).delete(`/api/tasks/${task.id}`).set("Authorization", `Bearer ${leader.token}`);

    const detail = await request(app)
      .get(`/api/tasks/${task.id}`)
      .set("Authorization", `Bearer ${leader.token}`);
    expect(detail.body.data.task.subtasks.every((s) => s.status === "CANCELLED")).toBe(true);
  });
});

describe("Estado derivado de tareas compuestas", () => {
  test("el padre pasa a COMPLETED solo cuando todas las subtareas se completan", async () => {
    const { leader, members } = await createFamilyWithMembers(2);
    const task = (
      await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${leader.token}`)
        .send({
          title: "Compuesta",
          dueDate: futureDate(),
          subtasks: [
            { title: "Sub1", assignedToId: members[0].user.id },
            { title: "Sub2", assignedToId: members[1].user.id },
          ],
        })
    ).body.data.task;
    const subtasks = (
      await request(app).get(`/api/tasks/${task.id}`).set("Authorization", `Bearer ${leader.token}`)
    ).body.data.task.subtasks;

    await request(app)
      .patch(`/api/tasks/${task.id}/subtasks/${subtasks[0].id}/status`)
      .set("Authorization", `Bearer ${members[0].token}`)
      .send({ status: "COMPLETED" });

    const midway = await request(app)
      .get(`/api/tasks/${task.id}`)
      .set("Authorization", `Bearer ${leader.token}`);
    expect(midway.body.data.task.status).toBe("IN_PROGRESS");

    await request(app)
      .patch(`/api/tasks/${task.id}/subtasks/${subtasks[1].id}/status`)
      .set("Authorization", `Bearer ${members[1].token}`)
      .send({ status: "COMPLETED" });

    const final = await request(app)
      .get(`/api/tasks/${task.id}`)
      .set("Authorization", `Bearer ${leader.token}`);
    expect(final.body.data.task.status).toBe("COMPLETED");
  });

  test("agregar una subtarea nueva revierte un padre ya COMPLETED a IN_PROGRESS", async () => {
    const { leader, members } = await createFamilyWithMembers(1);
    const task = (
      await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${leader.token}`)
        .send({
          title: "Compuesta",
          dueDate: futureDate(),
          subtasks: [{ title: "Sub1", assignedToId: members[0].user.id }],
        })
    ).body.data.task;
    const sub1 = (
      await request(app).get(`/api/tasks/${task.id}`).set("Authorization", `Bearer ${leader.token}`)
    ).body.data.task.subtasks[0];

    await request(app)
      .patch(`/api/tasks/${task.id}/subtasks/${sub1.id}/status`)
      .set("Authorization", `Bearer ${members[0].token}`)
      .send({ status: "COMPLETED" });

    const completed = await request(app)
      .get(`/api/tasks/${task.id}`)
      .set("Authorization", `Bearer ${leader.token}`);
    expect(completed.body.data.task.status).toBe("COMPLETED");

    await request(app)
      .post(`/api/tasks/${task.id}/subtasks`)
      .set("Authorization", `Bearer ${leader.token}`)
      .send({ title: "Sub2 nueva", assignedToId: members[0].user.id });

    const afterNewSubtask = await request(app)
      .get(`/api/tasks/${task.id}`)
      .set("Authorization", `Bearer ${leader.token}`);
    expect(afterNewSubtask.body.data.task.status).toBe("IN_PROGRESS");
  });

  test("no se puede crear una subtarea anidada dentro de otra subtarea", async () => {
    const { leader, members } = await createFamilyWithMembers(1);
    const task = (
      await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${leader.token}`)
        .send({
          title: "Compuesta",
          dueDate: futureDate(),
          subtasks: [{ title: "Sub1", assignedToId: members[0].user.id }],
        })
    ).body.data.task;
    const sub1 = (
      await request(app).get(`/api/tasks/${task.id}`).set("Authorization", `Bearer ${leader.token}`)
    ).body.data.task.subtasks[0];

    // No existe ruta para crear subtareas de una subtarea: el unico endpoint
    // de creacion de subtareas (POST /api/tasks/:id/subtasks) exige que :id
    // sea una tarea de nivel superior.
    const res = await request(app)
      .post(`/api/tasks/${sub1.id}/subtasks`)
      .set("Authorization", `Bearer ${leader.token}`)
      .send({ title: "Nieta", assignedToId: members[0].user.id });

    expect(res.status).toBe(400);
  });
});
