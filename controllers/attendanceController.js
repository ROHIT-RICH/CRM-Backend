const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
const moment = require("moment");
require("moment-timezone"); 

// POST /api/attendance/mark-in
exports.markIn = async (req, res) => {
  const employeeId = req.user.id;
  const date = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
  const loginTime = moment().tz("Asia/Kolkata").format("HH:mm:ss");

  try {
    const existing = await Attendance.findOne({ employee: employeeId, date });
    if (existing) {
      return res.status(200).json({ msg: "Already marked in." });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ msg: "Employee not found" });
    }

    const attendance = new Attendance({
      employee: employeeId,
      name: employee.name,
      email: employee.email,
      date,
      loginTime,
    });

    await attendance.save();
    res.status(201).json({ msg: "Login time recorded (IST)", attendance });
  } catch (err) {
    console.error("Error saving attendance:", err);
    res.status(500).json({ error: err.message });
  }
};


// POST /api/attendance/mark-out

exports.markOut = async (req, res) => {
  const employeeId = req.user.id;
  const date = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
  const logoutTime = moment().tz("Asia/Kolkata");

  try {
    const attendance = await Attendance.findOne({ employee: employeeId, date });

    if (!attendance) {
      return res.status(404).json({ msg: "No attendance record found for today" });
    }

    if (attendance.logoutTime) {
      return res.status(200).json({ msg: "Already marked out" });
    }

    // Parse loginTime in IST
    const loginTime = moment(attendance.loginTime, "HH:mm:ss").tz("Asia/Kolkata");

    const duration = moment.duration(logoutTime.diff(loginTime));
    const hoursWorked = duration.asHours();

    let status = "Absent";
    if (hoursWorked >= 7.5) status = "Present";
    else if (hoursWorked >= 4) status = "Half Day";

    attendance.logoutTime = logoutTime.format("HH:mm:ss");
    attendance.hoursWorked = hoursWorked.toFixed(2);
    attendance.status = status;

    await attendance.save();

    res.status(200).json({
      msg: "Logout time recorded (IST)",
      attendance,
      status,
      hoursWorked: hoursWorked.toFixed(2),
    });

  } catch (err) {
    console.error("Error marking out:", err);
    res.status(500).json({ error: err.message });
  }
};



// GET /api/attendance/all (Admin only)
exports.getAll = async (req, res) => {
  try {
    const attendanceRecords = await Attendance.find({ role: { $ne: "admin" } }).sort({ date: -1 });
    res.status(200).json(attendanceRecords);
  } catch (err) {
    console.error("Error fetching attendance:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getMyAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({
      employee: req.user.id,
      role: { $ne: "admin" } // exclude admin
    }).sort({ date: 1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: "Error fetching your attendance", error });
  }
};
