// controllers/employeeController.js
const Employee = require("../models/Employee");
const Task = require("../models/Task");
const Lead = require("../models/Lead");
const SalesUpdate = require("../models/SalesLeadUpdate")

exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find().select("-password");
    res.status(200).json(employees);
  } catch (err) {
    res.status(500).json({ message: "Failed to get employees", error: err.message });
  }
};

exports.getEmployeePerformance = async (req, res) => {
  try {
    const employees = await Employee.find();

    const performance = await Promise.all(
      employees.map(async (emp) => {
        if (emp.department === "Sales") {
          //Sales: calculate from leads
          const totalLeads = await Lead.countDocuments({ assignedTo: emp._id });
          const completedLeads = await SalesUpdate.countDocuments({ assignedTo: emp.employeeId, status: "Completed" });
          const pendingLeads = await SalesUpdate.countDocuments({ assignedTo: emp.employeeId, status: "Pending" });
          const followupLeads = await SalesUpdate.countDocuments({ assignedTo: emp.employeeId, status: "Follow-Up" });
          const notInterested = await SalesUpdate.countDocuments({ assignedTo: emp.employeeId, status: "Not Interested" });

          return {
            employeeId: emp._id,
            employeeName: emp.name,
            department: emp.department,
            role: emp.role,
            totalLeads,
            completedLeads,
            pendingLeads,
            followupLeads,
            notInterested,
            // leadIds,
            // latestUpdates,
          };
        } else {
          // IT/Admin: calculate from tasks
          const totalTasks = await Task.countDocuments({ assignedTo: emp._id });
          const completed = await Task.countDocuments({ assignedTo: emp._id, status: "completed" });
          const pending = await Task.countDocuments({ assignedTo: emp._id, status: "pending" });
          const delayed = await Task.countDocuments({ assignedTo: emp._id, status: "delayed" });

          return {
            employeeId: emp._id,
            employeeName: emp.name,
            department: emp.department,
            role: emp.role,
            totalTasks,
            completed,
            pending,
            delayed,
          };
        }
      })
    );
    

    res.json({ performance });
  } catch (err) {
    console.error("Error in /api/employees/performance:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.employeesCount = async (req, res) => {
  try {
    const count = await Employee.countDocuments();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
}

exports.deleteEmployees = async (req, res) => {
  try {
    const emp = await Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ message: "Employee not found" });

    await emp.deleteOne(); // ✅ Use this instead of remove()
    res.json({ message: "Employee deleted" });
  } catch (err) {
    console.error("Delete employee error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
