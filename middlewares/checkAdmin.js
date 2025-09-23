const jwt = require("jsonwebtoken");
const User = require("../models/user");


function checkAdmin(req, res, next) {
    // req.user should already be set by checkForAuthentication middleware
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admins only" });
    }

    // user is admin, allow next middleware/controller
    next();
}

module.exports = { checkAdmin };
