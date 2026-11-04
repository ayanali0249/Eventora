const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const {
    createBooking,
    getVendorBookings,
    updateBookingStatus,
    updateBookingStatusByCustomer,
    proposeReschedule,
    respondToReschedule,
    getBookingHistory,
    getCustomerBookings
} = require("../controllers/bookingController");


// CREATE BOOKING (customers only)
router.post(
    "/create",
    authMiddleware,
    requireRole("customer"),
    createBooking
);


// GET VENDOR BOOKINGS (vendors only)
router.get(
    "/vendor",
    authMiddleware,
    requireRole("vendor"),
    getVendorBookings
);


// UPDATE BOOKING STATUS - VENDOR SIDE (approve / reject / cancel / complete)
router.put(
    "/:bookingId/status",
    authMiddleware,
    requireRole("vendor"),
    updateBookingStatus
);

// UPDATE BOOKING STATUS - CUSTOMER SIDE (confirm / cancel)
router.put(
    "/:bookingId/customer-status",
    authMiddleware,
    requireRole("customer"),
    updateBookingStatusByCustomer
);

// GET CUSTOMER BOOKINGS (customers only)
router.get(
    "/customer",
    authMiddleware,
    requireRole("customer"),
    getCustomerBookings
);

// RESCHEDULE: either participant can propose a new date, and the OTHER
// participant accepts/declines it. No requireRole here on purpose - the
// controller itself verifies the requester is a real participant in this
// specific booking (resolveParticipant), which is what actually matters.
router.post(
    "/:bookingId/reschedule",
    authMiddleware,
    proposeReschedule
);

router.put(
    "/:bookingId/reschedule/respond",
    authMiddleware,
    respondToReschedule
);

// AUDIT TRAIL (either participant)
router.get(
    "/:bookingId/history",
    authMiddleware,
    getBookingHistory
);

module.exports = router;
