const pool = require("../config/db");


// CREATE VENDOR
const createVendor = async (req, res) => {

    try {

        const userId = req.user.id;

        const {
            business_name,
            category,
            city,
            description,
            price_range,
            portfolio_image
        } = req.body;

        // Check existing vendor profile
        const existingVendor = await pool.query(
            "SELECT * FROM vendors WHERE user_id = $1",
            [userId]
        );

        if (existingVendor.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Vendor profile already exists"
            });
        }

        // Create vendor
        const vendorResult = await pool.query(
            `INSERT INTO vendors
            (
                user_id,
                business_name,
                category,
                city,
                description,
                price_range,
                portfolio_image
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [
                userId,
                business_name,
                category,
                city,
                description,
                price_range,
                portfolio_image
            ]
        );

        res.status(201).json({
            success: true,
            message: "Vendor profile created",
            vendor: vendorResult.rows[0]
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

};


const getMyVendorProfile = async (

    req,

    res

) => {

    try {

        const userId = req.user.id;

        const vendor = await pool.query(

            `
            SELECT *

            FROM vendors

            WHERE user_id = $1
            `,

            [userId]

        );

        if (

            vendor.rows.length === 0

        ) {

            return res.status(404).json({

                message:

                "Vendor profile not found"

            });

        }

        res.json({

            success:true,

            vendor:

            vendor.rows[0]

        });

    }

    catch(error){

        console.log(error);

        res.status(500).json({

            error:error.message

        });

    }

};

// GET ALL VENDORS
const getAllVendors = async (req, res) => {

    try {

        const {

            city,

            category,

            search,

            sort

        } = req.query;

        let query = `
            SELECT
                vendors.id,
                vendors.business_name,
                vendors.category,
                vendors.city,
                vendors.description,
                vendors.price_range,
                vendors.portfolio_image,

                COALESCE(
                    ROUND(
                        AVG(reviews.rating)::numeric,
                        1
                    ),
                    0
                ) AS avg_rating

            FROM vendors

            LEFT JOIN reviews
            ON vendors.id = reviews.vendor_id
        `;

        let conditions = [];
        let values = [];

        // Filter by city
        if (city) {
            values.push(city);
            conditions.push(`vendors.city = $${values.length}`);
        }

        // Filter by category
        if (category) {
            values.push(category);
            conditions.push(`vendors.category = $${values.length}`);
        }
        
        // Search vendor name

        if (search) {

            values.push(

                `%${search}%`

            );

            conditions.push(

                `business_name ILIKE $${values.length}`

            );

        }
        // Add WHERE clause
        if (conditions.length > 0) {
            query += ` WHERE ` + conditions.join(" AND ");
        }
        query += `
        GROUP BY
            vendors.id,
            vendors.business_name,
            vendors.category,
            vendors.city,
            vendors.description,
            vendors.price_range,
            vendors.portfolio_image
        `;
        if (sort === "rating") {

            query += `
                ORDER BY avg_rating DESC
            `;

        } else if (sort === "price") {

            query += `
                ORDER BY price_range ASC
            `;

        } else {

            query += `
                ORDER BY vendors.created_at DESC
            `;

        }

        const vendors = await pool.query(query, values);

        res.status(200).json({
            success: true,
            count: vendors.rows.length,
            vendors: vendors.rows
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

};

const getVendorById = async (

req,

res

) => {

    try {

        const { id } = req.params;

        const vendor = await pool.query(

            `
            SELECT

            vendors.*,

            COALESCE(

                ROUND(

                    AVG(

                        reviews.rating

                    )::numeric,

                    1

                ),

                0

            )

            AS avg_rating,

            COUNT(

                reviews.id

            )

            AS total_reviews

            FROM vendors

            LEFT JOIN reviews

            ON vendors.id = reviews.vendor_id

            WHERE vendors.id = $1

            GROUP BY vendors.id
            `,

            [id]

        );

        res.json({

            success:true,

            vendor:

            vendor.rows[0]

        });

    }

    catch(error){

        res.status(500).json({

            error:

            error.message

        });

    }

};

const getRelatedVendors = async (

    req,

    res

) => {

    try {

        const {

            category,

            vendorId

        } = req.query;

        const vendors = await pool.query(

            `
            SELECT

                id,

                business_name,

                city,

                portfolio_image,

                category

            FROM vendors

            WHERE category = $1

            AND id != $2

            LIMIT 4
            `,

            [

                category,

                vendorId

            ]

        );

        res.json({

            success:true,

            vendors:vendors.rows

        });

    }

    catch(error){

        console.log(error);

        res.status(500).json({

            error:error.message

        });

    }

};

const updateVendorProfile = async (

    req,

    res

) => {

    try {

        const userId = req.user.id;

        const {

            business_name,

            category,

            city,

            description,

            price_range,

            portfolio_image,

            gallery_images

        } = req.body;

        const updated = await pool.query(

            `
            UPDATE vendors

            SET

            business_name = $1,

            category = $2,

            city = $3,

            description = $4,

            price_range = $5,

            portfolio_image = $6,

            gallery_images = $7

            WHERE user_id = $8

            RETURNING *
            `,

            [

                business_name,

                category,

                city,

                description,

                price_range,

                portfolio_image,

                gallery_images,

                userId

            ]

        );

        res.json({

            success:true,

            vendor:

            updated.rows[0]

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
    createVendor,
    getAllVendors,
    getVendorById,
    getRelatedVendors,
    updateVendorProfile,
    getMyVendorProfile
};