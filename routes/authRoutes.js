const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const otpGenerator = require("otp-generator");

const User = require("../model/user");
const sendEmail = require("../utlies/sendEmail");
const authMiddleware = require("../middleware/authMiddleware");

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
// Simple in-memory rate limit for resend-otp
// key = email, value = last resend timestamp (ms)
// ─────────────────────────────────────────────
const OTP_RESEND_LIMIT_MS = 60 * 1000; // 60 seconds
const resendTimestamps = new Map(); // email → last resend time

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

    const { email, password, name } = value;

    if (await User.exists({ email })) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const otp = generateOTP();

    const user = await User.create({
      ...value,
      password: hashedPassword,
      otp,
      otpExpiry: Date.now() + 10 * 60 * 1000, // 10 minutes
      name,
    });

    await sendEmail(
      email,
      "Your OTP Code",
      `Hello,\n\nYour OTP code is: ${otp}\n\nValid for 10 minutes.\n\nThank you!`
    );

    return res.status(201).json({
      message: "Registration successful. Check your email for OTP.",
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ─────────────────────────────────────────────
// VERIFY OTP
// ─────────────────────────────────────────────
router.post("/verify-otp", async (req, res) => {
  try {
    const { error, value } = verifySchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.details.map((d) => d.message),
      });
    }

    const { email, otp } = value;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User already verified" });
    }

    if (user.otp !== otp || user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return res.json({
      message: "Email verified successfully",
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.details.map((d) => d.message),
      });
    }

    const { email, password } = value;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email first",
        isVerified: false,
        email: user.email,
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ─────────────────────────────────────────────
// RESEND OTP
// ─────────────────────────────────────────────
router.post("/resend-otp", async (req, res) => {
  try {
    const { error, value } = resendOtpSchema.validate(req.body, {
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
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User already verified" });
    }

    const lastResend = resendTimestamps.get(email) || 0;
    if (Date.now() - lastResend < OTP_RESEND_LIMIT_MS) {
      return res.status(429).json({ message: "Please wait before resending" });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    await sendEmail(
      email,
      "Your New OTP Code",
      `Hello,\n\nYour new OTP code is: ${otp}\n\nValid for 10 minutes.\n\nThank you!`
    );

    resendTimestamps.set(email, Date.now());

    return res.json({ message: "New OTP sent to your email" });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
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
      // Don't reveal if email exists
      return res.json({ message: "Password reset link has been sent" });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = Date.now() + 3600000; // 1 hour
    await user.save();

    // SIMPLIFY THIS - No hash, just clean URL
    const resetUrl = `http://localhost:5174/reset-password/${resetToken}`;

    // In FORGOT PASSWORD route, update the sendEmail call:
    await sendEmail(
      email,
      "Password Reset Request",
      `Hello,\n\nClick this link to reset your password: ${resetUrl}\n\nValid for 1 hour.\n\nIf you didn't request this, ignore this email.`,
      // Add simple HTML with hyperlink:
      `<p>Hello,</p>
   <p>Click this link to reset your password: <a href="${resetUrl}">Reset Password</a></p>
   <p><strong>Valid for 1 hour.</strong></p>
   <p>If you didn't request this, ignore this email.</p>`
    );

    // Return token for frontend auto-navigation
    return res.json({
      message: "Password reset link has been sent",
      token: resetToken,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
// ─────────────────────────────────────────────
// RESET PASSWORD
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// GET CURRENT USER (/me)
// ─────────────────────────────────────────────
router.get("/me", authMiddleware, async (req, res) => {
  try {
    // Changed from req.user._id → req.user.id
    // because your JWT payload contains "id" (not "_id")
    const user = await User.findById(req.user.id).select(
      "-password -resetPasswordToken -resetPasswordExpiry -otp -otpExpiry"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Get /me error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
