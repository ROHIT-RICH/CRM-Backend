const path = require("path");
const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, text, html) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"CRM Admin" <${process.env.EMAIL_USER}>`,
      to,
      subject, 
      text,
      html,
      attachments: [{
        filename: 'logo.jpg',
        path: path.join(__dirname, "../public/images/logo.jpg"), // path to your uploaded logo
        cid: 'companyLogo' // same as in HTML img src
      }]
    };

    await transporter.sendMail(mailOptions);
    console.log("📨 Email sent to", to);
  } catch (err) {
    console.error("❌ Failed to send email:", err);
  }
};

module.exports = sendEmail;
