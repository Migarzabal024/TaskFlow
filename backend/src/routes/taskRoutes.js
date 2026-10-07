const { Router } = require("express");
const taskController = require("../controllers/taskController");
const { authenticate } = require("../middleware/auth");
const { loadFamilyMembership, requireFamilyMembership, requireLeader } = require("../middleware/family");
const asyncHandler = require("../middleware/asyncHandler");

const router = Router();

router.use(authenticate, loadFamilyMembership, requireFamilyMembership);

router.post("/", requireLeader, asyncHandler(taskController.createTask));
router.get("/", asyncHandler(taskController.listTasks));
router.get("/:id", asyncHandler(taskController.getTask));
router.put("/:id", requireLeader, asyncHandler(taskController.updateTask));
router.patch("/:id/status", asyncHandler(taskController.updateStatus));
router.patch("/:id/assign", requireLeader, asyncHandler(taskController.assignTask));
router.patch("/:id/cannot-complete", asyncHandler(taskController.cannotCompleteTask));
router.delete("/:id", requireLeader, asyncHandler(taskController.cancelTask));

router.post("/:id/subtasks", requireLeader, asyncHandler(taskController.createSubtask));
router.get("/:id/subtasks", asyncHandler(taskController.listSubtasks));
router.put("/:taskId/subtasks/:subtaskId", requireLeader, asyncHandler(taskController.updateSubtask));
router.patch("/:taskId/subtasks/:subtaskId/status", asyncHandler(taskController.updateSubtaskStatus));
router.patch(
  "/:taskId/subtasks/:subtaskId/assign",
  requireLeader,
  asyncHandler(taskController.assignSubtask)
);

module.exports = router;
