const bcrypt = require("bcryptjs");
const User = require("../models/User");

// POST /api/admin/add-employee
const addEmployee = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Employee already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newEmployee = new User({
      name,
      email,
      password: hashedPassword,
      role: "employee",
      department:"",
    });

    await newEmployee.save();

    res.status(201).json({ message: "Employee created successfully" });
  } catch (err) {
    console.error("Error adding employee:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { addEmployee };
