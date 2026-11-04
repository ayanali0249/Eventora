const pool = require("../config/db");
const { parsePriceRangeMidpoint } = require("../utils/priceParser");


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

        if (!business_name || !category || !city) {
            return res.status(400).json({
                success: false,
                message: "Business name, category and city are required"
            });
        }

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
            message: "Something went wrong. Please try again."
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

                success: false,

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
            success: false,

            message: "Something went wrong. Please try again."
        });

    }

};

// GET DISTINCT CATEGORIES + CITIES CURRENTLY IN USE
// Powers the filter dropdowns on the vendor browse page so the options
// always match real data instead of a hardcoded, possibly stale list.
const getVendorFilters = async (req, res) => {

    try {

        const categories = await pool.query(
            `SELECT DISTINCT category FROM vendors ORDER BY category ASC`
        );

        const cities = await pool.query(
            `SELECT DISTINCT city FROM vendors ORDER BY city ASC`
        );

        // Real min/max of whatever prices vendors have actually listed, so
        // the price filter on the browse page can show real bounds instead
        // of an arbitrary guessed range.
        const priceBounds = await pool.query(
            `SELECT
                MIN(${PRICE_START_EXPR}) AS min_price,
                MAX(${PRICE_START_EXPR}) AS max_price
             FROM vendors`
        );

        res.json({
            success: true,
            categories: categories.rows.map((row) => row.category),
            cities: cities.rows.map((row) => row.city),
            priceBounds: {
                min: priceBounds.rows[0].min_price !== null ? Number(priceBounds.rows[0].min_price) : null,
                max: priceBounds.rows[0].max_price !== null ? Number(priceBounds.rows[0].max_price) : null
            }
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });

    }

};

// Vendors store price_range as free text ("₹50,000 - ₹1,50,000"), so sorting
// or filtering on it directly is a STRING comparison - "₹50,000" would sort
// after "₹1,00,000" because '5' > '1' as characters, even though 50,000 is
// the smaller number. This pulls out the first number in the string (the
// lower bound a visitor would read as the "starting price") as a real
// NUMERIC value, so "Lowest Price" sort and the price-range filter both work
// on actual numbers. A vendor whose price_range has no parseable number at
// all evaluates to NULL and is naturally excluded by a price filter/sort,
// which is the right behavior (nothing to compare against).
const PRICE_START_EXPR = `
    NULLIF(
        regexp_replace(
            COALESCE((regexp_match(vendors.price_range, '[0-9][0-9,]*'))[1], ''),
            ',', '', 'g'
        ),
        ''
    )::numeric
`;

