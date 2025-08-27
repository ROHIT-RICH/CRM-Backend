const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Employee = require("../models/Employee");
const sendEmail = require("../utils/sendEmail");

// Generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, department: user.department, role: user.role, email: user.email, phone: user.phone },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// Signup 

exports.signupUser = async (req, res) => {
  const { name, email, password, department, role } = req.body;
  console.log("Incoming signup data:", req.body);

  try {
    const existingUser = await Employee.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    if (!department || department.trim() === "") {
      return res.status(400).json({ message: "Department is required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await Employee.create({ name, email, password: hashedPassword, role, department });

    // ✉️ Plain text fallback
    const text = `Hello ${name},\n\nYou have been added to the CRM system.\nLogin Email: ${email}\nPassword: ${password}\n\nPlease login and update your password and mobile number.`;

    // 💅 HTML version
    const html = `
     <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CRM System - Welcome Email</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Email Template -->
        <div style="
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px 20px;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        ">
          <div style="
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          ">
            <!-- Logo -->
            <div style="text-align: center; margin-bottom: 25px;">
              <img src="cid:companyLogo" alt="Digital Fly High Solutions" style="max-width: 180px;">
            </div>

            <!-- Welcome Heading -->
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="
                color: #2c3e50;
                font-size: 28px;
                font-weight: 600;
                margin: 0 0 10px 0;
                letter-spacing: -0.5px;
              ">Welcome to the CRM System, ${name}!</h2>
              <p style="
                color: #7f8c8d;
                font-size: 16px;
                margin: 0;
                line-height: 1.6;
              ">You have been successfully added by the Admin.</p>
            </div>

            <!-- Credentials -->
            <div style="
              background: #f8f9fa;
              padding: 25px;
              border-radius: 8px;
              border-left: 4px solid #667eea;
              margin: 25px 0;
            ">
              <p style="
                color: #2c3e50;
                font-weight: 600;
                font-size: 18px;
                margin: 0 0 15px 0;
              ">Your login credentials:</p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #e9ecef;">
                  <td style="padding: 12px 0; color: #6c757d; font-weight: 500; width: 30%;"><strong>Email:</strong></td>
                  <td style="padding: 12px 0; color: #2c3e50; font-weight: 600;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; color: #6c757d; font-weight: 500;"><strong>Password:</strong></td>
                  <td style="padding: 12px 0; color: #2c3e50; font-weight: 600;">${password}</td>
                </tr>
              </table>
            </div>

            <!-- Security Notice -->
            <div style="
              background: #e8f4fd;
              padding: 20px;
              border-radius: 8px;
              border: 1px solid #bee5eb;
              margin: 25px 0;
            ">
              <p style="color: #0c5460; font-size: 16px; margin: 0; line-height: 1.5;">
                ⚠ <strong>Important:</strong> Please login and update your password for security.
              </p>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 30px; padding-top: 25px; border-top: 1px solid #e9ecef;">
              <p style="color: #6c757d; font-size: 14px; margin: 0; line-height: 1.6;">
                Regards,<br/>
                <span style="color: #2c3e50; font-weight: 600;">CRM Admin Team</span>
              </p>
            </div>
          </div>
        </div>
    </div>
</body>
</html>


    `;

    await sendEmail(email, "Welcome to CRM System", text, html);

    res.status(201).json({ message: "Employee created and email sent successfully" });
  } catch (err) {
    console.error("❌ Error during signup:", err.message);
    res.status(500).json({ message: "Signup error", error: err.message });
  }
};



exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await Employee.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Mark as active and update last login time
    user.isActive = true;
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        department: user.department,
        isActive: user.isActive,
        lastLogin: user.lastLogin
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Login error", error: err.message });
  }
};

exports.logoutUser = async (req, res) => {
  try {
    const { id } = req.user; // from JWT middleware
    await Employee.findByIdAndUpdate(id, { isActive: false });
    res.json({ message: "Logout successful" });
  } catch (err) {
    res.status(500).json({ message: "Logout error", error: err.message });
  }
};