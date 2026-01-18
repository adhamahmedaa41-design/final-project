const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  // authentication
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  isVerified: { type: Boolean, default: false },
  otp: { type: String, maxlength: 6 },
  otpExpiry: { type: Date },
  resetPasswordToken: { type: String },
  resetPasswordExpiry: { type: Date },

  // profile
  name: { type: String, required: true },
  profilepic: { type: String, default: "/public/default.png" },
  bio: { type: String, default: "" },
});

module.exports = mongoose.model("User", UserSchema);
