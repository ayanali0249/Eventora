const pool = require("../config/db");
const { createNotification } = require("../utils/notify");
const { parsePriceRangeMidpoint } = require("../utils/priceParser");

// Every endpoint here is mounted behind authMiddleware + requireRole("admin")
// (see server/routes/adminRoutes.js) - nothing in this file re-checks the
// role, but every mutation still re-derives "who is making this change" from
// req.user.id (the verified JWT), never from the request body, and guards
// against an admin banning/deleting themselves.

const TERMINAL_BOOKING_STATUSES = ["completed", "rejected", "cancelled"];

function toPageParams(query) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(Math.max(1, Number(query.limit) || 20), 100);
    const offset = (page - 1) * limit;
    return { page, limit, offset };
}

const SERVER_ERROR = "Something went wrong. Please try again.";

// Strict positive-integer id from a route param, or null.
function parseId(value) {
    return /^\d{1,9}$/.test(String(value)) && Number(value) > 0 ? Number(value) : null;
}

const badId = (res) => res.status(400).json({ success: false, message: "Invalid id" });

// Appends a row to admin_audit_log. admin_id always comes from the verified
// JWT. A logging failure must never undo or block an action that already
// happened, so it's reported to the server log and swallowed.
async function audit(req, action, targetType, targetId, details = {}) {
    try {
        await pool.query(
            `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details)
             VALUES ($1, $2, $3, $4, $5::jsonb)`,
            [req.user.id, action, targetType, targetId, JSON.stringify(details)]
        );
    } catch (error) {
        console.log("ADMIN AUDIT LOG ERROR:", error.message);
    }
}

// Whitelisted ORDER BY: the client picks a key, never SQL.
function orderBy(query, allowed, fallbackKey) {
    const key = allowed[query.sort] ? query.sort : fallbackKey;
    const dir = String(query.dir).toLowerCase() === "asc" ? "ASC" : "DESC";
    return `${allowed[key]} ${dir}`;
}

// Escapes % _ \ so a search term is matched literally, not as a pattern.
const likeTerm = (term) => `%${String(term).trim().slice(0, 100).replace(/[\\%_]/g, "\\$&")}%`;

