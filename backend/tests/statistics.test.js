const { app, request, resetDb, closeDb, createFamilyWithMembers } = require("./helpers");

beforeEach(resetDb);
afterAll(closeDb);

function futureDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

describe("Estadísticas", () => {
  test("sin tareas, todos los contadores arrancan en 0", async () => {
    const { leader } = await createFamilyWithMembers(1);
    const res = await request(app)
      .get("/api/statistics")
      .set("Authorization", `Bearer ${leader.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.statistics.total).toBe(0);
    expect(Object.values(res.body.data.statistics.counts).every((c) => c === 0)).toBe(true);
  });

  test("el LEADER ve el conteo de toda la familia; un MEMBER solo el de lo suyo", async () => {
    const { leader, members } = await createFamilyWithMembers(2);
    await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${leader.token}`)
      .send({ title: "Para miembro 1", dueDate: futureDate(), assignedToId: members[0].user.id });
    await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${leader.token}`)
      .send({ title: "Para miembro 2", dueDate: futureDate(), assignedToId: members[1].user.id });

    const leaderStats = await request(app)
      .get("/api/statistics")
      .set("Authorization", `Bearer ${leader.token}`);
    expect(leaderStats.body.data.statistics.total).toBe(2);
    expect(leaderStats.body.data.statistics.counts.PENDING).toBe(2);

    const member1Stats = await request(app)
      .get("/api/statistics")
      .set("Authorization", `Bearer ${members[0].token}`);
    expect(member1Stats.body.data.statistics.total).toBe(1);
  });

  test("una tarea cancelada se cuenta como CANCELLED, no desaparece del conteo", async () => {
    const { leader, members } = await createFamilyWithMembers(1);
    const task = (
      await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${leader.token}`)
        .send({ title: "Tarea", dueDate: futureDate(), assignedToId: members[0].user.id })
    ).body.data.task;

    await request(app).delete(`/api/tasks/${task.id}`).set("Authorization", `Bearer ${leader.token}`);

    const res = await request(app)
      .get("/api/statistics")
      .set("Authorization", `Bearer ${leader.token}`);
    expect(res.body.data.statistics.total).toBe(1);
    expect(res.body.data.statistics.counts.CANCELLED).toBe(1);
    expect(res.body.data.statistics.counts.PENDING).toBe(0);
  });

  test("cada estado se refleja correctamente en el conteo (pending/completed/cannot_complete)", async () => {
    const { leader, members } = await createFamilyWithMembers(1);

    await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${leader.token}`)
      .send({ title: "Pendiente", dueDate: futureDate(), assignedToId: members[0].user.id });

    const completedTask = (
      await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${leader.token}`)
        .send({ title: "Completada", dueDate: futureDate(), assignedToId: members[0].user.id })
    ).body.data.task;
    await request(app)
      .patch(`/api/tasks/${completedTask.id}/status`)
      .set("Authorization", `Bearer ${members[0].token}`)
      .send({ status: "COMPLETED" });

    const cannotTask = (
      await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${leader.token}`)
        .send({ title: "No se puede", dueDate: futureDate(), assignedToId: members[0].user.id })
    ).body.data.task;
    await request(app)
      .patch(`/api/tasks/${cannotTask.id}/cannot-complete`)
      .set("Authorization", `Bearer ${members[0].token}`)
      .send({ reason: "Falta tiempo" });

    const res = await request(app)
      .get("/api/statistics")
      .set("Authorization", `Bearer ${leader.token}`);

    expect(res.body.data.statistics.total).toBe(3);
    expect(res.body.data.statistics.counts.PENDING).toBe(1);
    expect(res.body.data.statistics.counts.COMPLETED).toBe(1);
    expect(res.body.data.statistics.counts.CANNOT_COMPLETE).toBe(1);
  });
});
