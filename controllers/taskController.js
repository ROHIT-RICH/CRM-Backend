const Task = require("../models/Task");
const Notification = require("../models/Notification");

// Admin - Get all tasks
exports.getAllTasks = async (req, res) => {
  try {
    const tasks = await Task.find().populate("assignedTo", "name email");
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Error getting tasks", error: err.message });
  }
};

// Admin - Create new task + notification
// Admin - Create new task + notification
exports.createTask = async (req, res) => {
  const { title, description, assignedTo, dueDate, status } = req.body;

  try {
    if (!assignedTo) {
      return res.status(400).json({ message: "Assigned employee is required" });
    }

    // Save Task
    const task = await Task.create({
      title,
      description,
      assignedTo,
      dueDate,
      status,
      excelFile: req.file?.path?.replace(/\\/g, "/") || null,
    });

    // Save Notification
    const notification = await Notification.create({
      userId: assignedTo,
      message: `📌 New Task Assigned: ${title}`,
      isRead: false,
    });

    // ✅ Emit real-time notification via socket
    if (req.io) {
      const receiverSocketId = req.connectedUsers.get(assignedTo.toString());
      if (receiverSocketId) {
        req.io.to(receiverSocketId).emit("new_notification", notification);
        console.log(`✅ Notification sent to user ${assignedTo}`);
      } else {
        console.log(`ℹ️ User ${assignedTo} is offline`);
      }
    }

    res.status(201).json({
      message: "Task created & notification sent",
      task,
      notification,
    });
  } catch (err) {
    console.error("Task Creation Error:", err);
    res.status(500).json({
      message: "Error creating task",
      error: err.message,
    });
  }
};



// Employee - Get tasks assigned to them
exports.getTasksByEmployee = async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user.id }).populate(
      "assignedTo",
      "name email"
    );
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Error getting tasks", error: err.message });
  }
};

// Employee - Update task status
exports.updateTaskStatus = async (req, res) => {
  const { taskId } = req.params;
  const { status } = req.body;

  try {
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Ensure the logged-in employee owns the task
    if (task.assignedTo.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized to update this task" });

    task.status = status;
    await task.save();

    res.json({ message: "Task updated", task });
  } catch (err) {
    res.status(500).json({ message: "Error updating task", error: err.message });
  }
};

// Admin - Get task status counts
exports.getTaskStatusCounts = async (req, res) => {
  try {
    const statuses = ["pending", "completed", "delayed"];
    const results = await Task.aggregate([
      { $match: { status: { $in: statuses } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const counts = { pending: 0, completed: 0, delayed: 0 };
    results.forEach((item) => {
      counts[item._id] = item.count;
    });

    res.status(200).json(counts);
  } catch (err) {
    console.error("Status Count Error:", err);
    res.status(500).json({
      message: "Error fetching status counts",
      error: err.message,
    });
  }
};
