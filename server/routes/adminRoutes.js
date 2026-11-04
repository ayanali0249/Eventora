const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const {
    getPlatformStats,
    getAllUsers,
    banUser,
    unbanUser,
    deleteUserAdmin,
    getAllVendorsAdmin,
    toggleFeatureVendor,
    deleteVendorAdmin,
    getAllBookingsAdmin,
    adminCancelBooking,
    getUserDetail,
    setVendorStatus,
    getBookingDetailAdmin,
    getAllReviewsAdmin,
    getAuditLog
} = require("../controllers/adminController");

// Every route here is admin-only. requireRole("admin") runs AFTER
// authMiddleware, so req.user is guaranteed to be a verified, non-banned
// (authMiddleware itself re-checks is_banned) admin account before any
// handler below runs.
router.use(authMiddleware, requireRole("admin"));

router.get("/stats", getPlatformStats);

router.get("/users", getAllUsers);
router.get("/users/:id", getUserDetail);
router.put("/users/:id/ban", banUser);
router.put("/users/:id/unban", unbanUser);
router.delete("/users/:id", deleteUserAdmin);

router.get("/vendors", getAllVendorsAdmin);
router.put("/vendors/:id/feature", toggleFeatureVendor);
router.put("/vendors/:id/status", setVendorStatus);
router.delete("/vendors/:id", deleteVendorAdmin);

router.get("/bookings", getAllBookingsAdmin);
router.get("/bookings/:id", getBookingDetailAdmin);
router.put("/bookings/:id/cancel", adminCancelBooking);

router.get("/reviews", getAllReviewsAdmin);
router.get("/audit-log", getAuditLog);

module.exports = router;
