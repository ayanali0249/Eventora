const pool = require("../config/db");
const { createNotification } = require("../utils/notify");

// ADD REVIEW
const addReview = async (req, res) => {
    try {
        const customerId = req.user.id;

        const {

            vendor_id,

            rating,

            review

        } = req.body;

        // Validate inputs
        if (!vendor_id) {
            return res.status(400).json({
                success: false,
                message: "vendor_id is required"
            });
        }

        const ratingNum = Number(rating);
        if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be a whole number between 1 and 5"
            });
        }

        if (!review || !review.trim()) {
            return res.status(400).json({
                success: false,
                message: "Please write a short review"
            });
        }

        // Only a customer with a confirmed or completed booking for this
        // vendor is eligible to review them (a pending/approved-but-not-
        // yet-confirmed/rejected/cancelled booking does not count).
        const bookingCheck = await pool.query(

            `
            SELECT *

            FROM bookings

            WHERE customer_id = $1

            AND vendor_id = $2

            AND booking_status IN ('confirmed', 'completed')
            `,

            [

                customerId,

                vendor_id

            ]

        );
        const existingReview = await pool.query(

            `
            SELECT *

            FROM reviews

            WHERE customer_id = $1

            AND vendor_id = $2
            `,

            [

                customerId,

                vendor_id

            ]

        );

        if (

            existingReview.rows.length > 0

        ) {

            return res.status(400).json({

                success:false,

                message:

                "You already reviewed this vendor"

            });

        }
        if (

            bookingCheck.rows.length === 0

        ) {

            return res.status(403).json({

                success:false,

                message:

                "You can review a vendor once your booking with them has been confirmed or completed"

            });

        }

        const result = await pool.query(
            `
            INSERT INTO reviews
            (
                customer_id,
                vendor_id,
                rating,
                review
            )
            VALUES ($1, $2, $3, $4)
            RETURNING *
            `,
            [
                customerId,
                vendor_id,
                ratingNum,
                review.trim()
            ]
        );

        const vendorOwner = await pool.query(
            `SELECT user_id, business_name FROM vendors WHERE id = $1`,
            [vendor_id]
        );

        if (vendorOwner.rows.length > 0) {
            await createNotification(req.app.get("io"), {
                userId: vendorOwner.rows[0].user_id,
                type: "new_review",
                title: `${req.user.name} left you a ${ratingNum}-star review`,
                message: review.trim(),
                link: "/vendor-dashboard"
            });
        }

        res.status(201).json({
            success: true,
            review: result.rows[0]
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });

    }
};

// GET VENDOR REVIEW STATS
const getVendorReviews = async (req, res) => {

    try {

        const { vendorId } = req.params;

        const reviews = await pool.query(

            `
            SELECT

                reviews.id,

                reviews.rating,

                reviews.review,

                reviews.created_at,

                users.name

            FROM reviews

            LEFT JOIN users

            ON reviews.customer_id = users.id

            WHERE reviews.vendor_id = $1

            ORDER BY reviews.created_at DESC
            `,

            [vendorId]

        );

        res.status(200).json({

            success: true,

            reviews: reviews.rows

        });

    }

    catch (error) {

        console.log(error);

        res.status(500).json({

            success: false,

            message: "Something went wrong. Please try again."
        });

    }

};

const getVendorReviewStats = async (

    req,

    res

) => {

    try {

        const {

            vendorId

        } = req.params;

        const stats = await pool.query(

            `
            SELECT

            COUNT(*) AS total_reviews,

            COALESCE(

                ROUND(

                    AVG(rating)::numeric,

                    1

                ),

                0

            ) AS avg_rating

            FROM reviews

            WHERE vendor_id = $1
            `,

            [

                vendorId

            ]

        );

        res.json({

            success:true,

            stats:

            stats.rows[0]

        });

    }

    catch(error){

        console.log(error);

        res.status(500).json({

            success: false,

            message: "Something went wrong. Please try again."

        });

    }

};

module.exports = {
    addReview,
    getVendorReviews,
    getVendorReviewStats
};