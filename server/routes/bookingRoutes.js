const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
    createBooking,
    getVendorBookings,
    updateBookingStatus,
    getCustomerBookings
} = require("../controllers/bookingController");


// CREATE BOOKING
router.post(
    "/create",
    authMiddleware,
    createBooking
);


// GET VENDOR BOOKINGS
router.get(
    "/vendor",
    authMiddleware,
    getVendorBookings
);


// UPDATE BOOKING STATUS
router.put(
    "/:bookingId/status",
    authMiddleware,
    updateBookingStatus
);

router.get(
    "/customer",
    authMiddleware,
    getCustomerBookings
);

module.exports = router;