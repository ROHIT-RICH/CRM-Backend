const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },

  email: { type: String, required: true, unique: true },

  password: { type: String, required: true },

  phone: { type: String },

  department: {
    type: String,
    enum: ["Sales", "Marketing", "IT"],
    required: function () {
      return this.role !== "admin"; // only required if NOT admin
    },
    default: "",
  },

  role: {
    type: String,
    enum: ["admin", "HR", "employee"],
    default: "employee",
  },

  isActive: { type: Boolean, default: false }, // Logged-in status
  lastLogin: { type: Date }, // Last login time

  // 🔑 For password reset
  resetToken: { type: String, default: null },
  resetTokenExpiry: { type: Date, default: null },
}, 
{ timestamps: true });

module.exports = mongoose.model("Employee", employeeSchema);
