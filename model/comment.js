// model/comment.js
const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Types.ObjectId, ref: "Post", required: true },
    userId: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

// Prevent model overwrite error (the key fix)
const Comment =
  mongoose.models.Comment || mongoose.model("Comment", commentSchema);

module.exports = Comment; // ← export directly (most common & clean style)
