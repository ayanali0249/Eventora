const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const authMiddleware = async (req, res, next) => {

    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "No token provided"
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // A JWT stays valid for 7 days from login, so a suspended account
        // (server/controllers/adminController.js banUser) needs this live
        // check to actually take effect right away on an existing session,
        // not just block a future login - otherwise "suspend" would only
        // stop new logins and do nothing about one already in progress.
        const userCheck = await pool.query(
            `SELECT is_banned, ban_reason FROM users WHERE id = $1`,
            [decoded.id]
        );

        if (userCheck.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid token"
            });
        }

        if (userCheck.rows[0].is_banned) {
            return res.status(403).json({
                success: false,
                message: userCheck.rows[0].ban_reason
                    ? `Your account has been suspended: ${userCheck.rows[0].ban_reason}`
                    : "Your account has been suspended"
            });
        }

        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            success: false,
            message: "Invalid token"
        });

    }

};

module.exports = authMiddleware;
