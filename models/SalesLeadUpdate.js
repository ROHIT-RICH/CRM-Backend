const mongoose = require("mongoose");

const SalesLeadUpdateSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Completed", "Follow-Up", "Not Interested"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SalesLeadUpdate", SalesLeadUpdateSchema);
