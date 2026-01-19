// routes/postsRoutes.js
const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { upload } = require("../upload");
const { Post } = require("../model/post");
const { Comment } = require("../model/comment");

const router = express.Router();

// Create Post
router.post(
  "/create",
  authMiddleware,
  upload.array("images", 5),
  async function (req, res) {
    try {
      // Prepare Data => Images and Caption and UserId
      const images = req.files.map((file) => `/uploads/${file.filename}`);
      const caption = req.body.caption;
      const userId = req.user.id;

      // Create Post
      const post = await Post.create({ images, caption, userId });

      res.status(201).json({ message: "Post Created Successfully", post });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal Server Error!" });
    }
  }
);

// Get All Posts
router.get("/", async function (req, res) {
  try {
    // Get All Posts "Latest" + User
    const posts = await Post.find()
      .populate("userId", "name profilePic")
      .sort({ createdAt: -1 });

    res.json({ message: "Posts Fetched Successfully", posts });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error!" });
  }
});

// Like - Dislike Post
router.put("/:id/like", authMiddleware, async function (req, res) {
  try {
    // Get Post
    const id = req.params.id;
    const post = await Post.findById(id).populate("userId", "name profilePic");

    if (!post) return res.status(404).json({ message: "Post Not Found!" });

    // Check User Like Post
    const userId = req.user.id;
    const userExist = post.likes.includes(userId);

    if (userExist) {
      // unlike
      post.likes = post.likes.filter((id) => id != userId);
    } else {
      // like
      post.likes.push(userId);
    }

    // save
    await post.save();

    res.json({ post, likes: post.likes.length });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error!" });
  }
});

// Get All Comments Per Post
router.get("/:id/comments", async function (req, res) {
  try {
    // Get Post Id
    const id = req.params.id;

    // Latest Comments Per Post
    const comments = await Comment.find({ postId: id })
      .populate("userId", "name profilePic")
      .sort({ createdAt: -1 });

    res.json({ message: "Comments Fetched Successfully", comments });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error!" });
  }
});

module.exports = router;
