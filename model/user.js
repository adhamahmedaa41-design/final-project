const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    // authentication
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isVerified: { type: Boolean, default: false },
    otp: { type: String, maxlength: 6 },
    otpExpiry: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpiry: { type: Date },

    // profile - FIX: Changed 'profilepic' to 'profilePic' (camelCase consistency)
    name: { type: String, required: true },
    profilePic: { type: String, default: "/uploads/default.png" }, // Fixed field name
    bio: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
