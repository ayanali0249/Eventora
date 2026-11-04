const pool = require("../config/db");

// GET CHAT HISTORY
// FIXED: this endpoint previously had no auth at all - anyone who knew or
// guessed a room id could read a full conversation. It now requires login
// (see chatRoutes.js) and, for the standard "chat-v{vendorId}-c{customerId}"
// room format, verifies the requester is actually one of the two
// participants before returning any messages.
const getMessages = async (req, res) => {

    try {

        const { roomId } = req.params;

        const match = roomId.match(/^chat-v(\d+)-c(\d+)$/);

        if (match) {
            const vendorIdInRoom = Number(match[1]);
            const customerIdInRoom = Number(match[2]);

            const isCustomer = req.user.id === customerIdInRoom;

            let isVendorOwner = false;
            if (!isCustomer) {
                const vendorOwner = await pool.query(
                    "SELECT user_id FROM vendors WHERE id = $1",
                    [vendorIdInRoom]
                );
                isVendorOwner = vendorOwner.rows[0]?.user_id === req.user.id;
            }

            if (!isCustomer && !isVendorOwner) {
                return res.status(403).json({
                    success: false,
                    message: "You are not a participant in this conversation"
                });
            }
        }

        const result = await pool.query(

            `
            SELECT *
            FROM messages
            WHERE room_id = $1
            ORDER BY created_at ASC
            `,

            [roomId]

        );

        res.status(200).json({

            success: true,

            messages: result.rows

        });

    } catch (error) {

        console.log(
            "CHAT ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Something went wrong. Please try again."
        });

    }

};

// GET MY CONVERSATIONS (chat sidebar list)
// Works for both roles: a customer sees the vendors they've messaged, a
// vendor sees the customers who've messaged them. Everything is derived
// from the messages table by parsing the "chat-v{vendorId}-c{customerId}"
// room id convention - no separate "conversations" table needed.
const getConversations = async (req, res) => {

    try {

        const userId = req.user.id;
        const role = req.user.role;

        const parsedCTE = `
            WITH parsed AS (
                SELECT
                    id, room_id, sender_id, message, file_url, seen, created_at,
                    CAST(substring(room_id FROM 'chat-v(\\d+)-c\\d+') AS INTEGER) AS vendor_id,
                    CAST(substring(room_id FROM 'chat-v\\d+-c(\\d+)') AS INTEGER) AS customer_id
                FROM messages
                WHERE room_id ~ '^chat-v\\d+-c\\d+$'
            )
        `;

        if (role === "customer") {

            const result = await pool.query(

                `${parsedCTE}
                , mine AS (
                    SELECT * FROM parsed WHERE customer_id = $1
                )
                , latest AS (
                    SELECT DISTINCT ON (vendor_id)
                        vendor_id, room_id, message, file_url, created_at
                    FROM mine
                    ORDER BY vendor_id, created_at DESC
                )
                , unread AS (
                    SELECT vendor_id, COUNT(*) AS unread_count
                    FROM mine
                    WHERE seen = FALSE AND sender_id IS DISTINCT FROM $1
                    GROUP BY vendor_id
                )
                SELECT
                    latest.room_id,
                    v.id AS other_id,
                    v.user_id AS other_user_id,
                    v.business_name AS other_name,
                    v.portfolio_image AS other_image,
                    v.category AS other_subtitle,
                    latest.message AS last_message,
                    latest.file_url AS last_file_url,
                    latest.created_at AS last_message_at,
                    COALESCE(unread.unread_count, 0) AS unread_count
                FROM latest
                JOIN vendors v ON v.id = latest.vendor_id
                LEFT JOIN unread ON unread.vendor_id = latest.vendor_id
                ORDER BY latest.created_at DESC`,

                [userId]

            );

            return res.json({ success: true, conversations: result.rows });

        }

        if (role === "vendor") {

            const vendorRow = await pool.query(
                "SELECT id FROM vendors WHERE user_id = $1",
                [userId]
            );

            if (vendorRow.rows.length === 0) {
                return res.json({ success: true, conversations: [] });
            }

            const myVendorId = vendorRow.rows[0].id;

            const result = await pool.query(

                `${parsedCTE}
                , mine AS (
                    SELECT * FROM parsed WHERE vendor_id = $1
                )
                , latest AS (
                    SELECT DISTINCT ON (customer_id)
                        customer_id, room_id, message, file_url, created_at
                    FROM mine
                    ORDER BY customer_id, created_at DESC
                )
                , unread AS (
                    SELECT customer_id, COUNT(*) AS unread_count
                    FROM mine
                    WHERE seen = FALSE AND sender_id IS DISTINCT FROM $2
                    GROUP BY customer_id
                )
                SELECT
                    latest.room_id,
                    u.id AS other_id,
                    u.id AS other_user_id,
                    u.name AS other_name,
                    u.profile_image AS other_image,
                    NULL AS other_subtitle,
                    latest.message AS last_message,
                    latest.file_url AS last_file_url,
                    latest.created_at AS last_message_at,
                    COALESCE(unread.unread_count, 0) AS unread_count
                FROM latest
                JOIN users u ON u.id = latest.customer_id
                LEFT JOIN unread ON unread.customer_id = latest.customer_id
                ORDER BY latest.created_at DESC`,

                [myVendorId, userId]

            );

            return res.json({ success: true, conversations: result.rows });

        }

        res.json({ success: true, conversations: [] });

    } catch (error) {

        console.log("CONVERSATIONS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });

    }

};

module.exports = {
    getMessages,
    getConversations
};