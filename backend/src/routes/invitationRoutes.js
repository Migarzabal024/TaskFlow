const { Router } = require("express");
const invitationController = require("../controllers/invitationController");
const { authenticate } = require("../middleware/auth");
const { loadFamilyMembership, requireFamilyMembership, requireLeader } = require("../middleware/family");
const asyncHandler = require("../middleware/asyncHandler");

const router = Router();

router.post(
  "/",
  authenticate,
  loadFamilyMembership,
  requireFamilyMembership,
  requireLeader,
  asyncHandler(invitationController.createInvitation)
);

router.get(
  "/",
  authenticate,
  loadFamilyMembership,
  asyncHandler(invitationController.listInvitations)
);

router.post("/:token/accept", authenticate, asyncHandler(invitationController.acceptInvitation));
router.post("/:token/reject", authenticate, asyncHandler(invitationController.rejectInvitation));

module.exports = router;
