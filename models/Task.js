const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "delayed"],
      default: "pending",
    },
    excelFile: {
      type: String,
      default: null,
    },
    dueDate: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);
