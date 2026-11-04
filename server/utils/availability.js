const pool = require("../config/db");

// The single source of truth for "is this vendor unavailable on this date",
// used everywhere a date could turn into (or already is) a real commitment:
// creating a booking request, a customer confirming a vendor-approved
// booking (the actual lock-in moment), accepting a reschedule onto a new
// date, and a vendor adding their own manual blackout day. A date is taken
// when either is true:
//   - the vendor already has a CONFIRMED booking on it (the only booking
//     status this app treats as "locked in" - see schema.sql's note on the
//     bookings lifecycle), or
//   - the vendor has manually blocked it themselves.
// `excludeBookingId` lets a booking ignore its own row when re-checking its
// own (unchanged) date, e.g. re-validating at confirm time.
async function isDateTakenForVendor(vendorId, dateStr, excludeBookingId = null) {

    const bookingConflict = await pool.query(
        `SELECT 1 FROM bookings
         WHERE vendor_id = $1
           AND event_date = $2
           AND booking_status = 'confirmed'
           ${excludeBookingId ? "AND id != $3" : ""}
         LIMIT 1`,
        excludeBookingId ? [vendorId, dateStr, excludeBookingId] : [vendorId, dateStr]
    );

    if (bookingConflict.rows.length > 0) {
        return true;
    }

    const blockConflict = await pool.query(
        `SELECT 1 FROM vendor_blocked_dates WHERE vendor_id = $1 AND blocked_date = $2 LIMIT 1`,
        [vendorId, dateStr]
    );

    return blockConflict.rows.length > 0;

}

module.exports = { isDateTakenForVendor };
