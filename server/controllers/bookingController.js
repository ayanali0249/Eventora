const pool = require("../config/db");
const { createNotification } = require("../utils/notify");
const { isDateTakenForVendor } = require("../utils/availability");

// Records one row in the audit trail every time a booking's status (or a
// reschedule decision) changes, so both sides can see a real timeline
// instead of just "current status". Never blocks the main transaction's
// response if it fails - it's a nice-to-have audit log, not the source of
// truth (booking_status on the row itself is).
async function logStatusHistory(bookingId, status, role, note = null) {
    try {
        await pool.query(
            `INSERT INTO booking_status_history (booking_id, status, changed_by_role, note)
             VALUES ($1, $2, $3, $4)`,
            [bookingId, status, role, note]
        );
    } catch (error) {
        console.log("Failed to write booking status history:", error.message);
    }
}

// Resolves which booking a user is allowed to touch, AND which role
// ("customer" or "vendor") they hold on THAT SPECIFIC booking - derived
// from the authenticated JWT (req.user.id), never trusted from the request
// body. Returns { booking, role } or { booking: null, role: null } when the
// booking doesn't exist or this user isn't a participant in it.
async function resolveParticipant(bookingId, userId) {

    const result = await pool.query(
        `SELECT bookings.*, vendors.user_id AS vendor_user_id, vendors.business_name,
                customers.name AS customer_name
         FROM bookings
         JOIN vendors ON bookings.vendor_id = vendors.id
         JOIN users customers ON bookings.customer_id = customers.id
         WHERE bookings.id = $1`,
        [bookingId]
    );

    if (result.rows.length === 0) {
        return { booking: null, role: null };
    }

    const booking = result.rows[0];

    if (booking.customer_id === userId) {
        return { booking, role: "customer" };
    }

    if (booking.vendor_user_id === userId) {
        return { booking, role: "vendor" };
    }

    return { booking, role: null };

}

