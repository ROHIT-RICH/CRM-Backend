const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const Employee = require("../models/Employee");
const { all, update } = require("../controllers/profileController");

// Get Profile

router.get("/", authMiddleware, all);

// UPDATE profile
router.put("/", authMiddleware, update);

module.exports = router;
