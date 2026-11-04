const jwt = require("jsonwebtoken");

// Like authMiddleware, but never blocks the request. Some routes (public
// vendor profile pages) must work for logged-out visitors, while still
// wanting to know WHO is viewing when a valid token is present - e.g. so a
// vendor viewing their own public profile doesn't inflate their own
// "Profile Views" counter. If a token is missing, expired or invalid, this
// just leaves req.user undefined and continues; it never returns 401.
const optionalAuth = (req, res, next) => {

    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return next();
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;

    } catch (error) {

        // Invalid/expired token on a public route - just treat as a guest
        // rather than failing the request.

    }

    next();

};

module.exports = optionalAuth;
