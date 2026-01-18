const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

// Auth middleware to validate if the user is authenticated
function authMiddleware(req, res, next) {
  try {
    // Get authorization header
    let authHeader = req.headers.authorization || req.headers.Authorization; // handle case differences
    if (!authHeader) {
      return res
        .status(401)
        .json({ message: "Access denied. No authorization header provided." });
    }

    // Strip "Bearer " prefix if present
    const token = authHeader.replace(/^Bearer\s+/i, ""); // case-insensitive, more robust

    if (!token) {
      return res
        .status(401)
        .json({ message: "Access denied. Invalid token format." });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error); // optional debug
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

module.exports = authMiddleware;