// ---------------------------------------------------------------------------
// PLATFORM-WIDE STATS
// ---------------------------------------------------------------------------
const getPlatformStats = async (req, res) => {

    try {

        const [
            userCounts,
            vendorCount,
            bookingCounts,
            reviewStats,
            signupTrends,
            bannedCount,
            vendorStatus,
            recentUsers,
            recentBookings
        ] = await Promise.all([

            pool.query(
                `SELECT role, COUNT(*)::int AS count FROM users GROUP BY role`
            ),

            pool.query(
                `SELECT COUNT(*)::int AS count FROM vendors`
            ),

            pool.query(
                `SELECT booking_status, COUNT(*)::int AS count FROM bookings GROUP BY booking_status`
            ),

            pool.query(
                `SELECT
                    COUNT(*)::int AS total_reviews,
                    COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS avg_rating
                 FROM reviews`
            ),

            pool.query(
                `SELECT
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int  AS last_7_days,
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS last_30_days
                 FROM users`
            ),

            pool.query(
                `SELECT COUNT(*)::int AS count FROM users WHERE is_banned = TRUE`
            ),

            pool.query(
                `SELECT
                    COUNT(*) FILTER (WHERE is_active = FALSE)::int AS inactive,
                    COUNT(*) FILTER (WHERE is_featured = TRUE)::int AS featured
                 FROM vendors`
            ),

            pool.query(
                `SELECT id, name, email, role, created_at
                 FROM users ORDER BY created_at DESC, id DESC LIMIT 5`
            ),

            pool.query(
                `SELECT bookings.id, bookings.event_type, bookings.event_date,
                        bookings.booking_status, bookings.created_at,
                        customers.name AS customer_name,
                        vendors.business_name AS vendor_business_name
                 FROM bookings
                 JOIN users customers ON customers.id = bookings.customer_id
                 JOIN vendors ON vendors.id = bookings.vendor_id
                 ORDER BY bookings.created_at DESC, bookings.id DESC LIMIT 5`
            )

        ]);

        const roleCounts = { customer: 0, vendor: 0, admin: 0 };
        for (const row of userCounts.rows) {
            roleCounts[row.role] = row.count;
        }

        const bookingStatusCounts = {
            pending: 0, approved: 0, confirmed: 0,
            completed: 0, rejected: 0, cancelled: 0
        };
        let totalBookings = 0;
        for (const row of bookingCounts.rows) {
            bookingStatusCounts[row.booking_status] = row.count;
            totalBookings += row.count;
        }

        // Estimated gross booking value: sum of each completed booking's
        // vendor price-range midpoint, same method already used on the
        // vendor dashboard's own "Estimated Revenue" KPI, just summed
        // platform-wide instead of per-vendor.
        const revenueResult = await pool.query(
            `SELECT b.id, v.price_range
             FROM bookings b
             JOIN vendors v ON b.vendor_id = v.id
             WHERE b.booking_status = 'completed'`
        );

        let estimatedRevenue = 0;
        for (const row of revenueResult.rows) {
            const mid = parsePriceRangeMidpoint(row.price_range);
            if (mid !== null) estimatedRevenue += mid;
        }

        res.json({
            success: true,
            stats: {
                users: {
                    total: roleCounts.customer + roleCounts.vendor + roleCounts.admin,
                    customers: roleCounts.customer,
                    vendors: roleCounts.vendor,
                    admins: roleCounts.admin,
                    banned: bannedCount.rows[0].count,
                    new_last_7_days: signupTrends.rows[0].last_7_days,
                    new_last_30_days: signupTrends.rows[0].last_30_days
                },
                vendors: {
                    total: vendorCount.rows[0].count,
                    inactive: vendorStatus.rows[0].inactive,
                    featured: vendorStatus.rows[0].featured
                },
                bookings: {
                    total: totalBookings,
                    by_status: bookingStatusCounts
                },
                reviews: {
                    total: reviewStats.rows[0].total_reviews,
                    avg_rating: reviewStats.rows[0].avg_rating
                },
                estimated_platform_revenue: Math.round(estimatedRevenue),
                recent_users: recentUsers.rows,
                recent_bookings: recentBookings.rows
            }
        });

    } catch (error) {

        console.log(error);
        res.status(500).json({ success: false, message: SERVER_ERROR });

    }

};