// GET ALL VENDORS (real pagination, filters and sort - this is the public
// vendor browse/search endpoint, so every filter here is something a
// visitor actually chose, layered on top of the always-on is_banned check).
const getAllVendors = async (req, res) => {

    try {

        const {
            city,
            category,
            search,
            sort,
            minRating,
            priceMin,
            priceMax
        } = req.query;

        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(Math.max(1, Number(req.query.limit) || 9), 48);
        const offset = (page - 1) * limit;

        const fromAndJoins = `
            FROM vendors

            JOIN users ON vendors.user_id = users.id

            LEFT JOIN reviews
            ON vendors.id = reviews.vendor_id
        `;

        // A suspended vendor's listing is excluded from public browse -
        // this is always applied, never a user-controllable filter.
        let conditions = ["users.is_banned = FALSE", "vendors.is_active = TRUE"];
        let values = [];

        // Filter by city (case-insensitive, so "jaipur" and "Jaipur" both match)
        if (city) {
            values.push(city);
            conditions.push(`vendors.city ILIKE $${values.length}`);
        }

        // Filter by category (case-insensitive exact match)
        if (category) {
            values.push(category);
            conditions.push(`vendors.category ILIKE $${values.length}`);
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

        // Price-range filter (minimum/maximum starting price, both optional
        // and independent - either one alone is a valid filter).
        if (priceMin !== undefined && priceMin !== "" && !isNaN(Number(priceMin))) {
            values.push(Number(priceMin));
            conditions.push(`${PRICE_START_EXPR} >= $${values.length}`);
        }

        if (priceMax !== undefined && priceMax !== "" && !isNaN(Number(priceMax))) {
            values.push(Number(priceMax));
            conditions.push(`${PRICE_START_EXPR} <= $${values.length}`);
        }

        const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

        const groupByClause = `
            GROUP BY
                vendors.id,
                vendors.business_name,
                vendors.category,
                vendors.city,
                vendors.description,
                vendors.price_range,
                vendors.portfolio_image,
                vendors.is_featured
        `;

        // Minimum-rating filter: this needs the aggregated avg_rating, so it
        // has to live in HAVING (Postgres doesn't accept a SELECT-list alias
        // here, so the aggregate expression is repeated).
        let havingClause = "";
        const ratingNum = Number(minRating);
        if (minRating !== undefined && minRating !== "" && !isNaN(ratingNum)) {
            values.push(ratingNum);
            havingClause = ` HAVING COALESCE(ROUND(AVG(reviews.rating)::numeric, 1), 0) >= $${values.length} `;
        }

        // Featured vendors (set via the admin panel) always sort first,
        // whatever other sort the visitor picked.
        let orderByClause;
        if (sort === "rating") {
            orderByClause = `ORDER BY vendors.is_featured DESC, avg_rating DESC`;
        } else if (sort === "price" || sort === "price_low") {
            orderByClause = `ORDER BY vendors.is_featured DESC, ${PRICE_START_EXPR} ASC NULLS LAST`;
        } else if (sort === "price_high") {
            orderByClause = `ORDER BY vendors.is_featured DESC, ${PRICE_START_EXPR} DESC NULLS LAST`;
        } else {
            orderByClause = `ORDER BY vendors.is_featured DESC, vendors.created_at DESC`;
        }

        // Counted separately from the paged SELECT below (rather than a
        // COUNT(*) OVER() window column on the same query) because a window
        // function's value only exists on rows that are actually returned -
        // if the requested page is past the last page of results, LIMIT/
        // OFFSET would return zero rows and there'd be no row left to carry
        // the true total, making "total" wrongly read back as 0 instead of
        // the real count.
        const countResult = await pool.query(
            `SELECT COUNT(*)::int AS total FROM (
                SELECT vendors.id
                ${fromAndJoins}
                ${whereClause}
                ${groupByClause}
                ${havingClause}
             ) AS matching_vendors`,
            values
        );

        const total = countResult.rows[0].total;

        const listValues = [...values, limit, offset];

        const query = `
            SELECT
                vendors.id,
                vendors.business_name,
                vendors.category,
                vendors.city,
                vendors.description,
                vendors.price_range,
                vendors.portfolio_image,
                vendors.is_featured,

                COALESCE(
                    ROUND(
                        AVG(reviews.rating)::numeric,
                        1
                    ),
                    0
                ) AS avg_rating

            ${fromAndJoins}
            ${whereClause}
            ${groupByClause}
            ${havingClause}
            ${orderByClause}
            LIMIT $${listValues.length - 1} OFFSET $${listValues.length}
        `;

        const result = await pool.query(query, listValues);

        res.status(200).json({
            success: true,
            vendors: result.rows,
            pagination: {
                page,
                limit,
                total,
                total_pages: Math.max(1, Math.ceil(total / limit))
            }
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });

    }

};

const getVendorById = async (

req,

res

) => {

    try {

        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            return res.status(400).json({
                success: false,
                message: "Invalid vendor id"
            });
        }

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

        if (vendor.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Vendor not found"
            });
        }

        const vendorRow = vendor.rows[0];

        // A suspended vendor's page is not publicly reachable, even by
        // direct link - looks identical to a vendor that doesn't exist.
        const ownerCheck = await pool.query(
            `SELECT is_banned FROM users WHERE id = $1`,
            [vendorRow.user_id]
        );

        // Same for a listing an admin has deactivated (the owner can still
        // reach their own profile through their dashboard endpoints).
        const hiddenListing = vendorRow.is_active === false && !(req.user && req.user.id === vendorRow.user_id);

        if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].is_banned || hiddenListing) {
            return res.status(404).json({
                success: false,
                message: "Vendor not found"
            });
        }

        // Real "Profile Views" counter: only counts someone other than the
        // vendor themselves opening the page, so a vendor previewing their
        // own listing doesn't inflate their own stats. req.user is only set
        // when a valid JWT was sent (optionalAuth) - logged-out visitors
        // still count as a view, they just can't be excluded as the owner.
        const isOwnerViewing = req.user && req.user.id === vendorRow.user_id;

        if (!isOwnerViewing) {

            const viewUpdate = await pool.query(
                `UPDATE vendors SET profile_views = profile_views + 1 WHERE id = $1 RETURNING profile_views`,
                [vendorRow.id]
            );

            if (viewUpdate.rows.length > 0) {
                vendorRow.profile_views = viewUpdate.rows[0].profile_views;
            }

        }

        res.json({

            success:true,

            vendor:

            vendorRow

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
            success: false,

            message: "Something went wrong. Please try again."
        });

    }

};

