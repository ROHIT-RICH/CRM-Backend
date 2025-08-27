// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");

const { signupUser, loginUser, logoutUser } = require("../controllers/authcontroller");

// Routes
router.post("/signup", signupUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);


router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = req.user; //populated by auth middleware
    res.json(user);
  } catch (error) {
    console.error("Error in /api/users/me:", error.message);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