// ---------------------------------------------------------------------------
// USERS
// ---------------------------------------------------------------------------
const getAllUsers = async (req, res) => {

    try {

        const { role, search, status } = req.query;
        const { page, limit, offset } = toPageParams(req.query);

        const conditions = [];
        const values = [];

        if (role && ["customer", "vendor", "admin"].includes(role)) {
            values.push(role);
            conditions.push(`users.role = $${values.length}`);
        }

        if (status === "banned") {
            conditions.push(`users.is_banned = TRUE`);
        } else if (status === "active") {
            conditions.push(`users.is_banned = FALSE`);
        }

        if (search) {
            values.push(likeTerm(search));
            conditions.push(`(users.name ILIKE $${values.length} OR users.email ILIKE $${values.length})`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        const countResult = await pool.query(
            `SELECT COUNT(*)::int AS count FROM users ${whereClause}`,
            values
        );

        const listValues = [...values, limit, offset];

        const usersResult = await pool.query(
            `SELECT
                users.id, users.name, users.email, users.phone, users.role,
                users.is_banned, users.ban_reason, users.banned_at, users.created_at,
                vendors.id AS vendor_id, vendors.business_name
             FROM users
             LEFT JOIN vendors ON vendors.user_id = users.id
             ${whereClause}
             ORDER BY ${orderBy(req.query, {
                 created_at: "users.created_at", name: "users.name",
                 email: "users.email", role: "users.role"
             }, "created_at")}, users.id DESC
             LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
            listValues
        );

        res.json({
            success: true,
            users: usersResult.rows,
            pagination: {
                page,
                limit,
                total: countResult.rows[0].count,
                total_pages: Math.max(1, Math.ceil(countResult.rows[0].count / limit))
            }
        });

    } catch (error) {

        console.log(error);
        res.status(500).json({ success: false, message: SERVER_ERROR });

    }

};

const banUser = async (req, res) => {

    try {

        const targetId = parseId(req.params.id);
        const reason = typeof req.body?.reason === "string" ? req.body.reason : "";

        if (targetId === null) return badId(res);

        if (!reason.trim()) {
            return res.status(400).json({
                success: false,
                message: "A reason is required to suspend an account"
            });
        }

        if (reason.trim().length > 500) {
            return res.status(400).json({
                success: false,
                message: "The reason must be at most 500 characters"
            });
        }

        if (targetId === req.user.id) {
            return res.status(400).json({
                success: false,
                message: "You cannot suspend your own account"
            });
        }

        const targetResult = await pool.query(
            `SELECT id, role, is_banned FROM users WHERE id = $1`,
            [targetId]
        );

        if (targetResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (targetResult.rows[0].role === "admin") {
            return res.status(400).json({
                success: false,
                message: "Admin accounts cannot be suspended from here"
            });
        }

        const updated = await pool.query(
            `UPDATE users
             SET is_banned = TRUE, ban_reason = $1, banned_at = NOW()
             WHERE id = $2
             RETURNING id, name, email, role, is_banned, ban_reason, banned_at`,
            [reason.trim(), targetId]
        );

        // Cut any live Socket.io connections this user already has open;
        // reconnecting is refused by the socket auth check in index.js.
        const io = req.app.get("io");
        if (io) io.in(`user-${targetId}`).disconnectSockets(true);

        await audit(req, "user.ban", "user", targetId, { reason: reason.trim() });

        res.json({
            success: true,
            message: "User suspended",
            user: updated.rows[0]
        });

    } catch (error) {

        console.log(error);
        res.status(500).json({ success: false, message: SERVER_ERROR });

    }

};

const unbanUser = async (req, res) => {

    try {

        const targetId = parseId(req.params.id);

        if (targetId === null) return badId(res);

        const updated = await pool.query(
            `UPDATE users
             SET is_banned = FALSE, ban_reason = NULL, banned_at = NULL
             WHERE id = $1
             RETURNING id, name, email, role, is_banned`,
            [targetId]
        );

        if (updated.rows.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        await audit(req, "user.unban", "user", targetId);

        res.json({
            success: true,
            message: "User reinstated",
            user: updated.rows[0]
        });

    } catch (error) {

        console.log(error);
        res.status(500).json({ success: false, message: SERVER_ERROR });

    }

};

const deleteUserAdmin = async (req, res) => {

    try {

        const targetId = parseId(req.params.id);

        if (targetId === null) return badId(res);

        if (targetId === req.user.id) {
            return res.status(400).json({
                success: false,
                message: "You cannot delete your own account from here"
            });
        }

        const targetResult = await pool.query(
            `SELECT id, role, name, email FROM users WHERE id = $1`,
            [targetId]
        );

        if (targetResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (targetResult.rows[0].role === "admin") {
            return res.status(400).json({
                success: false,
                message: "Admin accounts cannot be deleted from here"
            });
        }

        // Cascades to their vendor profile, bookings, reviews, messages,
        // wishlists, notifications, etc. via the existing ON DELETE CASCADE
        // foreign keys already in schema.sql - nothing extra to clean up.
        await pool.query(`DELETE FROM users WHERE id = $1`, [targetId]);

        const io = req.app.get("io");
        if (io) io.in(`user-${targetId}`).disconnectSockets(true);

        await audit(req, "user.delete", "user", targetId, {
            name: targetResult.rows[0].name,
            email: targetResult.rows[0].email
        });

        res.json({ success: true, message: "User deleted" });

    } catch (error) {

        console.log(error);
        res.status(500).json({ success: false, message: SERVER_ERROR });

    }

};

// ---------------------------------------------------------------------------
// VENDORS
// ---------------------------------------------------------------------------
const getAllVendorsAdmin = async (req, res) => {

    try {

        const { search, category, city, status } = req.query;
        const { page, limit, offset } = toPageParams(req.query);

        const conditions = [];
        const values = [];

        if (search) {
            values.push(likeTerm(search));
            conditions.push(`(vendors.business_name ILIKE $${values.length} OR users.email ILIKE $${values.length})`);
        }

        if (category) {
            values.push(String(category).slice(0, 100));
            conditions.push(`vendors.category ILIKE $${values.length}`);
        }

        if (city) {
            values.push(String(city).slice(0, 100));
            conditions.push(`vendors.city ILIKE $${values.length}`);
        }

        if (status === "inactive") {
            conditions.push(`vendors.is_active = FALSE`);
        } else if (status === "active") {
            conditions.push(`vendors.is_active = TRUE`);
        } else if (status === "featured") {
            conditions.push(`vendors.is_featured = TRUE`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        const countResult = await pool.query(
            `SELECT COUNT(*)::int AS count FROM vendors JOIN users ON vendors.user_id = users.id ${whereClause}`,
            values
        );

        const listValues = [...values, limit, offset];

        const vendorsResult = await pool.query(
            `SELECT
                vendors.id, vendors.business_name, vendors.category, vendors.city,
                vendors.price_range, vendors.is_featured, vendors.profile_views,
                vendors.is_active, vendors.deactivated_reason, vendors.deactivated_at,
                vendors.created_at,
                users.id AS owner_id, users.name AS owner_name, users.email AS owner_email,
                users.is_banned AS owner_banned,
                COALESCE(ROUND(AVG(reviews.rating)::numeric, 1), 0) AS avg_rating,
                COUNT(DISTINCT reviews.id)::int AS total_reviews,
                COUNT(DISTINCT bookings.id)::int AS total_bookings
             FROM vendors
             JOIN users ON vendors.user_id = users.id
             LEFT JOIN reviews ON reviews.vendor_id = vendors.id
             LEFT JOIN bookings ON bookings.vendor_id = vendors.id
             ${whereClause}
             GROUP BY vendors.id, users.id
             ORDER BY ${orderBy(req.query, {
                 featured: "vendors.is_featured DESC, vendors.created_at",
                 created_at: "vendors.created_at", name: "vendors.business_name",
                 bookings: "total_bookings", rating: "avg_rating"
             }, "featured")}, vendors.id DESC
             LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
            listValues
        );

        res.json({
            success: true,
            vendors: vendorsResult.rows,
            pagination: {
                page,
                limit,
                total: countResult.rows[0].count,
                total_pages: Math.max(1, Math.ceil(countResult.rows[0].count / limit))
            }
        });

    } catch (error) {

        console.log(error);
        res.status(500).json({ success: false, message: SERVER_ERROR });

    }

};

const toggleFeatureVendor = async (req, res) => {

    try {

        const id = parseId(req.params.id);
        const featured = req.body?.featured;

        if (id === null) return badId(res);

        if (typeof featured !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "featured must be true or false"
            });
        }

        const updated = await pool.query(
            `UPDATE vendors SET is_featured = $1 WHERE id = $2 RETURNING id, business_name, is_featured`,
            [featured, id]
        );

        if (updated.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Vendor not found" });
        }

        await audit(req, featured ? "vendor.feature" : "vendor.unfeature", "vendor", id, {
            business_name: updated.rows[0].business_name
        });

        res.json({
            success: true,
            message: featured ? "Vendor featured" : "Vendor unfeatured",
            vendor: updated.rows[0]
        });

    } catch (error) {

        console.log(error);
        res.status(500).json({ success: false, message: SERVER_ERROR });

    }

};

