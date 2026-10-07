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

module.exports = router;
