// routes/usersRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require("../model/user");
const authMiddleware = require("../middleware/authMiddleware");

// Ensure uploads directory exists
const uploadsDir = "./uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure Multer for profile pictures
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const userId = req.user.id;
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${userId}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files (jpeg, jpg, png, gif) are allowed"));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: fileFilter,
});

// PUT /api/users/update-avatar
router.put(
  "/update-avatar",
  authMiddleware,
  upload.single("avatar"),
  async (req, res) => {
    try {
      // 1. Get authenticated user
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // 2. Check if file was actually uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No avatar file uploaded",
        });
      }

      // 3. Save new path
      const avatarPath = `/uploads/${req.file.filename}`;
      user.profilepic = avatarPath;
      await user.save();

      // 4. Return user data without sensitive info
      const userResponse = {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
        profilepic: user.profilepic,
        bio: user.bio,
      };

      return res.json({
        success: true,
        message: "Profile picture updated successfully",
        avatar: avatarPath,
        user: userResponse,
      });
    } catch (error) {
      console.error("Avatar update error:", error);

      // Handle multer errors
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File too large. Maximum size is 2MB",
        });
      }

      if (error.message.includes("Only image files")) {
        return res.status(400).json({
          success: false,
          message: "Only image files (jpeg, jpg, png, gif) are allowed",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Server error while updating profile picture",
        error: error.message,
      });
    }
  }
);

// PUT /api/users/update-profile
router.put("/update-profile", authMiddleware, async (req, res) => {
  try {
    const { name, bio } = req.body;

    // Validate input
    if (!name && !bio) {
      return res.status(400).json({
        success: false,
        message: "At least one field (name or bio) must be provided",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update fields if provided
    if (name !== undefined) user.name = name;
    if (bio !== undefined) user.bio = bio;

    await user.save();

    const userResponse = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      isVerified: user.isVerified,
      profilepic: user.profilepic,
      bio: user.bio,
    };

    return res.json({
      success: true,
      message: "Profile updated successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating profile",
      error: error.message,
    });
  }
});

// GET /api/users/profile
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -otp -otpExpiry -resetPasswordToken -resetPasswordExpiry"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
        profilepic: user.profilepic,
        bio: user.bio,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching profile",
      error: error.message,
    });
  }
});

module.exports = router;
