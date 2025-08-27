const cron = require("node-cron");
const moment = require("moment");
const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");

// Run every day at 8:01 PM
cron.schedule("0 23 * * *", async () => {
  try {
    const moment = require("moment-timezone");
    const today = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");

    // Get all non-admin employees
    const employees = await Employee.find({ role: "employee" });

    for (let emp of employees) {
      // Check if attendance exists today
      let attendance = await Attendance.findOne({ employee: emp._id, date: today });

      if (!attendance) {
        // Employee did not mark in → Absent
        attendance = new Attendance({
          employee: emp._id,
          name: emp.name,
          email: emp.email,
          date: today,
          status: "Absent",
          hoursWorked: 0,
        });
        await attendance.save();
        console.log(`Marked Absent: ${emp.name}`);
      } else if (!attendance.loginTime) {
        // Somehow attendance exists but no loginTime
        attendance.status = "Absent";
        attendance.hoursWorked = 0;
        await attendance.save();
        console.log(`Marked Absent (no login): ${emp.name}`);
      }
    }
    console.log("Running auto-absent cron at", new Date().toLocaleString());

    console.log("✅ Auto-Absent check complete for today");

  } catch (err) {
    console.error("Error running auto-absent cron:", err);
  }
});
