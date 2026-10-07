const taskService = require("../services/taskService");
const {
  createTaskSchema,
  updateTaskSchema,
  assignTaskSchema,
  statusTransitionSchema,
  listTasksQuerySchema,
} = require("../validators/taskValidators");
const {
  createSubtaskSchema,
  updateSubtaskSchema,
  assignSubtaskSchema,
  subtaskStatusTransitionSchema,
} = require("../validators/subtaskValidators");
const { cannotCompleteSchema } = require("../validators/cannotCompleteValidators");
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

async function cannotCompleteTask(req, res) {
  const { reason } = cannotCompleteSchema.parse(req.body);
  const task = await taskService.cannotComplete(req.user, req.familyMembership, req.params.id, reason);
  return sendSuccess(res, { data: { task } });
}

async function cancelTask(req, res) {
  const task = await taskService.cancelTask(req.user, req.familyMembership, req.params.id);
  return sendSuccess(res, { data: { task } });
}

async function createSubtask(req, res) {
  const data = createSubtaskSchema.parse(req.body);
  const subtask = await taskService.createSubtask(req.user, req.familyMembership.familyId, req.params.id, data);
  return sendSuccess(res, { status: 201, data: { subtask } });
}

async function listSubtasks(req, res) {
  const subtasks = await taskService.listSubtasks(req.familyMembership.familyId, req.params.id);
  return sendSuccess(res, { data: { subtasks } });
}

async function updateSubtask(req, res) {
  const data = updateSubtaskSchema.parse(req.body);
  const subtask = await taskService.updateSubtask(
    req.user,
    req.familyMembership,
    req.params.taskId,
    req.params.subtaskId,
    data
  );
  return sendSuccess(res, { data: { subtask } });
}

async function assignSubtask(req, res) {
  const { assignedToId } = assignSubtaskSchema.parse(req.body);
  const subtask = await taskService.assignSubtask(
    req.user,
    req.familyMembership,
    req.params.taskId,
    req.params.subtaskId,
    assignedToId
  );
  return sendSuccess(res, { data: { subtask } });
}

async function updateSubtaskStatus(req, res) {
  const { status } = subtaskStatusTransitionSchema.parse(req.body);
  const subtask = await taskService.updateSubtaskStatus(
    req.user,
    req.familyMembership,
    req.params.taskId,
    req.params.subtaskId,
    status
  );
  return sendSuccess(res, { data: { subtask } });
}

module.exports = {
  createTask,
  listTasks,
  getTask,
  updateTask,
  assignTask,
  updateStatus,
  cannotCompleteTask,
  cancelTask,
  createSubtask,
  listSubtasks,
  updateSubtask,
  assignSubtask,
  updateSubtaskStatus,
};
