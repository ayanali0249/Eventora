const pool = require("../config/db");

// ADD REVIEW
const addReview = async (req, res) => {
    try {
        const customerId = req.user.id;

        const {

            vendor_id,

            rating,

            review

        } = req.body;

        const bookingCheck = await pool.query(

            `
            SELECT *

            FROM bookings

            WHERE customer_id = $1

            AND vendor_id = $2
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

                "Book vendor before reviewing"

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
                rating,
                review
            ]
        );

        res.status(201).json({
            success: true,
            review: result.rows[0]
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            error: error.message
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

            error: error.message

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

            error:error.message

        });

    }

};

module.exports = {
    addReview,
    getVendorReviews,
    getVendorReviewStats
};