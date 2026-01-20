// model/post.js
const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    images: [String],
    caption: { type: String, default: "" },
    userId: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    likes: [{ type: mongoose.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

// Prevent model overwrite error
const Post = mongoose.models.Post || mongoose.model("Post", postSchema);

module.exports = Post;
