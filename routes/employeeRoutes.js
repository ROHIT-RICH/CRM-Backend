const express = require("express");
const router = express.Router();
const { getAllEmployees, employeesCount, deleteEmployees } = require("../controllers/employeeController");
const { getEmployeePerformance } = require("../controllers/employeeController");
// const { protect } = require("../middleware/authMiddleware");
const authMiddleware = require("../middleware/auth");
const { isAdmin } = require("../middleware/authMiddleware");

router.get("/employees", authMiddleware, getAllEmployees);
router.get("/employe", getAllEmployees);
router.get('/count', employeesCount);

router.get("/performance", getEmployeePerformance);

router.delete("/:id", authMiddleware, isAdmin, deleteEmployees)

// GET all employees from Sales department
router.get("/sales-employees", authMiddleware, async (req, res) => {
  try {
    const salesEmployees = await require("../models/Employee").find({
      role: "employee",
      department: "Sales",
    }).select("name email _id");

    res.json(salesEmployees);
  } catch (error) {
    console.error("Error fetching sales employees:", error);
    res.status(500).json({ error: "Failed to fetch sales employees" });
  }
});


module.exports = router;
