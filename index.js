// Load environment variables
require("dotenv").config();

// Imports
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

// App init
const app = express();
const PORT = process.env.PORT || 3000;

// Database
const connectDB = require("./config/dbConfig");

// Routes
const authRoutes = require("./routes/authRoutes");

// Middleware
// Parse JSON
app.use(express.json());

// Optional: catch invalid JSON to avoid crashing
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ message: "Invalid JSON" });
  }
  next();
});

// CORS setup
// If PRODUCTION_ORIGIN is set to true in .env, use CLIENT_ORIGIN, else allow all (*)
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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs

});
app.use(limiter);

// Test route
app.get("/", (req, res) => {
  res.send("Hello to our backend server!");
});

// API routes
app.use("/api/auth", authRoutes);

// Start server & connect to DB
app.listen(PORT, () => {
  connectDB()
    .then(() => console.log("Database connected successfully"))
    .catch((err) => console.error("DB connection error:", err));
  console.log(`Server is running on port ${PORT}`);
});
