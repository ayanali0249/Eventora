// Restricts a route to specific user role(s). Must run AFTER authMiddleware,
// since it relies on req.user (set by authMiddleware) already being present.
// This was previously missing entirely from the project: any authenticated
// user, regardless of role, could hit vendor-only or customer-only routes.
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({
                success: false,
                message: "Not authenticated"
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `This action is only available to ${allowedRoles.join(" or ")} accounts`
            });
        }

        next();
    };
};

module.exports = requireRole;
