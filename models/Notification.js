const mongoose = require("mongoose");
const { Schema } = mongoose;

const notificationSchema = new Schema({
  type: {
    type: String,
    enum: ["task", "lead", "announcement"],
    default: "task",
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: function () {
      return this.type !== "announcement"; // required only for tasks/leads
    },
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
  },
  message: {
    type: String,
    required: true,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Notification", notificationSchema);
