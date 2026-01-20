// routes/postsRoutes.js
const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { upload } = require("../upload");
const Post = require("../model/post"); // ← FIXED: no { }
const Comment = require("../model/comment"); // ← FIXED: no { }, lowercase 'c'

const router = express.Router();

// Create Post
router.post(
  "/create",
  authMiddleware,
  upload.array("images", 5),
  async function (req, res) {
    try {
      const images = req.files.map((file) => `/uploads/${file.filename}`);
      const caption = req.body.caption;
      const userId = req.user.id;

      const post = await Post.create({ images, caption, userId });

      res.status(201).json({ message: "Post Created Successfully", post });
    } catch (error) {
      console.log("Error creating post:", error);
      res.status(500).json({ message: "Internal Server Error!" });
    }
  }
);

// Get All Posts WITH COMMENT COUNTS
router.get("/", async function (req, res) {
  try {
    const posts = await Post.find()
      .populate("userId", "name profilePic")
      .sort({ createdAt: -1 });

    // Add comment count to each post
    const postsWithCounts = await Promise.all(
      posts.map(async (post) => {
        const commentCount = await Comment.countDocuments({ postId: post._id });
        return {
          ...post.toObject(),
          commentsCount: commentCount,
        };
      })
    );

    res.json({ message: "Posts Fetched Successfully", posts: postsWithCounts });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error!" });
  }
});

// Like - Dislike Post
router.put("/:id/like", authMiddleware, async function (req, res) {
  try {
    const id = req.params.id;
    const post = await Post.findById(id).populate("userId", "name profilePic");

    if (!post) return res.status(404).json({ message: "Post Not Found!" });

    const userId = req.user.id;
    const userExist = post.likes.includes(userId);

    if (userExist) {
      post.likes = post.likes.filter((id) => id != userId);
    } else {
      post.likes.push(userId);
    }

    await post.save();

    // Add comment count to the response
    const commentCount = await Comment.countDocuments({ postId: post._id });
    const postWithCount = {
      ...post.toObject(),
      commentsCount: commentCount,
    };

    res.json({ post: postWithCount, likes: post.likes.length });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error!" });
  }
});

// Get All Comments Per Post
router.get("/:id/comments", async function (req, res) {
  try {
    const id = req.params.id;

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