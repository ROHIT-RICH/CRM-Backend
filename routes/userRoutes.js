const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

router.get("/me", protect, (req, res) => {
  // Return only safe user info
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
  });
});

module.exports = router;