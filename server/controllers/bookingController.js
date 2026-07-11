const pool = require("../config/db");


// CREATE BOOKING
const createBooking = async (req, res) => {

    try {

        const customerId = req.user.id;

        const {
            vendor_id,
            event_date,
            event_type,
            guest_count,
            message
        } = req.body;

        // Check vendor exists
        const vendorCheck = await pool.query(
            "SELECT * FROM vendors WHERE id = $1",
            [vendor_id]
        );

        if (vendorCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Vendor not found"
            });
        }

        // Create booking
        const bookingResult = await pool.query(
            `INSERT INTO bookings
            (
                customer_id,
                vendor_id,
                event_date,
                event_type,
                guest_count,
                message
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
                customerId,
                vendor_id,
                event_date,
                event_type,
                guest_count,
                message
            ]
        );

        res.status(201).json({
            success: true,
            message: "Booking request sent",
            booking: bookingResult.rows[0]
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

};


// GET VENDOR BOOKINGS
const getVendorBookings = async (req, res) => {

    try {

        const userId = req.user.id;

        // Find vendor profile
        const vendorResult = await pool.query(
            "SELECT * FROM vendors WHERE user_id = $1",
            [userId]
        );

        if (vendorResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Vendor profile not found"
            });
        }

        const vendorId = vendorResult.rows[0].id;

        // Get bookings
        const bookings = await pool.query(
            `
            SELECT 
                bookings.*,
                users.name AS customer_name,
                users.email AS customer_email
            FROM bookings
            JOIN users
            ON bookings.customer_id = users.id
            WHERE bookings.vendor_id = $1
            ORDER BY bookings.created_at DESC
            `,
            [vendorId]
        );

        res.status(200).json({
            success: true,
            count: bookings.rows.length,
            bookings: bookings.rows
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

};


// UPDATE BOOKING STATUS
const updateBookingStatus = async (req, res) => {

    try {

        const userId = req.user.id;

        const { bookingId } = req.params;

        const { status } = req.body;

        // Validate status
        const allowedStatuses = [
            "approved",
            "rejected",
            "completed"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking status"
            });
        }

        // Find vendor profile
        const vendorResult = await pool.query(
            "SELECT * FROM vendors WHERE user_id = $1",
            [userId]
        );

        if (vendorResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Vendor profile not found"
            });
        }

        const vendorId = vendorResult.rows[0].id;

        // Check booking belongs to vendor
        const bookingCheck = await pool.query(
            `
            SELECT * FROM bookings
            WHERE id = $1
            AND vendor_id = $2
            `,
            [bookingId, vendorId]
        );

        if (bookingCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        // Update booking status
        const updatedBooking = await pool.query(
            `
            UPDATE bookings
            SET booking_status = $1
            WHERE id = $2
            RETURNING *
            `,
            [status, bookingId]
        );

        res.status(200).json({
            success: true,
            message: `Booking ${status}`,
            booking: updatedBooking.rows[0]
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

};

const getCustomerBookings = async (req, res) => {

    try {

        const customerId = req.user.id;

        // Get customer bookings
        const bookings = await pool.query(
            `
            SELECT
                bookings.*,
                vendors.business_name,
                vendors.category,
                vendors.city,
                vendors.portfolio_image
            FROM bookings
            JOIN vendors
            ON bookings.vendor_id = vendors.id
            WHERE bookings.customer_id = $1
            ORDER BY bookings.created_at DESC
            `,
            [customerId]
        );

        res.status(200).json({
            success: true,
            count: bookings.rows.length,
            bookings: bookings.rows
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

};


module.exports = {
    createBooking,
    getVendorBookings,
    updateBookingStatus,
    getCustomerBookings
};