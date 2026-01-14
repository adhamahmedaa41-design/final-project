// sendEmail.js
require("dotenv").config(); // ← this line is critical!

const nodemailer = require("nodemailer");

async function sendEmail(to, subject, text) {
  try {
    // Debug - see what values are actually used
    console.log("Email config:");
    console.log("  Host:", process.env.SMTP_HOST);
    console.log("  Port:", process.env.SMTP_PORT);
    console.log("  User:", process.env.EMAIL_USER);
    console.log("  Pass length:", process.env.EMAIL_PASS?.length || "MISSING");

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.ethereal.email",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"Dev App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });

    console.log("Email sent! Message ID:", info.messageId);
    console.log("Preview URL:", nodemailer.getTestMessageUrl(info));

    return info;
  } catch (error) {
    console.error("Failed to send email:", error.message);
    throw error;
  }
}

module.exports = sendEmail;
