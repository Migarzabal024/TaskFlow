const { app, request, resetDb, closeDb, createFamilyWithMembers } = require("./helpers");

beforeEach(resetDb);
afterAll(closeDb);

function futureDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

async function createTaskAssignedTo(leader, member) {
  const res = await request(app)
    .post("/api/tasks")
    .set("Authorization", `Bearer ${leader.token}`)
    .send({ title: "Tarea", dueDate: futureDate(), assignedToId: member.user.id });
  return res.body.data.task;
}

describe("Mensajes de tarea", () => {
  test("el líder y el asignado pueden enviar y leer mensajes de la tarea", async () => {
    const { leader, members } = await createFamilyWithMembers(1);
    const task = await createTaskAssignedTo(leader, members[0]);

    const sent = await request(app)
      .post(`/api/tasks/${task.id}/messages`)
      .set("Authorization", `Bearer ${members[0].token}`)
      .send({ content: "Ya empiezo" });
    expect(sent.status).toBe(201);
    expect(sent.body.data.message.senderId).toBe(members[0].user.id);

    const list = await request(app)
      .get(`/api/tasks/${task.id}/messages`)
      .set("Authorization", `Bearer ${leader.token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.messages).toHaveLength(1);
  });

  test("un miembro de la familia sin relación con la tarea no puede ver ni enviar mensajes", async () => {
    const { leader, members } = await createFamilyWithMembers(2);
    const task = await createTaskAssignedTo(leader, members[0]);

    const unrelatedMember = members[1];
    const listRes = await request(app)
      .get(`/api/tasks/${task.id}/messages`)
      .set("Authorization", `Bearer ${unrelatedMember.token}`);
    expect(listRes.status).toBe(403);

    const sendRes = await request(app)
      .post(`/api/tasks/${task.id}/messages`)
      .set("Authorization", `Bearer ${unrelatedMember.token}`)
      .send({ content: "Hola" });
    expect(sendRes.status).toBe(403);
  });

  test("un mensaje vacío es rechazado", async () => {
    const { leader, members } = await createFamilyWithMembers(1);
    const task = await createTaskAssignedTo(leader, members[0]);

    const res = await request(app)
      .post(`/api/tasks/${task.id}/messages`)
      .set("Authorization", `Bearer ${leader.token}`)
      .send({ content: "   " });

    expect(res.status).toBe(400);
  });

  test("un usuario sin familia no puede acceder a mensajes de ninguna tarea", async () => {
    const { leader, members } = await createFamilyWithMembers(1);
    const task = await createTaskAssignedTo(leader, members[0]);

    const outsider = (
      await request(app)
        .post("/api/auth/register")
        .send({ name: "Afuera", email: "outsider.msg@familytask.test", password: "Password123!" })
    ).body.data;

    const res = await request(app)
      .get(`/api/tasks/${task.id}/messages`)
      .set("Authorization", `Bearer ${outsider.token}`);

    expect(res.status).toBe(403);
  });
});
