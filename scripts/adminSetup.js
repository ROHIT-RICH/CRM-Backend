// scripts/createAdmin.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// Import your User model
const User = require("../models/Employee");

// Connect to MongoDB
mongoose.connect(process.env.VITE_API_BASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => {
    console.error("❌ DB connection failed:", err);
    process.exit(1);
});

async function createAdmin() {
    try {
        const email = "rohit.vaishya@digitalflyhigh.in";
        const password = "Admin@123"; // Change later for security

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email });
        if (existingAdmin) {
            console.log("⚠️ Admin already exists");
            process.exit();
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = new User({
            name: "Admin",
            email,
            password: hashedPassword,
            role: "admin",
            department: null
        });

        await admin.save();
        console.log("🎉 Admin created successfully!");
        process.exit();
    } catch (err) {
        console.error("❌ Error creating admin:", err);
        process.exit(1);
    }
}

createAdmin();
