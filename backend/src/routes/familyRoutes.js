const { Router } = require("express");
const familyController = require("../controllers/familyController");
const { authenticate } = require("../middleware/auth");
const { loadFamilyMembership, requireFamilyMembership, requireLeader } = require("../middleware/family");
const asyncHandler = require("../middleware/asyncHandler");

const router = Router();

router.use(authenticate, loadFamilyMembership);

router.post("/", asyncHandler(familyController.createFamily));
router.get("/me", requireFamilyMembership, asyncHandler(familyController.getMyFamily));
router.get("/members", requireFamilyMembership, asyncHandler(familyController.getMembers));
router.delete(
  "/members/:memberId",
  requireFamilyMembership,
  requireLeader,
  asyncHandler(familyController.removeMember)
);

module.exports = router;
