const pool = require("../config/db");

// ADD TO WISHLIST
const addToWishlist = async (req, res) => {

    try {

        const customerId = req.user.id;
        const { vendor_id } = req.body;

        if (!vendor_id) {
            return res.status(400).json({
                success: false,
                message: "vendor_id is required"
            });
        }

        const vendorCheck = await pool.query(
            "SELECT id FROM vendors WHERE id = $1",
            [vendor_id]
        );

        if (vendorCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Vendor not found"
            });
        }

        // ON CONFLICT DO NOTHING makes this idempotent - calling it twice
        // for the same vendor is a harmless no-op, not a duplicate/error.
        const result = await pool.query(
            `INSERT INTO wishlists (customer_id, vendor_id)
             VALUES ($1, $2)
             ON CONFLICT (customer_id, vendor_id) DO NOTHING
             RETURNING *`,
            [customerId, vendor_id]
        );

        res.status(201).json({
            success: true,
            message: "Added to wishlist",
            alreadySaved: result.rows.length === 0
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });

    }

};

// REMOVE FROM WISHLIST
const removeFromWishlist = async (req, res) => {

    try {

        const customerId = req.user.id;
        const { vendorId } = req.params;

        await pool.query(
            "DELETE FROM wishlists WHERE customer_id = $1 AND vendor_id = $2",
            [customerId, vendorId]
        );

        res.json({
            success: true,
            message: "Removed from wishlist"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });

    }

};

// GET MY WISHLIST (full vendor cards, same shape the browse page uses)
const getWishlist = async (req, res) => {

    try {

        const customerId = req.user.id;

        const result = await pool.query(
            `SELECT
                vendors.*,
                COALESCE(AVG(reviews.rating), 0)::numeric(2,1) AS avg_rating,
                COUNT(DISTINCT reviews.id) AS review_count,
                wishlists.created_at AS saved_at
            FROM wishlists
            JOIN vendors ON vendors.id = wishlists.vendor_id
            LEFT JOIN reviews ON reviews.vendor_id = vendors.id
            WHERE wishlists.customer_id = $1
              AND vendors.is_active = TRUE
            GROUP BY vendors.id, wishlists.created_at
            ORDER BY wishlists.created_at DESC`,
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

// GET JUST THE IDS (lightweight - lets the browse/vendor-details pages
// know which vendors are already saved, without fetching full records)
const getWishlistIds = async (req, res) => {

    try {

        const customerId = req.user.id;

        const result = await pool.query(
            "SELECT vendor_id FROM wishlists WHERE customer_id = $1",
            [customerId]
        );

        res.json({
            success: true,
            vendorIds: result.rows.map((row) => row.vendor_id)
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
    addToWishlist,
    removeFromWishlist,
    getWishlist,
    getWishlistIds
};
