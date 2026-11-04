// Version 1 of the Eventora REST API.
//
// Every feature router is registered here ONCE. index.js mounts this single
// router at /api/v1 (the canonical, versioned prefix) and also at the legacy
// unversioned /api prefix, so the same handlers serve both with zero
// duplicated logic. When a breaking change is ever needed, create routes/v2.js
// with the changed routers, mount it at /api/v2, and leave v1 untouched for
// existing clients.
const express = require("express");

const router = express.Router();

router.use("/auth", require("./authRoutes"));
router.use("/vendors", require("./vendorRoutes"));
router.use("/bookings", require("./bookingRoutes"));
router.use("/chat", require("./chatRoutes"));
router.use("/chat-upload", require("./chatUploadRoutes"));
router.use("/reviews", require("./reviewRoutes"));
router.use("/upload", require("./uploadRoutes"));
router.use("/ai-chat", require("./aiChatRoutes"));
router.use("/wishlist", require("./wishlistRoutes"));
router.use("/history", require("./historyRoutes"));
router.use("/notifications", require("./notificationRoutes"));
router.use("/admin", require("./adminRoutes"));
router.use("/planner", require("./plannerRoutes"));

// Liveness check for load balancers / Docker / CI. Public, no DB access, so
// it stays cheap and answers even if the database is down.
router.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "Eventora API is healthy",
        version: "v1",
        uptimeSeconds: Math.round(process.uptime())
    });
});

module.exports = router;
