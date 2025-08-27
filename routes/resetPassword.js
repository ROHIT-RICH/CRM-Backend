const express = require("express");
const bcrypt = require("bcryptjs");
const Employee = require("../models/Employee");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const router = express.Router();

/**
 * @route POST /api/reset-password/forgot
 * @desc Request password reset (send token to email)
 */
router.post("/forgot", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await Employee.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Save token + expiry in DB
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 1000 * 60 * 15; // 15 mins
    await user.save();

    // Create password reset URL (frontend should handle /reset/:token)
    const resetUrl = `${process.env.FRONTEND_URL}/reset/${resetToken}`;
    console.log("FRONTEND_URL from env:", process.env.FRONTEND_URL);

    // Setup nodemailer transport
    const transporter = nodemailer.createTransport({
      service: "gmail", // Or use SMTP
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Send email
    await transporter.sendMail({
      from: `"Support | CRM" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "🔒 Password Reset Request",
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 10px; border: 1px solid #e0e0e0;">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #eee;">
        <h1 style="color: #007bff; margin: 0;">CRM Support</h1>
        <p style="color: #555; font-size: 14px; margin-top: 5px;">Secure Password Reset</p>
      </div>
      
      <div style="padding: 20px; color: #333;">
        <p style="font-size: 16px;">Hello <strong>${user.name}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6;">
          We received a request to reset your password. Click the button below to set a new password:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" target="_blank"
            style="background: #007bff; color: #fff; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-size: 16px; display: inline-block;">
            🔑 Reset My Password
          </a>
        </div>

        <p style="font-size: 14px; color: #666; line-height: 1.5;">
          This link will expire in <strong>15 minutes</strong>. If you did not request this, please ignore this email.  
        </p>
        
        <p style="font-size: 14px; color: #666;">
          For security reasons, never share your password with anyone.
        </p>
      </div>

      <div style="text-align: center; padding: 15px; font-size: 12px; color: #aaa; border-top: 1px solid #eee; margin-top: 20px;">
        © ${new Date().getFullYear()} CRM Solutions. All rights reserved.
      </div>
    </div>
  `,
    });

    res.json({ msg: "Password reset link sent to email" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * @route POST /api/reset-password/:token
 * @desc Reset password with token
 */
router.post("/:token", async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    const user = await Employee.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ msg: "Invalid or expired token" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // clear reset token
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();

    res.json({ msg: "Password has been reset successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * @route PUT /api/reset-password/change
 * @desc Change password (user logged in)
 */
const authMiddleware = require("../middleware/auth");
router.put("/change", authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await Employee.findById(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid current password" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ msg: "Password updated successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
