const pool = require("../config/db");

// RECORD A VENDOR VIEW
// Called (fire-and-forget) from the frontend when a customer opens a
// vendor's details page. Upsert keeps one row per (customer, vendor) pair
// so "recently viewed" is naturally deduplicated - viewing the same
// vendor again just bumps it back to the top.
const recordVendorView = async (req, res) => {

    try {

        const customerId = req.user.id;
        const { vendorId } = req.params;

        const vendorCheck = await pool.query(
            "SELECT id FROM vendors WHERE id = $1",
            [vendorId]
        );

        if (vendorCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Vendor not found"
            });
        }

        await pool.query(
            `INSERT INTO vendor_views (customer_id, vendor_id, viewed_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (customer_id, vendor_id)
             DO UPDATE SET viewed_at = NOW()`,
            [customerId, vendorId]
        );

        res.status(201).json({ success: true });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });

    }

};

// GET RECENTLY VIEWED VENDORS
const getRecentlyViewed = async (req, res) => {

    try {

        const customerId = req.user.id;

        const result = await pool.query(
            `SELECT
                vendors.*,
                COALESCE(AVG(reviews.rating), 0)::numeric(2,1) AS avg_rating,
                COUNT(DISTINCT reviews.id) AS review_count,
                vendor_views.viewed_at
            FROM vendor_views
            JOIN vendors ON vendors.id = vendor_views.vendor_id
            LEFT JOIN reviews ON reviews.vendor_id = vendors.id
            WHERE vendor_views.customer_id = $1
              AND vendors.is_active = TRUE
            GROUP BY vendors.id, vendor_views.viewed_at
            ORDER BY vendor_views.viewed_at DESC
            LIMIT 20`,
            [customerId]
        );

        res.json({
            success: true,
            vendors: result.rows
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });

    }

};

// GET RECENTLY CONTACTED VENDORS
// Derived entirely from the messages table (no extra table needed): parses
// the "chat-v{vendorId}-c{customerId}" room id convention to find every
// vendor this customer has an active conversation with, most recent first.
const getRecentlyContacted = async (req, res) => {

    try {

        const customerId = req.user.id;

        const result = await pool.query(
            `WITH parsed AS (
                SELECT
                    CAST(substring(room_id FROM 'chat-v(\\d+)-c\\d+') AS INTEGER) AS vendor_id,
                    CAST(substring(room_id FROM 'chat-v\\d+-c(\\d+)') AS INTEGER) AS customer_id,
                    message,
                    created_at
                FROM messages
                WHERE room_id ~ '^chat-v\\d+-c\\d+$'
            ),
            mine AS (
                SELECT * FROM parsed WHERE customer_id = $1
            ),
            latest AS (
                SELECT DISTINCT ON (vendor_id)
                    vendor_id, message AS last_message, created_at AS last_message_at
                FROM mine
                ORDER BY vendor_id, created_at DESC
            )
            SELECT
                vendors.*,
                COALESCE(AVG(reviews.rating), 0)::numeric(2,1) AS avg_rating,
                COUNT(DISTINCT reviews.id) AS review_count,
                latest.last_message,
                latest.last_message_at
            FROM latest
            JOIN vendors ON vendors.id = latest.vendor_id
            LEFT JOIN reviews ON reviews.vendor_id = vendors.id
            WHERE vendors.is_active = TRUE
            GROUP BY vendors.id, latest.last_message, latest.last_message_at
            ORDER BY latest.last_message_at DESC
            LIMIT 20`,
            [customerId]
        );

        res.json({
            success: true,
            vendors: result.rows
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
    recordVendorView,
    getRecentlyViewed,
    getRecentlyContacted
};