const deleteVendorAdmin = async (req, res) => {

    try {

        const id = parseId(req.params.id);

        if (id === null) return badId(res);

        // Cascades to bookings, reviews, wishlists, vendor_views, etc. via
        // existing ON DELETE CASCADE foreign keys. Deliberately deletes only
        // the vendor PROFILE, not the underlying user account - a banned
        // business owner can still log in as a plain customer afterwards
        // rather than being wiped from the platform entirely.
        const deleted = await pool.query(
            `DELETE FROM vendors WHERE id = $1 RETURNING id, business_name`,
            [id]
        );

        if (deleted.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Vendor not found" });
        }

        await audit(req, "vendor.delete", "vendor", id, { business_name: deleted.rows[0].business_name });

        res.json({ success: true, message: "Vendor profile removed" });

    } catch (error) {

        console.log(error);
        res.status(500).json({ success: false, message: SERVER_ERROR });

    }

};

// ---------------------------------------------------------------------------
// BOOKINGS (platform-wide oversight)
// ---------------------------------------------------------------------------
const getAllBookingsAdmin = async (req, res) => {

    try {

        const { status, search } = req.query;
        const { page, limit, offset } = toPageParams(req.query);

        const conditions = [];
        const values = [];

        if (status && ["pending", "approved", "confirmed", "completed", "rejected", "cancelled"].includes(status)) {
            values.push(status);
            conditions.push(`bookings.booking_status = $${values.length}`);
        }

        if (search) {
            values.push(likeTerm(search));
            const n = values.length;
            conditions.push(
                `(customers.name ILIKE $${n} OR vendors.business_name ILIKE $${n} OR bookings.event_type ILIKE $${n}` +
                (/^\d{1,9}$/.test(String(search).trim()) ? ` OR bookings.id = ${Number(search.trim())}` : "") + `)`
            );
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        const countResult = await pool.query(
            `SELECT COUNT(*)::int AS count
             FROM bookings
             JOIN users customers ON bookings.customer_id = customers.id
             JOIN vendors ON bookings.vendor_id = vendors.id
             ${whereClause}`,
            values
        );

        const listValues = [...values, limit, offset];

        const bookingsResult = await pool.query(
            `SELECT
                bookings.id, bookings.event_type, bookings.event_date,
                bookings.guest_count, bookings.booking_status, bookings.created_at,
                customers.id AS customer_id, customers.name AS customer_name,
                vendors.id AS vendor_id, vendors.business_name AS vendor_business_name
             FROM bookings
             JOIN users customers ON bookings.customer_id = customers.id
             JOIN vendors ON bookings.vendor_id = vendors.id
             ${whereClause}
             ORDER BY ${orderBy(req.query, {
                 created_at: "bookings.created_at", event_date: "bookings.event_date",
                 status: "bookings.booking_status"
             }, "created_at")}, bookings.id DESC
             LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
            listValues
        );

        res.json({
            success: true,
            bookings: bookingsResult.rows,
            pagination: {
                page,
                limit,
                total: countResult.rows[0].count,
                total_pages: Math.max(1, Math.ceil(countResult.rows[0].count / limit))
            }
        });

    } catch (error) {

        console.log(error);
        res.status(500).json({ success: false, message: SERVER_ERROR });

    }

};

// Admin override: force-cancel any non-terminal booking (dispute resolution,
// policy violations, etc.) - notifies BOTH participants, same as a normal
// cancellation, and is written to the same audit trail as "system".
const adminCancelBooking = async (req, res) => {

    try {

        const id = parseId(req.params.id);
        const reason = typeof req.body?.reason === "string" ? req.body.reason : "";

        if (id === null) return badId(res);

        if (!reason.trim()) {
            return res.status(400).json({
                success: false,
                message: "A reason is required to cancel this booking"
            });
        }

        if (reason.trim().length > 500) {
            return res.status(400).json({
                success: false,
                message: "The reason must be at most 500 characters"
            });
        }

        const bookingResult = await pool.query(
            `SELECT bookings.*, vendors.user_id AS vendor_user_id, vendors.business_name
             FROM bookings
             JOIN vendors ON bookings.vendor_id = vendors.id
             WHERE bookings.id = $1`,
            [id]
        );

        if (bookingResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        const booking = bookingResult.rows[0];

        if (TERMINAL_BOOKING_STATUSES.includes(booking.booking_status)) {
            return res.status(400).json({
                success: false,
                message: `This booking is already ${booking.booking_status} and cannot be cancelled`
            });
        }

        const updated = await pool.query(
            `UPDATE bookings
             SET booking_status = 'cancelled', cancelled_by = 'admin',
                 cancellation_reason = $1, cancelled_at = NOW()
             WHERE id = $2
             RETURNING *`,
            [reason.trim(), id]
        );

        await pool.query(
            `INSERT INTO booking_status_history (booking_id, status, changed_by_role, note)
             VALUES ($1, 'cancelled', 'system', $2)`,
            [id, `Cancelled by platform admin: ${reason.trim()}`]
        );

        await audit(req, "booking.cancel", "booking", id, {
            previous_status: booking.booking_status,
            reason: reason.trim()
        });

        const io = req.app.get("io");

        await createNotification(io, {
            userId: booking.customer_id,
            type: "booking_cancelled",
            title: `Your booking with ${booking.business_name} was cancelled by Eventora`,
            message: reason.trim(),
            link: "/dashboard",
            relatedBookingId: Number(id)
        });

        await createNotification(io, {
            userId: booking.vendor_user_id,
            type: "booking_cancelled",
            title: `A booking was cancelled by Eventora`,
            message: reason.trim(),
            link: "/vendor-dashboard",
            relatedBookingId: Number(id)
        });

        res.json({
            success: true,
            message: "Booking cancelled",
            booking: updated.rows[0]
        });

    } catch (error) {

        console.log(error);
        res.status(500).json({ success: false, message: SERVER_ERROR });

    }

};

// ---------------------------------------------------------------------------
// USER DETAIL
// ---------------------------------------------------------------------------
const getUserDetail = async (req, res) => {

    try {

        const id = parseId(req.params.id);

        if (id === null) return badId(res);

        // Explicit column list: the password hash is never selected.
        const userResult = await pool.query(
            `SELECT id, name, email, phone, role, profile_image,
                    is_banned, ban_reason, banned_at, created_at
             FROM users WHERE id = $1`,
            [id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const [vendorResult, asCustomer, asVendor, reviewsWritten, recent] = await Promise.all([

            pool.query(
                `SELECT id, business_name, category, city, price_range, is_featured,
                        is_active, deactivated_reason, profile_views, created_at
                 FROM vendors WHERE user_id = $1`,
                [id]
            ),

            pool.query(
                `SELECT booking_status, COUNT(*)::int AS count
                 FROM bookings WHERE customer_id = $1 GROUP BY booking_status`,
                [id]
            ),

            pool.query(
                `SELECT bookings.booking_status, COUNT(*)::int AS count
                 FROM bookings JOIN vendors ON vendors.id = bookings.vendor_id
                 WHERE vendors.user_id = $1 GROUP BY bookings.booking_status`,
                [id]
            ),

            pool.query(`SELECT COUNT(*)::int AS count FROM reviews WHERE customer_id = $1`, [id]),

            pool.query(
                `SELECT bookings.id, bookings.event_type, bookings.event_date, bookings.booking_status,
                        vendors.business_name AS vendor_business_name,
                        customers.name AS customer_name
                 FROM bookings
                 JOIN vendors ON vendors.id = bookings.vendor_id
                 JOIN users customers ON customers.id = bookings.customer_id
                 WHERE bookings.customer_id = $1 OR vendors.user_id = $1
                 ORDER BY bookings.created_at DESC, bookings.id DESC LIMIT 5`,
                [id]
            )

        ]);

        const tally = (rows) => rows.reduce((acc, r) => {
            acc.total += r.count;
            acc[r.booking_status] = r.count;
            return acc;
        }, { total: 0 });

        res.json({
            success: true,
            user: userResult.rows[0],
            vendor_profile: vendorResult.rows[0] || null,
            bookings_as_customer: tally(asCustomer.rows),
            bookings_as_vendor: tally(asVendor.rows),
            reviews_written: reviewsWritten.rows[0].count,
            recent_bookings: recent.rows
        });

    } catch (error) {

        console.log(error);
        res.status(500).json({ success: false, message: SERVER_ERROR });

    }

};

// ---------------------------------------------------------------------------
// VENDOR LISTING MODERATION (suspend / reactivate the listing, not the owner)
// ---------------------------------------------------------------------------
const setVendorStatus = async (req, res) => {

    try {

        const id = parseId(req.params.id);
        const active = req.body?.active;
        const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";

        if (id === null) return badId(res);

        if (typeof active !== "boolean") {
            return res.status(400).json({ success: false, message: "active must be true or false" });
        }

        if (!active && !reason) {
            return res.status(400).json({
                success: false,
                message: "A reason is required to deactivate a listing"
            });
        }

        if (reason.length > 500) {
            return res.status(400).json({
                success: false,
                message: "The reason must be at most 500 characters"
            });
        }

        const updated = await pool.query(
            `UPDATE vendors
             SET is_active = $1,
                 deactivated_reason = $2,
                 deactivated_at = ${active ? "NULL" : "NOW()"}
             WHERE id = $3
             RETURNING id, user_id, business_name, is_active, deactivated_reason, deactivated_at`,
            [active, active ? null : reason, id]
        );

        if (updated.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Vendor not found" });
        }

        const vendor = updated.rows[0];

        await audit(req, active ? "vendor.activate" : "vendor.deactivate", "vendor", id, {
            business_name: vendor.business_name,
            ...(active ? {} : { reason })
        });

        await createNotification(req.app.get("io"), {
            userId: vendor.user_id,
            type: active ? "listing_reactivated" : "listing_deactivated",
            title: active
                ? `Your listing "${vendor.business_name}" is live again`
                : `Your listing "${vendor.business_name}" was deactivated`,
            message: active ? null : reason,
            link: "/vendor-dashboard"
        });

        res.json({
            success: true,
            message: active ? "Listing reactivated" : "Listing deactivated",
            vendor: {
                id: vendor.id,
                business_name: vendor.business_name,
                is_active: vendor.is_active,
                deactivated_reason: vendor.deactivated_reason,
                deactivated_at: vendor.deactivated_at
            }
        });

    } catch (error) {

        console.log(error);
        res.status(500).json({ success: false, message: SERVER_ERROR });

    }

};

// ---------------------------------------------------------------------------
// BOOKING DETAIL
// ---------------------------------------------------------------------------
const getBookingDetailAdmin = async (req, res) => {

    try {

        const id = parseId(req.params.id);

        if (id === null) return badId(res);

        const bookingResult = await pool.query(
            `SELECT bookings.id, bookings.event_type, bookings.event_date, bookings.guest_count,
                    bookings.message, bookings.booking_status, bookings.created_at,
                    bookings.confirmed_at, bookings.completed_at,
                    bookings.cancelled_by, bookings.cancellation_reason, bookings.cancelled_at,
                    bookings.reschedule_proposed_date, bookings.reschedule_proposed_by,
                    customers.id AS customer_id, customers.name AS customer_name,
                    customers.email AS customer_email, customers.phone AS customer_phone,
                    vendors.id AS vendor_id, vendors.business_name AS vendor_business_name,
                    vendors.category AS vendor_category, vendors.city AS vendor_city,
                    owners.id AS vendor_owner_id, owners.name AS vendor_owner_name,
                    owners.email AS vendor_owner_email
             FROM bookings
             JOIN users customers ON customers.id = bookings.customer_id
             JOIN vendors ON vendors.id = bookings.vendor_id
             JOIN users owners ON owners.id = vendors.user_id
             WHERE bookings.id = $1`,
            [id]
        );

        if (bookingResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        const history = await pool.query(
            `SELECT status, changed_by_role, note, created_at
             FROM booking_status_history
             WHERE booking_id = $1
             ORDER BY created_at ASC, id ASC`,
            [id]
        );

        res.json({ success: true, booking: bookingResult.rows[0], history: history.rows });

    } catch (error) {

        console.log(error);
        res.status(500).json({ success: false, message: SERVER_ERROR });

    }

};

// ---------------------------------------------------------------------------
// REVIEWS (read-only overview)
// ---------------------------------------------------------------------------
const getAllReviewsAdmin = async (req, res) => {

    try {

        const { search, rating } = req.query;
        const { page, limit, offset } = toPageParams(req.query);

        const conditions = [];
        const values = [];

        if (/^[1-5]$/.test(String(rating))) {
            values.push(Number(rating));
            conditions.push(`reviews.rating = $${values.length}`);
        }

        if (search) {
            values.push(likeTerm(search));
            const n = values.length;
            conditions.push(
                `(reviews.review ILIKE $${n} OR vendors.business_name ILIKE $${n} OR customers.name ILIKE $${n})`
            );
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        const from = `FROM reviews
             JOIN vendors ON vendors.id = reviews.vendor_id
             LEFT JOIN users customers ON customers.id = reviews.customer_id`;

        const countResult = await pool.query(
            `SELECT COUNT(*)::int AS count ${from} ${whereClause}`,
            values
        );

        const listValues = [...values, limit, offset];

        const reviewsResult = await pool.query(
            `SELECT reviews.id, reviews.rating, reviews.review, reviews.created_at,
                    vendors.id AS vendor_id, vendors.business_name AS vendor_business_name,
                    customers.id AS customer_id, customers.name AS customer_name
             ${from}
             ${whereClause}
             ORDER BY ${orderBy(req.query, {
                 created_at: "reviews.created_at", rating: "reviews.rating"
             }, "created_at")}, reviews.id DESC
             LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
            listValues
        );

        res.json({
            success: true,
            reviews: reviewsResult.rows,
            pagination: {
                page,
                limit,
                total: countResult.rows[0].count,
                total_pages: Math.max(1, Math.ceil(countResult.rows[0].count / limit))
            }
        });

    } catch (error) {

        console.log(error);
        res.status(500).json({ success: false, message: SERVER_ERROR });

    }

};

// ---------------------------------------------------------------------------
// AUDIT LOG (read-only)
// ---------------------------------------------------------------------------
const getAuditLog = async (req, res) => {

    try {

        const { page, limit, offset } = toPageParams(req.query);

        const countResult = await pool.query(`SELECT COUNT(*)::int AS count FROM admin_audit_log`);

        const result = await pool.query(
            `SELECT log.id, log.action, log.target_type, log.target_id, log.details, log.created_at,
                    admins.name AS admin_name
             FROM admin_audit_log log
             LEFT JOIN users admins ON admins.id = log.admin_id
             ORDER BY log.created_at DESC, log.id DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        res.json({
            success: true,
            entries: result.rows,
            pagination: {
                page,
                limit,
                total: countResult.rows[0].count,
                total_pages: Math.max(1, Math.ceil(countResult.rows[0].count / limit))
            }
        });

    } catch (error) {

        console.log(error);
        res.status(500).json({ success: false, message: SERVER_ERROR });

    }

};

module.exports = {
    getPlatformStats,
    getAllUsers,
    banUser,
    unbanUser,
    deleteUserAdmin,
    getAllVendorsAdmin,
    toggleFeatureVendor,
    deleteVendorAdmin,
    getAllBookingsAdmin,
    adminCancelBooking,
    getUserDetail,
    setVendorStatus,
    getBookingDetailAdmin,
    getAllReviewsAdmin,
    getAuditLog
};
