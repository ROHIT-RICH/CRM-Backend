const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  date: {
    type: String, // 'YYYY-MM-DD' format
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
});

reportSchema.index({ user: 1, date: 1 }, { unique: true }); // Prevent duplicate for same user/day

module.exports = mongoose.model("Report", reportSchema);
