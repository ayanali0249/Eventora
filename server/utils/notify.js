const pool = require("../config/db");

// Every real event in the app that should notify a user goes through this
// one function: it writes a permanent row (so the Notification Center has
// real history and survives refresh/logout/relogin) and, when a live
// Socket.io server instance is passed in, pushes it instantly to that
// user's personal `user-{id}` room - the same room convention the chat
// system already uses for its "conversation updated" pings.
//
// `isRead` lets a caller create an already-read notification (used for a
// chat message when the recipient currently has that exact conversation
// open - we still want the permanent record, just without bumping their
// unread badge or popping a toast for something they're already looking
// at).
async function createNotification(io, {
    userId,
    type,
    title,
    message = null,
    link = null,
    relatedBookingId = null,
    isRead = false
}) {

    try {

        const result = await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, link, related_booking_id, is_read)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [userId, type, title, message, link, relatedBookingId, isRead]
        );

        const notification = result.rows[0];

        if (io) {
            io.to(`user-${userId}`).emit("new_notification", notification);
        }

        return notification;

    } catch (error) {

        // A notification failing to write should never break the booking/
        // chat/review action that triggered it - log and move on.
        console.log("Failed to create notification:", error.message);
        return null;

    }

}

module.exports = { createNotification };
