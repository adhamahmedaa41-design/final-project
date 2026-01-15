const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const otpGenerator = require("otp-generator");

const User = require("../model/user");
const sendEmail = require("../utlies/sendEmail");

const {
  registerSchema,
  verifySchema,
  loginSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../validation/userValidator");

// Reusable OTP generator
const generateOTP = () =>
  otpGenerator.generate(6, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });

// ─────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.details.map((d) => d.message),
      });
    }

    const { email, password } = value;

    if (await User.exists({ email })) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const otp = generateOTP();

    const user = await User.create({
      ...value,
      password: hashedPassword,
      otp,
      otpExpiry: Date.now() + 10 * 60 * 1000,
    });

    await sendEmail(
      email,
      "Your OTP Code",
      `Hello,\n\nYour OTP code is: ${otp}\n\nValid for 10 minutes.\n\nThank you!`
    );

    return res.status(201).json({
      message: "Registration successful. Check your email for OTP.",
      userId: user._id,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ─────────────────────────────────────────────
// VERIFY OTP
// ─────────────────────────────────────────────
router.post("/verify-otp", async (req, res) => {
  // ... your existing code (looks good) ...
});

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
router.post("/login", async (req, res) => {
  // ... your existing code (looks good) ...
});

// ─────────────────────────────────────────────
// RESEND OTP
// ─────────────────────────────────────────────
router.post("/resend-otp", async (req, res) => {
  // ... your existing code (looks good) ...
});

// ─────────────────────────────────────────────
// FORGOT PASSWORD
// ─────────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    const { error, value } = forgotPasswordSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.details.map((d) => d.message),
      });
    }

    const { email } = value;

    const user = await User.findOne({ email });
    if (!user) {
      // For security, don't tell if email exists
      return res.json({
        message: "If the email exists, a reset link has been sent",
      });
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = Date.now() + 60 * 60 * 1000; // 1 hour

    await user.save();

    const resetUrl = `${
      process.env.CLIENT_ORIGIN?.trim() || "http://localhost:3000"
    }/reset-password/${resetToken}`;

    await sendEmail(
      email,
      "Reset Your Password",
      `Hello,\n\nYou (or someone else) requested a password reset.\n\n` +
        `Click the link below to reset your password:\n${resetUrl}\n\n` +
        `This link will expire in 1 hour.\n\n` +
        `If you didn't request this, please ignore this email.\n\nThank you!`
    );

    return res.json({
      message: "If the email exists, a password reset link has been sent",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// reset password
router.post("/reset-password", async (req, res) => {
  try {
    const { error, value } = resetPasswordSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.details.map((d) => d.message),
      });
    }

    const { token, newPassword } = value;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;

    await user.save();

    return res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
