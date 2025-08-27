const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const Announcement = require("../models/Announcment");
const Notification = require("../models/Notification");
const User = require("../models/Employee");

// ✅ Create new announcement
router.post("/announcements", authMiddleware, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // ✅ allow both admin & hr
    if (!["admin", "HR"].includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { title, message, expiresAt } = req.body;

    // Save announcement
    const announcement = new Announcement({
      title,
      message,
      expiresAt,
      createdBy: req.user.id,
    });
    await announcement.save();

    // Fetch all employees
    const employees = await User.find({}, "_id");

    // Create notifications for each employee
    const notifications = employees.map((emp) => ({
      userId: emp._id,
      type: "announcement",
      message: `📢 ${title}: ${message}`,
      relatedId: announcement._id,
    }));

    const savedNotifications = await Notification.insertMany(notifications);

    // Emit to connected employees
    employees.forEach((emp, idx) => {
      const socketId = req.connectedUsers?.get(emp._id.toString());
      if (socketId) {
        req.io.to(socketId).emit("new-notification", savedNotifications[idx]);
      }
    });

    res.status(201).json({ announcement });
  } catch (error) {
    console.error("❌ Error creating announcement:", error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ Get all active announcements
router.get("/announcements", authMiddleware, async (req, res) => {
  const now = new Date();
  const announcements = await Announcement.find({
    $or: [{ expiresAt: { $gte: now } }, { expiresAt: null }],
  }).sort({ createdAt: -1 });

  res.json(announcements);
});

module.exports = router;
