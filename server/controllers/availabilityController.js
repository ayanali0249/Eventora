const pool = require("../config/db");

// GET A VENDOR'S AVAILABILITY CALENDAR (public - no auth required, same as
// browsing a vendor's public profile. Used both by a customer deciding
// which date to request, and by the vendor's own dashboard to manage their
// calendar.)
//
// Returns every CONFIRMED booking date and every manual blackout date from
// today onward - deliberately not paginated or windowed by month, since a
// real vendor's locked-in dates are sparse enough that fetching the whole
// future range in one call is simpler and cheaper than a per-month round
// trip, and lets the calendar flip months client-side with no extra
// requests. Pending/approved (not-yet-confirmed) bookings are intentionally
// left out - they aren't a real commitment yet (see isDateTakenForVendor),
// and showing them would leak the existence of another customer's
// in-progress negotiation to anyone browsing this vendor's page.
const getVendorAvailability = async (req, res) => {

    try {

        const { id } = req.params;

        const vendorCheck = await pool.query(
            "SELECT id FROM vendors WHERE id = $1",
            [id]
        );

        if (vendorCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Vendor not found"
            });
        }

        const bookedResult = await pool.query(
            `SELECT event_date FROM bookings
             WHERE vendor_id = $1 AND booking_status = 'confirmed' AND event_date >= CURRENT_DATE`,
            [id]
        );

        const blockedResult = await pool.query(
            `SELECT blocked_date, reason FROM vendor_blocked_dates
             WHERE vendor_id = $1 AND blocked_date >= CURRENT_DATE
             ORDER BY blocked_date ASC`,
            [id]
        );

        const toDateStr = (d) => (d.toISOString ? d.toISOString().split("T")[0] : d);

        res.json({
            success: true,
            bookedDates: bookedResult.rows.map((row) => toDateStr(row.event_date)),
            blockedDates: blockedResult.rows.map((row) => ({
                date: toDateStr(row.blocked_date),
                reason: row.reason
            }))
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });

    }

};

// VENDOR BLOCKS OFF A DATE (their own profile only - resolved from the
// authenticated JWT, never trusted from the request body)
const blockDate = async (req, res) => {

    try {

        const userId = req.user.id;
        const { date, reason } = req.body;

        if (!date) {
            return res.status(400).json({
                success: false,
                message: "A date is required"
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(date) < today) {
            return res.status(400).json({
                success: false,
                message: "Cannot block a date in the past"
            });
        }

        const vendorResult = await pool.query(
            "SELECT id FROM vendors WHERE user_id = $1",
            [userId]
        );

        if (vendorResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Vendor profile not found"
            });
        }

        const vendorId = vendorResult.rows[0].id;

        // A date with an existing CONFIRMED booking is already unavailable
        // for a real reason - blocking it too would just be confusing
        // bookkeeping, so this is refused with a clear explanation rather
        // than silently allowed.
        const confirmedConflict = await pool.query(
            `SELECT 1 FROM bookings
             WHERE vendor_id = $1 AND event_date = $2 AND booking_status = 'confirmed'
             LIMIT 1`,
            [vendorId, date]
        );

        if (confirmedConflict.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "You already have a confirmed booking on this date"
            });
        }

        // ON CONFLICT DO NOTHING makes this idempotent - blocking an
        // already-blocked date is a harmless no-op, not a duplicate/error.
        await pool.query(
            `INSERT INTO vendor_blocked_dates (vendor_id, blocked_date, reason)
             VALUES ($1, $2, $3)
             ON CONFLICT (vendor_id, blocked_date) DO NOTHING`,
            [vendorId, date, reason || null]
        );

        res.status(201).json({
            success: true,
            message: "Date blocked"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });

    }

};

// VENDOR REMOVES ONE OF THEIR OWN BLOCKED DATES
const unblockDate = async (req, res) => {

    try {

        const userId = req.user.id;
        const { date } = req.params;

        const vendorResult = await pool.query(
            "SELECT id FROM vendors WHERE user_id = $1",
            [userId]
        );

        if (vendorResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Vendor profile not found"
            });
        }

        const vendorId = vendorResult.rows[0].id;

        const result = await pool.query(
            `DELETE FROM vendor_blocked_dates WHERE vendor_id = $1 AND blocked_date = $2 RETURNING *`,
            [vendorId, date]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "That date isn't blocked"
            });
        }

        res.json({
            success: true,
            message: "Date unblocked"
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
    getVendorAvailability,
    blockDate,
    unblockDate
};
