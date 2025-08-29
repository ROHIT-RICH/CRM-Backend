const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
const moment = require("moment-timezone");

const ZONE = "Asia/Kolkata";

// POST /api/attendance/mark-in
exports.markIn = async (req, res) => {
  const employeeId = req.user.id;
  const now = moment.tz(ZONE);
  const date = now.format("YYYY-MM-DD");
  const loginTime = now.format("HH:mm:ss"); // display-only
  const loginAt = now.toISOString();        // full timestamp for calc

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
      loginAt, // add this field to your schema (String)
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

  // ✅ Always use a safe string for timezone
  const timezone = typeof ZONE === "string" ? ZONE : "Asia/Kolkata";

  const now = moment.tz(timezone);
  const date = now.format("YYYY-MM-DD");
  const logoutAt = now; // full IST timestamp

  try {
    const attendance = await Attendance.findOne({ employee: employeeId, date });
    if (!attendance) {
      return res.status(404).json({ msg: "No attendance record found for today" });
    }

    if (attendance.logoutTime) {
      return res.status(200).json({ msg: "Already marked out" });
    }

    // Build login moment
    const loginMoment = attendance.loginAt
      ? moment.tz(attendance.loginAt, timezone)
      : moment.tz(
          `${attendance.date} ${attendance.loginTime}`,
          "YYYY-MM-DD HH:mm:ss",
          timezone,
          true
        );

    if (!loginMoment.isValid()) {
      return res.status(400).json({ msg: "Invalid stored login time" });
    }

    // Compute duration precisely in minutes then convert to hours
    const minutesWorked = logoutAt.diff(loginMoment, "minutes");
    const hoursWorked = minutesWorked / 60;

    let status = "Absent";
    if (hoursWorked >= 7.5) status = "Present";
    else if (hoursWorked >= 4) status = "Half Day";

    attendance.logoutTime = logoutAt.format("HH:mm:ss"); // display
    attendance.logoutAt = logoutAt.toISOString();        // save in DB
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
    // NOTE: Only keep the role filter if Attendance schema has a 'role' field.
    const attendanceRecords = await Attendance.find({ /* role: { $ne: "admin" } */ })
      .sort({ date: -1 });
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
      // role: { $ne: "admin" } // remove if role not on Attendance
    }).sort({ date: 1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: "Error fetching your attendance", error });
  }
};
