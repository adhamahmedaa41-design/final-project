// routes/profileRoutes.js  (or wherever you want to put it)
const express = require("express");
const router = express.Router();
const User = require("../model/user"); // adjust path if needed
const authMiddleware = require("../middleware/authMiddleware");
const { upload } = require("../upload"); // adjust path to your multer config

// PUT /profile/update-avatar   (more descriptive name recommended)
router.put(
  "/update-avatar",
  authMiddleware,
  upload.single("avatar"), // 'avatar' = field name from frontend form
  async (req, res) => {
    try {
      // 1. Get authenticated user
      const user = await User.findById(req.user.id).select("+profilepic"); // if you excluded it

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

      // 3. Optional: delete old picture if exists (to save disk space)
      // if (user.profilepic && user.profilepic !== '') {
      //   const oldPath = path.join(__dirname, '..', user.profilepic);
      //   if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      // }

      // 4. Save new path (you can also store just filename)
     const avatarPath = `/uploads/${req.file.filename}`;
     user.picture = avatarPath; // e.g. "uploads/16987654321-profile.jpg"
      // or just filename: req.file.filename

      user.profilepic = avatarPath; // ← make sure your schema field is called profilepic (not picture)
      await user.save();

      // 5. Return useful response
      return res.json({
        success: true,
        message: "Profile picture updated successfully",
        avatar: avatarPath,
        // Optional: return full user or selected fields
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          profilepic: user.profilepic,
        },
      });
    } catch (error) {
      console.error("Avatar update error:", error);

      return res.status(500).json({
        success: false,
        message: "Server error while updating profile picture",
      });
    }
  }
);

module.exports = router;