const TERMINAL_STATUSES = ["completed", "rejected", "cancelled"];

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

        // Validate required fields
        if (!vendor_id || !event_date || !event_type) {
            return res.status(400).json({
                success: false,
                message: "Vendor, event date and event type are required"
            });
        }

        // Event date must not be in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(event_date) < today) {
            return res.status(400).json({
                success: false,
                message: "Event date cannot be in the past"
            });
        }

        // Guest count, if provided, must be a positive number
        if (guest_count !== undefined && guest_count !== null && guest_count !== "") {
            const guestCountNum = Number(guest_count);
            if (!Number.isFinite(guestCountNum) || guestCountNum <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Guest count must be a positive number"
                });
            }
        }

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

        // A listing an admin has deactivated can't take new requests (its
        // existing bookings are untouched - see adminController).
        if (vendorCheck.rows[0].is_active === false) {
            return res.status(400).json({
                success: false,
                message: "This vendor is not accepting bookings right now"
            });
        }

        // A vendor cannot book their own business
        if (vendorCheck.rows[0].user_id === customerId) {
            return res.status(400).json({
                success: false,
                message: "You cannot book your own vendor profile"
            });
        }

        // No double-booking: refuse a request for a date the vendor is
        // already locked into elsewhere (a CONFIRMED booking) or has
        // blocked off themselves. A date with only PENDING/APPROVED
        // requests from other customers isn't blocked here - those aren't
        // commitments yet, so the vendor can still choose between them;
        // see server/utils/availability.js for why CONFIRMED is the only
        // status that counts.
        if (await isDateTakenForVendor(vendor_id, event_date)) {
            return res.status(409).json({
                success: false,
                message: "This vendor is already booked on that date. Please choose a different date."
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

        const booking = bookingResult.rows[0];

        await logStatusHistory(booking.id, "pending", "customer", "Booking request sent");

        await createNotification(req.app.get("io"), {
            userId: vendorCheck.rows[0].user_id,
            type: "booking_request",
            title: `New booking request from ${req.user.name}`,
            message: `${event_type} on ${new Date(event_date).toLocaleDateString()}`,
            link: "/vendor-dashboard",
            relatedBookingId: booking.id
        });

        res.status(201).json({
            success: true,
            message: "Booking request sent",
            booking
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
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
            message: "Something went wrong. Please try again."
        });

    }

};

// VENDOR-SIDE STATUS TRANSITIONS
// pending -> approved | rejected
// approved -> cancelled
// confirmed -> completed | cancelled
const updateBookingStatus = async (req, res) => {

    try {

        const userId = req.user.id;

        const { bookingId } = req.params;

        const { status, reason } = req.body;

        const allowedStatuses = ["approved", "rejected", "completed", "cancelled"];

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
            `SELECT * FROM bookings WHERE id = $1 AND vendor_id = $2`,
            [bookingId, vendorId]
        );

        if (bookingCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        const currentStatus = bookingCheck.rows[0].booking_status;

        if (TERMINAL_STATUSES.includes(currentStatus)) {
            return res.status(400).json({
                success: false,
                message: `This booking is already ${currentStatus} and cannot be changed`
            });
        }

        // Explicit allowed transition map for the vendor side
        const validTransitions = {
            approved: ["pending"],
            rejected: ["pending"],
            cancelled: ["pending", "approved", "confirmed"],
            completed: ["confirmed"]
        };

        if (!validTransitions[status].includes(currentStatus)) {

            const friendlyRequirement = status === "completed"
                ? "Only a confirmed booking can be marked as completed - the customer needs to confirm it first"
                : `A booking must be "${validTransitions[status].join('" or "')}" to become "${status}"`;

            return res.status(400).json({
                success: false,
                message: friendlyRequirement
            });
        }

        if (status === "cancelled" && (!reason || !reason.trim())) {
            return res.status(400).json({
                success: false,
                message: "Please provide a reason for cancelling this booking"
            });
        }

        const setClauses = ["booking_status = $1"];
        const values = [status];

        if (status === "cancelled") {
            setClauses.push(`cancelled_by = 'vendor'`, `cancellation_reason = $${values.length + 1}`, `cancelled_at = NOW()`);
            values.push(reason.trim());
        }

        if (status === "completed") {
            setClauses.push("completed_at = NOW()");
        }

        values.push(bookingId);

        const updatedBooking = await pool.query(
            `UPDATE bookings SET ${setClauses.join(", ")} WHERE id = $${values.length} RETURNING *`,
            values
        );

        await logStatusHistory(
            bookingId,
            status,
            "vendor",
            status === "cancelled" ? reason.trim() : null
        );

        const businessName = vendorResult.rows[0].business_name;
        const customerId = bookingCheck.rows[0].customer_id;

        const NOTIFY_CUSTOMER = {
            approved: {
                type: "booking_approved",
                title: `${businessName} accepted your booking request`,
                message: "Confirm it from your dashboard to lock it in."
            },
            rejected: {
                type: "booking_rejected",
                title: `${businessName} declined your booking request`
            },
            completed: {
                type: "booking_completed",
                title: `Your event with ${businessName} is marked completed`,
                message: "You can now leave a review."
            },
            cancelled: {
                type: "booking_cancelled",
                title: `${businessName} cancelled your booking`,
                message: reason ? reason.trim() : null
            }
        };

        await createNotification(req.app.get("io"), {
            userId: customerId,
            link: "/dashboard",
            relatedBookingId: Number(bookingId),
            ...NOTIFY_CUSTOMER[status]
        });

        res.status(200).json({
            success: true,
            message: `Booking ${status}`,
            booking: updatedBooking.rows[0]
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });

    }

};

// CUSTOMER-SIDE STATUS TRANSITIONS
// approved -> confirmed (the customer locking in a vendor-accepted booking)
// pending | approved | confirmed -> cancelled
const updateBookingStatusByCustomer = async (req, res) => {

    try {

        const customerId = req.user.id;

        const { bookingId } = req.params;

        const { status, reason } = req.body;

        const allowedStatuses = ["confirmed", "cancelled"];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking status"
            });
        }

        const bookingCheck = await pool.query(
            `SELECT * FROM bookings WHERE id = $1 AND customer_id = $2`,
            [bookingId, customerId]
        );

        if (bookingCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        const currentStatus = bookingCheck.rows[0].booking_status;

        if (TERMINAL_STATUSES.includes(currentStatus)) {
            return res.status(400).json({
                success: false,
                message: `This booking is already ${currentStatus} and cannot be changed`
            });
        }

        const validTransitions = {
            confirmed: ["approved"],
            cancelled: ["pending", "approved", "confirmed"]
        };

        if (!validTransitions[status].includes(currentStatus)) {
            return res.status(400).json({
                success: false,
                message: status === "confirmed"
                    ? "Only a vendor-approved booking can be confirmed"
                    : `A booking must be "${validTransitions[status].join('" or "')}" to become "${status}"`
            });
        }

        // This is the actual lock-in moment (approved -> confirmed), so it's
        // the authoritative place to catch a double-booking: two customers
        // could both have gotten "approved" for the same date before either
        // confirmed, and only the first to actually confirm should win.
        // Re-checks against the vendor's OTHER bookings (excluding this one)
        // since this booking's own event_date obviously isn't a conflict
        // with itself.
        if (status === "confirmed") {

            const eventDateStr = bookingCheck.rows[0].event_date.toISOString
                ? bookingCheck.rows[0].event_date.toISOString().split("T")[0]
                : bookingCheck.rows[0].event_date;

            if (await isDateTakenForVendor(bookingCheck.rows[0].vendor_id, eventDateStr, bookingId)) {
                return res.status(409).json({
                    success: false,
                    message: "This vendor already has a confirmed booking on this date. Please propose a new date before confirming."
                });
            }

        }

        if (status === "cancelled" && (!reason || !reason.trim())) {
            return res.status(400).json({
                success: false,
                message: "Please provide a reason for cancelling this booking"
            });
        }

        const setClauses = ["booking_status = $1"];
        const values = [status];

        if (status === "cancelled") {
            setClauses.push(`cancelled_by = 'customer'`, `cancellation_reason = $${values.length + 1}`, `cancelled_at = NOW()`);
            values.push(reason.trim());
        }

        if (status === "confirmed") {
            setClauses.push("confirmed_at = NOW()");
        }

        values.push(bookingId);

        const updatedBooking = await pool.query(
            `UPDATE bookings SET ${setClauses.join(", ")} WHERE id = $${values.length} RETURNING *`,
            values
        );

        await logStatusHistory(
            bookingId,
            status,
            "customer",
            status === "cancelled" ? reason.trim() : null
        );

        const vendorOwner = await pool.query(
            `SELECT user_id FROM vendors WHERE id = $1`,
            [updatedBooking.rows[0].vendor_id]
        );

        const NOTIFY_VENDOR = {
            confirmed: {
                type: "booking_confirmed",
                title: `${req.user.name} confirmed their booking`,
                message: "It's locked in on your calendar."
            },
            cancelled: {
                type: "booking_cancelled",
                title: `${req.user.name} cancelled their booking`,
                message: reason ? reason.trim() : null
            }
        };

        if (vendorOwner.rows.length > 0) {
            await createNotification(req.app.get("io"), {
                userId: vendorOwner.rows[0].user_id,
                link: "/vendor-dashboard",
                relatedBookingId: Number(bookingId),
                ...NOTIFY_VENDOR[status]
            });
        }

        res.status(200).json({
            success: true,
            message: status === "confirmed" ? "Booking confirmed" : "Booking cancelled",
            booking: updatedBooking.rows[0]
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });

    }

};

