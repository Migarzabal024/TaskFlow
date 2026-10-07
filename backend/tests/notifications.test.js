const { app, request, resetDb, closeDb, createFamilyWithMembers } = require("./helpers");

beforeEach(resetDb);
afterAll(closeDb);

function futureDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

describe("Notificaciones", () => {
  test("asignar una tarea genera una notificación TASK_ASSIGNED para el asignado", async () => {
    const { leader, members } = await createFamilyWithMembers(1);
    await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${leader.token}`)
      .send({ title: "Tarea", dueDate: futureDate(), assignedToId: members[0].user.id });

    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${members[0].token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.notifications.some((n) => n.type === "TASK_ASSIGNED")).toBe(true);
  });

  test("completar una tarea notifica al LEADER (TASK_COMPLETED)", async () => {
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
      .get("/api/notifications")
      .set("Authorization", `Bearer ${leader.token}`);
    expect(res.body.data.notifications.some((n) => n.type === "TASK_COMPLETED")).toBe(true);
  });

  test("un mensaje notifica a los demás watchers de la tarea, no a quien lo envía", async () => {
    const { leader, members } = await createFamilyWithMembers(1);
    const task = (
      await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${leader.token}`)
        .send({ title: "Tarea", dueDate: futureDate(), assignedToId: members[0].user.id })
    ).body.data.task;

    await request(app)
      .post(`/api/tasks/${task.id}/messages`)
      .set("Authorization", `Bearer ${members[0].token}`)
      .send({ content: "Mensaje" });

    const leaderNotifs = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${leader.token}`);
    expect(leaderNotifs.body.data.notifications.some((n) => n.type === "TASK_MESSAGE")).toBe(true);

    const senderNotifs = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${members[0].token}`);
    expect(senderNotifs.body.data.notifications.some((n) => n.type === "TASK_MESSAGE")).toBe(false);
  });

  test("marcar una notificación como leída funciona, y no se puede marcar la de otro usuario", async () => {
    const { leader, members } = await createFamilyWithMembers(1);
    await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${leader.token}`)
      .send({ title: "Tarea", dueDate: futureDate(), assignedToId: members[0].user.id });

    const notifs = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${members[0].token}`);
    const notificationId = notifs.body.data.notifications[0].id;

    const byOther = await request(app)
      .patch(`/api/notifications/${notificationId}/read`)
      .set("Authorization", `Bearer ${leader.token}`);
    expect(byOther.status).toBe(404);

    const byOwner = await request(app)
      .patch(`/api/notifications/${notificationId}/read`)
      .set("Authorization", `Bearer ${members[0].token}`);
    expect(byOwner.status).toBe(200);
    expect(byOwner.body.data.notification.readAt).not.toBeNull();
  });
});