// GET RECOMMENDED VENDORS FOR THE LOGGED-IN CUSTOMER
//
// Content-based recommendation built entirely from signals already in the
// DB - no separate ML pipeline needed:
//   - vendors this customer has BOOKED (any status)  -> weight 3
//   - vendors this customer has WISHLISTED            -> weight 2
//   - vendors this customer has RECENTLY VIEWED        -> weight 1
// Those weights are summed per category and per city the customer has
// shown interest in (category counted double - a category match is a
// stronger signal than a city match), and every vendor is scored by how
// well it fits those categories/cities. Vendors the customer already
// knows about (already booked or already wishlisted) are excluded, since
// the point is to surface vendors they haven't found yet, not the ones
// already on their radar.
//
// A brand-new customer with no signals at all gets a match_score of 0 for
// every vendor, so the ORDER BY falls through to its tiebreakers (featured
// first, then highest rated, then newest) - the same "popular vendors"
// fallback used elsewhere on the site, with no separate cold-start code
// path needed. The `personalized` flag in the response tells the frontend
// whether any real personalization actually happened, so it can adjust
// the section's heading/copy accordingly.
const getRecommendedVendors = async (req, res) => {

    try {

        const customerId = req.user.id;
        const limit = Math.min(Math.max(1, Number(req.query.limit) || 8), 24);

        const result = await pool.query(
            `WITH my_signals AS (
                SELECT vendors.category, vendors.city, 3 AS weight
                FROM bookings
                JOIN vendors ON vendors.id = bookings.vendor_id
                WHERE bookings.customer_id = $1

                UNION ALL

                SELECT vendors.category, vendors.city, 2 AS weight
                FROM wishlists
                JOIN vendors ON vendors.id = wishlists.vendor_id
                WHERE wishlists.customer_id = $1

                UNION ALL

                SELECT vendors.category, vendors.city, 1 AS weight
                FROM vendor_views
                JOIN vendors ON vendors.id = vendor_views.vendor_id
                WHERE vendor_views.customer_id = $1
            ),
            category_scores AS (
                SELECT category, SUM(weight) AS score
                FROM my_signals
                GROUP BY category
            ),
            city_scores AS (
                SELECT city, SUM(weight) AS score
                FROM my_signals
                GROUP BY city
            ),
            already_known AS (
                SELECT vendor_id FROM bookings WHERE customer_id = $1
                UNION
                SELECT vendor_id FROM wishlists WHERE customer_id = $1
            )
            SELECT
                vendors.id,
                vendors.business_name,
                vendors.category,
                vendors.city,
                vendors.description,
                vendors.price_range,
                vendors.portfolio_image,
                vendors.is_featured,

                COALESCE(ROUND(AVG(reviews.rating)::numeric, 1), 0) AS avg_rating,

                COALESCE(cat.score, 0) * 2 + COALESCE(ct.score, 0) AS match_score

            FROM vendors
            JOIN users ON vendors.user_id = users.id
            LEFT JOIN reviews ON reviews.vendor_id = vendors.id
            LEFT JOIN category_scores cat ON cat.category = vendors.category
            LEFT JOIN city_scores ct ON ct.city = vendors.city

            WHERE users.is_banned = FALSE
              AND vendors.is_active = TRUE
              AND vendors.id NOT IN (SELECT vendor_id FROM already_known)

            GROUP BY
                vendors.id, vendors.business_name, vendors.category, vendors.city,
                vendors.description, vendors.price_range, vendors.portfolio_image,
                vendors.is_featured, cat.score, ct.score

            ORDER BY
                match_score DESC,
                vendors.is_featured DESC,
                avg_rating DESC,
                vendors.created_at DESC

            LIMIT $2`,
            [customerId, limit]
        );

        const personalized = result.rows.some((row) => Number(row.match_score) > 0);
        const vendors = result.rows.map(({ match_score, ...vendor }) => vendor);

        res.json({
            success: true,
            vendors,
            personalized
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });

    }

};

