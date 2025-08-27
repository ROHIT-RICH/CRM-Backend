const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const Notification = require("../models/Notification"); // ✅ import Notification model
const taskController = require("../controllers/taskController");
const { protect, isAdmin } = require("../middleware/authMiddleware");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const upload = require("../middleware/multer");

// -------------------- Admin Routes --------------------

// Get all tasks
router.get("/", protect, isAdmin, taskController.getAllTasks);

// Create a new task and generate notification
router.post("/", protect, isAdmin, async (req, res) => {
  try {
    const { title, description, assignedTo, dueDate } = req.body;

    const newTask = new Task({ title, description, assignedTo, dueDate });
    await newTask.save();

    // Create notification for assigned employee
    if (assignedTo) {
      await Notification.create({
        userId: assignedTo,
        message: `📌 New task "${title}" has been assigned to you.`,
        task: newTask._id,
      });
    }

    res.status(201).json({ message: "Task created & notification sent", task: newTask });
  } catch (err) {
    console.error("Task creation failed:", err);
    res.status(500).json({ error: "Server Error", details: err.message });
  }
});

// -------------------- Employee Routes --------------------

// Get tasks assigned to logged-in employee
router.get("/my", protect, taskController.getTasksByEmployee);

// Update task status
router.put("/:taskId/status", protect, taskController.updateTaskStatus);

// -------------------- Utility Routes --------------------

// Count all tasks
router.get("/count", async (req, res) => {
  try {
    const count = await Task.countDocuments();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

// Get 5 most recent tasks
router.get("/recent", async (req, res) => {
  try {
    const recentTasks = await Task.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("assignedTo", "name");
    res.json(recentTasks);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

// Delete a task
router.delete("/:id", async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Get tasks for a specific employee (self-access only)
router.get("/employee/:employeeId", protect, async (req, res) => {
  try {
    if (req.user.role !== "employee" || req.user.id !== req.params.employeeId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const tasks = await Task.find({ assignedTo: req.params.employeeId });
    res.status(200).json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tasks for employee" });
  }
});

// Status summary for logged-in employee
router.get("/my/status-summary", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const counts = await Task.aggregate([
      { $match: { assignedTo: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const summary = { pending: 0, completed: 0, delayed: 0 };
    counts.forEach((item) => {
      if (item._id && summary.hasOwnProperty(item._id)) summary[item._id] = item.count;
    });

    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// -------------------- Excel Upload Task --------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/tasks/"),
  filename: (req, file, cb) => cb(null, `task_${Date.now()}${path.extname(file.originalname)}`),
});

router.post(
  "/upload-with-task",
  protect,
  isAdmin,
  upload.single("file"),
  async (req, res) => {
    try {
      const { title, description, assignedTo, dueDate } = req.body;

      const newTask = new Task({
        title,
        description,
        assignedTo,
        dueDate,
        excelFile: req.file ? `tasks/${req.file.filename}` : null,
      });

      await newTask.save();

      // Create notification for assigned employee
      if (assignedTo) {
        await Notification.create({
          userId: assignedTo,
          message: `📌 New task "${title}" has been assigned to you.`,
          task: newTask._id,
        });
      }

      res.status(201).json({ message: "Task created with file & notification sent", task: newTask });
    } catch (err) {
      console.error("Task upload failed:", err);
      res.status(500).json({ error: "Server Error", details: err.message });
    }
  }
);

// -------------------- Notifications --------------------
// Fetch notifications for logged-in employee
router.get("/notifications", protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;
