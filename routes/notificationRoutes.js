const express = require("express");
const Notification = require("../models/Notification");

const router = express.Router();

// Get all notifications for a user
router.get("/:userId", async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.params.userId })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ success: false, error: "Failed to fetch notifications" });
  }
});

// Mark a specific notification as read
router.put("/mark-read/:id", async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.status(200).json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    console.error("Error updating notification:", error);
    res.status(500).json({ success: false, error: "Failed to update notification" });
  }
});

// Mark all notifications as read for a user
router.put("/mark-all/:userId", async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.params.userId, isRead: false }, { isRead: true });
    res.status(200).json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error marking all as read:", error);
    res.status(500).json({ success: false, error: "Failed to mark all notifications" });
  }
});

// Create a new notification (for testing or backend use)
router.post("/new", async (req, res) => {
  try {
    const { userId, message } = req.body;
    const newNotification = new Notification({ userId, message, isRead: false });
    await newNotification.save();

    res.status(201).json({ success: true, data: newNotification });
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({ success: false, error: "Failed to create notification" });
  }
});

router.get("/test/ping", (req, res) => {
  res.json({ ok: true, message: "Notifications API is working!" });
});

// Get unread notifications count
router.get("/count/:userId", async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.params.userId,
      isRead: false,
    });
    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error("Error fetching count:", error);
    res.status(500).json({ success: false, error: "Failed to fetch count" });
  }
});

module.exports = router;