// COMPARE VENDORS SIDE-BY-SIDE
//
// Public endpoint (no auth needed - comparing vendors is a browsing aid,
// not an account action) that returns full comparable details for 2-4
// vendors at once, given their ids as a comma-separated query string
// (?ids=1,2,5). Vendors whose owner has been banned are silently excluded,
// same as every other public vendor listing on this site. Any id that
// doesn't resolve to a real, visible vendor is reported back in
// `missingIds` rather than failing the whole request - the comparison
// tray is built up client-side over a browsing session, so one stale id
// (a vendor deleted or banned after being added to the tray) shouldn't
// block comparing the rest.
const compareVendors = async (req, res) => {

    try {

        const rawIds = (req.query.ids || "")
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean);

        // De-dupe and keep only well-formed positive integers - anything
        // else (blank, non-numeric, negative, decimal) is just dropped
        // rather than erroring the whole request.
        const ids = [...new Set(rawIds)]
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id > 0);

        if (ids.length < 2) {
            return res.status(400).json({
                success: false,
                message: "Select at least 2 vendors to compare"
            });
        }

        if (ids.length > 4) {
            return res.status(400).json({
                success: false,
                message: "You can compare up to 4 vendors at a time"
            });
        }

        const result = await pool.query(
            `SELECT
                vendors.id,
                vendors.business_name,
                vendors.category,
                vendors.city,
                vendors.description,
                vendors.price_range,
                vendors.portfolio_image,
                vendors.is_featured,
                vendors.created_at,
                COALESCE(ROUND(AVG(reviews.rating)::numeric, 1), 0) AS avg_rating,
                COUNT(DISTINCT reviews.id)::int AS review_count
            FROM vendors
            JOIN users ON vendors.user_id = users.id
            LEFT JOIN reviews ON reviews.vendor_id = vendors.id
            WHERE users.is_banned = FALSE
              AND vendors.is_active = TRUE
              AND vendors.id = ANY($1::int[])
            GROUP BY vendors.id`,
            [ids]
        );

        // Preserve the caller's original tray order instead of whatever
        // order Postgres happens to return rows in, and report back any
        // requested id that didn't resolve to a visible vendor.
        const byId = new Map(result.rows.map((row) => [row.id, row]));
        const vendors = ids.map((id) => byId.get(id)).filter(Boolean);
        const missingIds = ids.filter((id) => !byId.has(id));

        res.json({
            success: true,
            vendors,
            missingIds
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });

    }

};

// CREATE OR UPDATE VENDOR PROFILE (upsert)
//
// FIXED: this used to be a plain UPDATE, but nothing in the frontend ever
// called POST /vendors/create - the "Edit Profile" button on the vendor
// dashboard was the ONLY way a vendor could set up their business, and it
// called this endpoint. Because it was UPDATE-only, a brand new vendor
// account could never actually create a profile: the UPDATE would match 0
// rows, "succeed" with an empty response, and the vendor would stay
// invisible forever. Using INSERT ... ON CONFLICT DO UPDATE fixes this
// while keeping the exact same endpoint, request body and response shape.
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

        if (!business_name || !category || !city) {
            return res.status(400).json({
                success: false,
                message: "Business name, category and city are required"
            });
        }

        const updated = await pool.query(

            `
            INSERT INTO vendors
                (user_id, business_name, category, city, description, price_range, portfolio_image, gallery_images)
            VALUES
                ($8, $1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (user_id) DO UPDATE
            SET

            business_name = $1,

            category = $2,

            city = $3,

            description = $4,

            price_range = $5,

            portfolio_image = $6,

            gallery_images = $7

            RETURNING *
            `,

            [

                business_name,

                category,

                city,

                description || null,

                price_range || null,

                portfolio_image || null,

                gallery_images || [],

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
            success: false,

            message: "Something went wrong. Please try again."
        });

    }

};

// Profile fields that count toward "Profile Completion %", each with a
// weight (weights sum to 100) and a human label used to tell the vendor
// exactly what to add next. Checked against the vendor's OWN row, never
// against any other vendor or hardcoded data.
const PROFILE_COMPLETION_FIELDS = [
    { field: "business_name", label: "Add your business name", weight: 15,
      isComplete: (v) => Boolean(v.business_name && v.business_name.trim()) },
    { field: "category", label: "Choose a category", weight: 10,
      isComplete: (v) => Boolean(v.category && v.category.trim()) },
    { field: "city", label: "Add your city", weight: 10,
      isComplete: (v) => Boolean(v.city && v.city.trim()) },
    { field: "description", label: "Write a business description", weight: 20,
      isComplete: (v) => Boolean(v.description && v.description.trim().length >= 20) },
    { field: "price_range", label: "Add your price range", weight: 15,
      isComplete: (v) => Boolean(v.price_range && v.price_range.trim()) },
    { field: "portfolio_image", label: "Upload a cover photo", weight: 15,
      isComplete: (v) => Boolean(v.portfolio_image && v.portfolio_image.trim()) },
    { field: "gallery_images", label: "Add at least 3 gallery photos", weight: 15,
      isComplete: (v) => Array.isArray(v.gallery_images) && v.gallery_images.length >= 3 }
];

