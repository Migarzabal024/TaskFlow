const { Router } = require("express");
const notificationController = require("../controllers/notificationController");
const { authenticate } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

const router = Router();

router.use(authenticate);

router.get("/", asyncHandler(notificationController.listNotifications));
router.patch("/read-all", asyncHandler(notificationController.markAllRead));
router.patch("/:id/read", asyncHandler(notificationController.markRead));

module.exports = router;
