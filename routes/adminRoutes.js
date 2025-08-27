const express = require("express");
const router = express.Router();

const { addEmployee } = require("../controllers/adminController");
const { protect } = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// Admin-only route
router.post("/add-employee", protect, roleMiddleware("admin"), addEmployee);

module.exports = router;
