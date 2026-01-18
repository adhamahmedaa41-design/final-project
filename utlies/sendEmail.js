// sendEmail.js
require("dotenv").config();

const nodemailer = require("nodemailer");

async function sendEmail(to, subject, text, html = null) {
  try {
    console.log("Email config:");
    console.log("  Host:", process.env.SMTP_HOST);
    console.log("  Port:", process.env.SMTP_PORT);
    console.log("  User:", process.env.EMAIL_USER);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.ethereal.email",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Dev App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
    };

    // Send HTML if provided, otherwise plain text
    if (html) {
      mailOptions.html = html;
      // Also include text version for email clients that don't support HTML
      mailOptions.text = text || html.replace(/<[^>]*>/g, "");
    } else {
      mailOptions.text = text;
    }

    const info = await transporter.sendMail(mailOptions);

    console.log("Email sent! Message ID:", info.messageId);
    console.log("Preview URL:", nodemailer.getTestMessageUrl(info));

    return info;
  } catch (error) {
    console.error("Failed to send email:", error.message);
    throw error;
  }
}

module.exports = sendEmail;
