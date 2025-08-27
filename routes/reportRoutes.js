const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Report = require("../models/reportModel");
const moment = require("moment");
const Attendance = require('../models/Attendance');
const User = require('../models/Employee');


router.post("/submit", auth.protect, async (req, res) => {
  const userId = req.user.id;
  const { content } = req.body;

  if (!content) return res.status(400).json({ message: "Report is required" });

  const today = moment().format("YYYY-MM-DD");

  try {
    const existingReport = await Report.findOne({ user: userId, date: today });
    if (existingReport)
      return res.status(400).json({ message: "Report already submitted" });

    const report = new Report({ user: userId, date: today, content });
    await report.save();

    res.status(200).json({ message: "Report submitted" });
  } catch (error) {
    console.error("Report Submit Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/check", auth.protect, async (req, res) => {
  const userId = req.user.id;
  const today = moment().format("YYYY-MM-DD");

  try {
    const report = await Report.findOne({ user: userId, date: today });

    if (report) {
      res.status(200).json({ hasSubmittedReport: true, report });
    } else {
      res.status(200).json({ hasSubmittedReport: false });
    }
  } catch (error) {
    console.error("Check Report Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get('/daily', auth.protect, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const attendances = await Attendance.find({ date: today });

    // Step 1: Collect all emails
    const emails = attendances.map((a) => a.email);

    // Step 2: Get department & role from User collection
    const users = await User.find({ email: { $in: emails } }, "email department role");
    const userMap = {};
    users.forEach((u) => {
      userMap[u.email] = {
        department: u.department || "N/A",
        role: u.role || "N/A",
      };
    });

    // Step 3: Build a map of reports
    const reports = await Report.find({ date: today }).populate("user", "email");
    const reportMap = {};
    reports.forEach((report) => {
      const email = report.user?.email;
      if (email) {
        reportMap[email] = report.content;
      }
    });

    // Step 4: Combine attendance + report + user details
    const combinedData = attendances.map((attendance) => {
      const userInfo = userMap[attendance.email] || {};
      return {
        name: attendance.name,
        email: attendance.email,
        markIn: attendance.loginTime,
        markOut: attendance.logoutTime,
        status: attendance.status,
        hoursWorked: attendance.hoursWorked,
        report: reportMap[attendance.email] || "No report submitted",
        department: userInfo.department,
        role: userInfo.role,
      };
    });

    res.json(combinedData);
  } catch (err) {
    console.error("Error fetching combined daily report:", err.message);
    res.status(500).json({ msg: "Failed to fetch combined report" });
  }
});


const generateSummary = async (attendances, reports) => {
  const summary = {};
  const emails = [...new Set(attendances.map((a) => a.email))];

  // Step 1: Get department & role from user info
  const users = await User.find({ email: { $in: emails } }, "email department role");
  const userMap = {};
  users.forEach((u) => {
    userMap[u.email] = {
      department: u.department || "N/A",
      role: u.role || "N/A",
    };
  });

  // Step 2: Tally up attendance
  attendances.forEach((a) => {
    if (!summary[a.email]) {
      const userInfo = userMap[a.email] || {};
      summary[a.email] = {
        name: a.name,
        email: a.email,
        department: userInfo.department,
        role: userInfo.role,
        present: 0,
        halfDay: 0,
        absent: 0,
        reports: [],   // store actual reports here
      };
    }

    const status = a.status?.toLowerCase() || "";
    if (status.includes("present")) summary[a.email].present += 1;
    else if (status.includes("half")) summary[a.email].halfDay += 1;
    else summary[a.email].absent += 1;
  });

  // Step 3: Store actual report contents
  reports.forEach((r) => {
    const email = r.user?.email;
    if (email && summary[email]) {
      summary[email].reports.push({
        date: r.date,
        content: r.content,
      });
    }
  });

  return Object.values(summary);
};


// WEEKLY SUMMARY ROUTE
router.get("/weekly", auth.protect, async (req, res) => {
  const { from, to, department } = req.query;
  if (!from || !to) {
    return res.status(400).json({ message: "From and To dates are required" });
  }

  const start = moment(from, "YYYY-MM-DD");
  const end = moment(to, "YYYY-MM-DD");

  if (!start.isValid() || !end.isValid()) {
    return res.status(400).json({ message: "Invalid date format" });
  }

  try {
    const dates = [];
    while (start.isSameOrBefore(end)) {
      dates.push(start.format("YYYY-MM-DD"));
      start.add(1, "days");
    }

    const attendanceQuery = { date: { $in: dates } };
    if (department) attendanceQuery.department = department;

    const [attendances, reports] = await Promise.all([
      Attendance.find(attendanceQuery),
      Report.find({ date: { $in: dates } }).populate("user", "email department role"),
    ]);

    const summary = await generateSummary(attendances, reports);
    console.log("sum", summary)
    res.json(summary);
  } catch (err) {
    console.error("Weekly summary error:", err);
    res.status(500).json({ message: "Failed to fetch weekly summary" });
  }
});



// MONTHLY SUMMARY ROUTE
router.get("/monthly", auth.protect, async (req, res) => {
  const { month, department } = req.query; // e.g., "2025-07"
  if (!month) return res.status(400).json({ message: "Month is required" });

  try {
    const attendanceQuery = { date: { $regex: `^${month}` } };
    if (department) attendanceQuery.department = department;

    const [attendances, reports] = await Promise.all([
      Attendance.find(attendanceQuery),
      Report.find({ date: { $regex: `^${month}` } }).populate("user", "email department role")
    ]);

    const summary = await generateSummary(attendances, reports);
    res.json(summary);
  } catch (err) {
    console.error("Monthly summary error:", err);
    res.status(500).json({ message: "Failed to fetch monthly summary" });
  }
});

// User Report

router.get("/by-user", auth.protect, async (req, res) => {
  const { email, filterType, filterValue } = req.query;

  if (!email || !filterType || !filterValue) {
    return res.status(400).json({ message: "Missing query params" });
  }

  try {
    let dateFilter = {};
    if (filterType === "daily") {
      dateFilter = { date: filterValue };
    } else if (filterType === "weekly") {
      const [from, to] = filterValue.split(",");
      dateFilter = { date: { $gte: from, $lte: to } };
    } else if (filterType === "monthly") {
      dateFilter = { date: { $regex: `^${filterValue}` } };
    }

    const reports = await Report.find({ ...dateFilter })
      .populate("user", "email name")
      .exec();

    const userReports = reports.filter((r) => r.user?.email === email);

    res.json(userReports);
  } catch (err) {
    console.error("Fetch by-user reports error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});



module.exports = router;
