const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date }, // optional - auto-hide after expiry
  isImportant: { type: Boolean, default: false }
});

module.exports = mongoose.model("Announcement", announcementSchema);
