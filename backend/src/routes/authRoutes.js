const { Router } = require("express");
const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

const router = Router();

router.post("/register", asyncHandler(authController.register));
router.post("/login", asyncHandler(authController.login));
router.post("/logout", authenticate, asyncHandler(authController.logout));
router.get("/me", authenticate, asyncHandler(authController.me));

module.exports = router;
