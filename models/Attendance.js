const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  loginTime: {
    type: String,
  },
  hoursWorked: { type: String },
  status: { type: String, enum: ["Present", "Half Day", "Absent"] },
  logoutTime: {
    type: String,
  },
  
},{
  timestamps: true 
});

module.exports = mongoose.model("Attendance", attendanceSchema);
