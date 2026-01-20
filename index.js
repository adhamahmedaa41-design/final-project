require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const profileRoutes = require("./routes/usersRoutes");
const connectDB = require("./config/dbConfig");
const authRoutes = require("./routes/authRoutes");
const commentsRoutes = require("./routes/commentsRoutes");
const postsRoutes = require("./routes/postsRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = "./uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// REMOVED: Duplicate multer config - using the one from upload.js instead
// Only keep this if you need a simple upload for the /api/upload route
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

app.use(express.json());

let corsOrigin = "*";
try {
  const isProd = JSON.parse(process.env.PRODUCTION_ORIGIN || "false");
  corsOrigin = isProd ? process.env.CLIENT_ORIGIN : "*";
} catch (err) {
  console.warn(
    "PRODUCTION_ORIGIN env variable is not valid JSON. Defaulting to *."
  );
}
app.use(cors({ origin: corsOrigin }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// Debug middleware loading
console.log("=== DEBUG: Checking authMiddleware ===");
try {
  const auth = require("./middleware/authMiddleware");
  console.log("✅ authMiddleware loaded successfully");
  console.log("Exports:", Object.keys(auth));
} catch (err) {
  console.error("❌ Error loading authMiddleware:", err.message);
}

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/comments", commentsRoutes);

// Simple file upload route (using the simple multer config)
app.post("/api/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    res.json({
      message: "File uploaded successfully",
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: `/uploads/${req.file.filename}`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res
      .status(500)
      .json({ message: "File upload failed", error: error.message });
  }
});

// Serve static files
app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// User profile routes
app.use("/api/users", profileRoutes);

// Root route
app.get("/", (req, res) => {
  res.json({ message: "API Server is running 🟢" });
});

// JSON parse error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ message: "Invalid JSON" });
  }
  next(err);
});

// Error handler for multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ message: "File too large. Max size is 5MB" });
    }
    return res.status(400).json({ message: err.message });
  }
  next(err);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB()
    .then(() => console.log("Database connected successfully"))
    .catch((err) => console.error("DB connection error:", err));
});
