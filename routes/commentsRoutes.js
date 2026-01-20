// routes/commentsRoutes.js
const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { createCommentSchema } = require("../validation/commentValidator");
const Comment = require("../model/comment"); // ← FIXED: no curly braces, lowercase 'c' in comment

const router = express.Router();

// Create Comment
router.post("/", authMiddleware, async function (req, res) {
  try {
    // Prepare Data
    const userId = req.user.id;
    const data = req.body;

    // Validation
    const { error, value } = createCommentSchema.validate(data, {
      abortEarly: false,
    });

    if (error) {
      return res.status(400).json({
        messages: error.details.map((e) => e.message),
      });
    }

    // Extract Data
    const { postId, text } = value;

    // Create Comment
    const comment = await Comment.create({ text, postId, userId });

    res.status(201).json({
      message: "Comment Added Successfully",
      comment,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error!" });
  }
});

// Update Comment
router.patch("/:id", authMiddleware, async function (req, res) {
  try {
    // Prepare Data
    const id = req.params.id;
    const userId = req.user.id;
    const text = req.body.text;

    // Update Comment - only if owned by current user
    const comment = await Comment.findOneAndUpdate(
      { _id: id, userId }, // must belong to current user
      { text },
      { new: true }
    );

    if (!comment) {
      return res.status(403).json({ message: "Access Denied!" });
    }

    res.json({
      message: "Comment Updated Successfully!",
      comment,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error!" });
  }
});

// Delete Comment
router.delete("/:id", authMiddleware, async function (req, res) {
  try {
    const id = req.params.id;
    const userId = req.user.id;

    const comment = await Comment.findOneAndDelete({ _id: id, userId });

    if (!comment) {
      return res
        .status(403)
        .json({ message: "Access Denied or Comment Not Found!" });
    }

    res.json({ message: "Comment Deleted Successfully!" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error!" });
  }
});

module.exports = router;
