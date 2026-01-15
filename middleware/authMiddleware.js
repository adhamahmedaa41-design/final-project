const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config(); 

// Auth middleware to validate if the user is authenticated
function authMiddleware(req, res, next) {
  // validate headers
  try {
    const auth = req.header("Authorization")?.replace("Bearer ", "");
    if (!auth) {
      return res
        .status(401)
        .json({ message: "Access denied. No token provided." });
    }
    // validate token
    const token = auth.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ message: "Access denied. No token provided." });
    }
    // verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token." });
  }
}
module.exports = authMiddleware;