// PROPOSE A NEW EVENT DATE (either participant)
const proposeReschedule = async (req, res) => {

    try {

        const { bookingId } = req.params;
        const { new_date, message } = req.body;

        if (!new_date) {
            return res.status(400).json({
                success: false,
                message: "A new date is required"
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(new_date) < today) {
            return res.status(400).json({
                success: false,
                message: "The proposed date cannot be in the past"
            });
        }

        const { booking, role } = await resolveParticipant(bookingId, req.user.id);

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        if (!role) {
            return res.status(403).json({ success: false, message: "You are not part of this booking" });
        }

        if (TERMINAL_STATUSES.includes(booking.booking_status)) {
            return res.status(400).json({
                success: false,
                message: `This booking is ${booking.booking_status} and cannot be rescheduled`
            });
        }

        const updated = await pool.query(
            `UPDATE bookings
             SET reschedule_proposed_date = $1, reschedule_proposed_by = $2, reschedule_message = $3
             WHERE id = $4
             RETURNING *`,
            [new_date, role, message || null, bookingId]
        );

        await logStatusHistory(
            bookingId,
            booking.booking_status,
            role,
            `Proposed rescheduling to ${new_date}`
        );

        const proposerName = role === "customer" ? booking.customer_name : booking.business_name;
        const recipientUserId = role === "customer" ? booking.vendor_user_id : booking.customer_id;
        const recipientLink = role === "customer" ? "/vendor-dashboard" : "/dashboard";

        await createNotification(req.app.get("io"), {
            userId: recipientUserId,
            type: "reschedule_proposed",
            title: `${proposerName} proposed a new date`,
            message: `New date: ${new Date(new_date).toLocaleDateString()}${message ? ` - "${message}"` : ""}`,
            link: recipientLink,
            relatedBookingId: Number(bookingId)
        });

        res.json({
            success: true,
            message: "Reschedule proposed - waiting for the other side to respond",
            booking: updated.rows[0]
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({ success: false, message: "Something went wrong. Please try again."
        });

    }

};

// RESPOND TO A PENDING RESCHEDULE PROPOSAL (must be the OTHER participant)
const respondToReschedule = async (req, res) => {

    try {

        const { bookingId } = req.params;
        const { action } = req.body; // "accept" | "decline"

        if (!["accept", "decline"].includes(action)) {
            return res.status(400).json({ success: false, message: "Invalid action" });
        }

        const { booking, role } = await resolveParticipant(bookingId, req.user.id);

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        if (!role) {
            return res.status(403).json({ success: false, message: "You are not part of this booking" });
        }

        if (!booking.reschedule_proposed_date) {
            return res.status(400).json({ success: false, message: "There is no pending reschedule request on this booking" });
        }

        if (booking.reschedule_proposed_by === role) {
            return res.status(400).json({
                success: false,
                message: "You proposed this reschedule - waiting for the other side to respond"
            });
        }

        let updated;

        if (action === "accept") {

            // Only a CONFIRMED booking is actually locked onto its date (see
            // server/utils/availability.js), so only moving a confirmed
            // booking's date needs the double-booking check - a pending or
            // approved booking isn't a commitment yet, same as at creation
            // time. The proposed date itself was already validated as
            // "not in the past" when it was proposed; this only re-checks
            // it against the vendor's OTHER confirmed bookings/blackout
            // dates, which could have changed since the proposal was made.
            if (booking.booking_status === "confirmed") {

                const proposedDateStr = booking.reschedule_proposed_date.toISOString
                    ? booking.reschedule_proposed_date.toISOString().split("T")[0]
                    : booking.reschedule_proposed_date;

                if (await isDateTakenForVendor(booking.vendor_id, proposedDateStr, bookingId)) {
                    return res.status(409).json({
                        success: false,
                        message: "The vendor already has a confirmed booking on the proposed date. Ask them to propose a different one."
                    });
                }

            }

            updated = await pool.query(
                `UPDATE bookings
                 SET event_date = reschedule_proposed_date,
                     reschedule_proposed_date = NULL,
                     reschedule_proposed_by = NULL,
                     reschedule_message = NULL
                 WHERE id = $1
                 RETURNING *`,
                [bookingId]
            );

            await logStatusHistory(
                bookingId,
                updated.rows[0].booking_status,
                role,
                `Accepted reschedule to ${updated.rows[0].event_date.toISOString ? updated.rows[0].event_date.toISOString().split("T")[0] : updated.rows[0].event_date}`
            );

        } else {

            updated = await pool.query(
                `UPDATE bookings
                 SET reschedule_proposed_date = NULL,
                     reschedule_proposed_by = NULL,
                     reschedule_message = NULL
                 WHERE id = $1
                 RETURNING *`,
                [bookingId]
            );

            await logStatusHistory(
                bookingId,
                updated.rows[0].booking_status,
                role,
                "Declined the reschedule request"
            );

        }

        const proposerRole = booking.reschedule_proposed_by;
        const proposerUserId = proposerRole === "customer" ? booking.customer_id : booking.vendor_user_id;
        const responderName = role === "customer" ? booking.customer_name : booking.business_name;
        const proposerLink = proposerRole === "customer" ? "/dashboard" : "/vendor-dashboard";

        await createNotification(req.app.get("io"), {
            userId: proposerUserId,
            type: action === "accept" ? "reschedule_accepted" : "reschedule_declined",
            title: action === "accept"
                ? `${responderName} accepted your reschedule`
                : `${responderName} declined your reschedule`,
            message: action === "accept"
                ? `New date: ${new Date(updated.rows[0].event_date).toLocaleDateString()}`
                : null,
            link: proposerLink,
            relatedBookingId: Number(bookingId)
        });

        res.json({
            success: true,
            message: action === "accept" ? "Reschedule accepted" : "Reschedule declined",
            booking: updated.rows[0]
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({ success: false, message: "Something went wrong. Please try again."
        });

    }

};

// FULL AUDIT TRAIL FOR ONE BOOKING (either participant can view it)
const getBookingHistory = async (req, res) => {

    try {

        const { bookingId } = req.params;

        const { booking, role } = await resolveParticipant(bookingId, req.user.id);

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        if (!role) {
            return res.status(403).json({ success: false, message: "You are not part of this booking" });
        }

        const history = await pool.query(
            `SELECT * FROM booking_status_history WHERE booking_id = $1 ORDER BY created_at ASC`,
            [bookingId]
        );

        res.json({ success: true, history: history.rows });

    } catch (error) {

        console.log(error);

        res.status(500).json({ success: false, message: "Something went wrong. Please try again."
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
                vendors.portfolio_image,
                vendors.price_range
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
            message: "Something went wrong. Please try again."
        });

    }

};


module.exports = {
    createBooking,
    getVendorBookings,
    updateBookingStatus,
    updateBookingStatusByCustomer,
    proposeReschedule,
    respondToReschedule,
    getBookingHistory,
    getCustomerBookings
};
