const taskService = require("../services/taskService");
const {
  createTaskSchema,
  updateTaskSchema,
  assignTaskSchema,
  statusTransitionSchema,
  listTasksQuerySchema,
} = require("../validators/taskValidators");
const { sendSuccess } = require("../utils/apiResponse");

async function createTask(req, res) {
  const data = createTaskSchema.parse(req.body);
  const task = await taskService.createTask(req.user, req.familyMembership.familyId, data);
  return sendSuccess(res, { status: 201, data: { task } });
}

async function listTasks(req, res) {
  const filters = listTasksQuerySchema.parse(req.query);
  const tasks = await taskService.listTasks(req.user, req.familyMembership, filters);
  return sendSuccess(res, { data: { tasks } });
}

async function getTask(req, res) {
  const task = await taskService.getTaskById(req.user, req.familyMembership, req.params.id);
  return sendSuccess(res, { data: { task } });
}

async function updateTask(req, res) {
  const data = updateTaskSchema.parse(req.body);
  const task = await taskService.updateTask(req.user, req.familyMembership, req.params.id, data);
  return sendSuccess(res, { data: { task } });
}

async function assignTask(req, res) {
  const { assignedToId } = assignTaskSchema.parse(req.body);
  const task = await taskService.assignTask(req.user, req.familyMembership, req.params.id, assignedToId);
  return sendSuccess(res, { data: { task } });
}

async function updateStatus(req, res) {
  const { status } = statusTransitionSchema.parse(req.body);
  const task = await taskService.updateStatus(req.user, req.familyMembership, req.params.id, status);
  return sendSuccess(res, { data: { task } });
}

module.exports = { createTask, listTasks, getTask, updateTask, assignTask, updateStatus };
