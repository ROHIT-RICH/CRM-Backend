const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");
const auth = require("../middleware/auth");

// Employee routes
router.post("/mark-in", auth, attendanceController.markIn);
router.post("/mark-out", auth, attendanceController.markOut);
router.get("/my", auth, attendanceController.getMyAttendance);

// ⚠️ You don’t have isAdmin here yet
// If you need it, create it separately as another middleware
// Example:
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({ msg: "Admins only" });
};

// Admin-only route
router.get("/all", auth, isAdmin, attendanceController.getAll);

module.exports = router;
