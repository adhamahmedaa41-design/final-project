// check role of user
function roleMiddleware(allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: "Access denied." });
    }
    const isexists = allowedRoles.includes(userRole);
    if (!isexists) {
      return res.status(403).json({ message: "Access denied." });
    }
    next();
  };
}
module.exports = roleMiddleware;