function computeProfileCompletion(vendorRow) {

    let percentage = 0;
    const missing = [];

    for (const item of PROFILE_COMPLETION_FIELDS) {

        if (item.isComplete(vendorRow)) {
            percentage += item.weight;
        } else {
            missing.push({ field: item.field, label: item.label, weight: item.weight });
        }

    }

    // Missing items are returned worst-first so the dashboard can surface
    // the highest-impact action first.
    missing.sort((a, b) => b.weight - a.weight);

    return { percentage, missing };

}

// REAL, DB-BACKED VENDOR DASHBOARD KPIs
//
// Every number here comes from an actual query against this vendor's own
// rows (resolved from the authenticated JWT, never trusted from the
// request) - nothing is mocked or hardcoded:
//   - booking counts by status, from `bookings`
//   - average rating + review count, from `reviews`
//   - profile views, from the real counter on `vendors.profile_views`
//     (incremented in getVendorById)
//   - response rate = % of received bookings the vendor has actually acted
//     on (anything other than still "pending")
//   - estimated revenue = completed bookings x the vendor's own listed
//     price-range midpoint (clearly labeled as an estimate - there is no
//     per-booking price stored, only a price RANGE on the profile)
//   - profile completion % + the specific missing fields, so the frontend
//     can deep-link the vendor straight to "Edit Profile"
const getVendorDashboardStats = async (req, res) => {

    try {

        const userId = req.user.id;

        const vendorResult = await pool.query(
            `SELECT * FROM vendors WHERE user_id = $1`,
            [userId]
        );

        if (vendorResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Create your vendor profile first to see dashboard stats"
            });
        }

        const vendor = vendorResult.rows[0];

        const [bookingStatsResult, reviewStatsResult] = await Promise.all([

            pool.query(
                `SELECT booking_status, COUNT(*)::int AS count
                 FROM bookings
                 WHERE vendor_id = $1
                 GROUP BY booking_status`,
                [vendor.id]
            ),

            pool.query(
                `SELECT
                    COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS avg_rating,
                    COUNT(*)::int AS total_reviews
                 FROM reviews
                 WHERE vendor_id = $1`,
                [vendor.id]
            )

        ]);

        const bookingCounts = {
            pending: 0,
            approved: 0,
            confirmed: 0,
            completed: 0,
            rejected: 0,
            cancelled: 0
        };

        let totalBookings = 0;

        for (const row of bookingStatsResult.rows) {
            bookingCounts[row.booking_status] = row.count;
            totalBookings += row.count;
        }

        // "Responded" = anything the vendor has actually acted on, i.e.
        // everything except still sitting untouched as "pending".
        const respondedBookings = totalBookings - bookingCounts.pending;

        const responseRate = totalBookings > 0
            ? Math.round((respondedBookings / totalBookings) * 100)
            : null;

        const priceMidpoint = parsePriceRangeMidpoint(vendor.price_range);

        const estimatedRevenue = priceMidpoint !== null
            ? priceMidpoint * bookingCounts.completed
            : null;

        const completion = computeProfileCompletion(vendor);

        res.json({

            success: true,

            stats: {

                total_bookings: totalBookings,
                booking_counts: bookingCounts,

                avg_rating: reviewStatsResult.rows[0].avg_rating,
                total_reviews: reviewStatsResult.rows[0].total_reviews,

                profile_views: vendor.profile_views,

                response_rate: responseRate,

                estimated_revenue: estimatedRevenue,
                revenue_is_estimate: true,

                profile_completion: {
                    percentage: completion.percentage,
                    missing: completion.missing
                }

            }

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
    createVendor,
    getAllVendors,
    getVendorById,
    getRelatedVendors,
    getRecommendedVendors,
    compareVendors,
    updateVendorProfile,
    getMyVendorProfile,
    getVendorFilters,
    getVendorDashboardStats
};