const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");
const { protect, isAdmin } = require("../middleware/authMiddleware");
const auth = require("../middleware/auth");

router.post("/mark-in", auth, attendanceController.markIn);
router.post("/mark-out",auth, attendanceController.markOut);
router.get("/my", auth, attendanceController.getMyAttendance);

// Removed `auth` and kept only `protect` and `isAdmin`
router.get("/all", protect, isAdmin, attendanceController.getAll);

module.exports = router;
