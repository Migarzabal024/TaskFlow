const { Router } = require("express");
const statisticsController = require("../controllers/statisticsController");
const { authenticate } = require("../middleware/auth");
const { loadFamilyMembership, requireFamilyMembership } = require("../middleware/family");
const asyncHandler = require("../middleware/asyncHandler");

const router = Router();

router.use(authenticate, loadFamilyMembership, requireFamilyMembership);

router.get("/", asyncHandler(statisticsController.getStatistics));

module.exports = router;
