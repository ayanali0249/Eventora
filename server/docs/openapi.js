// OpenAPI 3.0 description of the Eventora REST API (v1).
//
// Served as JSON at GET /api/v1/openapi.json and rendered interactively by
// Swagger UI at GET /api/v1/docs (see index.js). Written by hand against the
// real routes/controllers; scripts/check-openapi.js diffs the paths declared
// here against the routes Express actually registers, so a route that is
// added/removed without updating this file is caught.

const bearer = [{ bearerAuth: [] }];

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });

const json = (schema) => ({ "application/json": { schema } });

const body = (schema, required = true) => ({ required, content: json(schema) });

const idParam = (name, description) => ({
    name, in: "path", required: true, description, schema: { type: "integer" }
});

const query = (name, schema, description) => ({
    name, in: "query", required: false, description, schema
});

// Standard error responses, reused per operation.
const err = {
    400: { description: "Validation failed", content: json(ref("Error")) },
    401: { description: "Missing, invalid or expired token", content: json(ref("Error")) },
    403: { description: "Authenticated but not allowed (wrong role, banned, or not the owner)", content: json(ref("Error")) },
    404: { description: "Resource not found", content: json(ref("Error")) },
    409: { description: "Conflict (e.g. date already booked)", content: json(ref("Error")) },
    429: { description: "Rate limit exceeded", content: json(ref("Error")) },
    500: { description: "Unexpected server error", content: json(ref("Error")) }
};

const pick = (...codes) => Object.fromEntries(codes.map((c) => [c, err[c]]));

const ok = (description, props = {}) => ({
    description,
    content: json({
        type: "object",
        properties: { success: { type: "boolean", example: true }, ...props }
    })
});

const op = (tag, summary, extra = {}) => ({ tags: [tag], summary, ...extra });

const paths = {

    // ---------------------------------------------------------------- AUTH
    "/auth/test": {
        get: op("Auth", "Auth route smoke test", {
            responses: { 200: ok("Route is mounted", { message: { type: "string" } }) }
        })
    },
    "/auth/register": {
        post: op("Auth", "Create an account", {
            description: "Rate limited (20 requests / 15 min / IP). `role` defaults to `customer`; only `customer` and `vendor` can self-register. A duplicate email returns 400 (\"User already exists\").",
            requestBody: body({
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                    name: { type: "string", example: "Asha Menon" },
                    email: { type: "string", format: "email" },
                    phone: { type: "string", example: "9876500009" },
                    password: { type: "string", format: "password", minLength: 6 },
                    role: { type: "string", enum: ["customer", "vendor"], default: "customer" }
                }
            }),
            responses: {
                201: ok("Account created", { message: { type: "string" }, user: ref("UserSummary") }),
                ...pick(400, 429, 500)
            }
        })
    },
    "/auth/login": {
        post: op("Auth", "Log in and receive a JWT", {
            description: "Rate limited (20 requests / 15 min / IP). Send the returned `token` as `Authorization: Bearer <token>` on protected routes. Banned accounts are refused with 403.",
            requestBody: body({
                type: "object",
                required: ["email", "password"],
                properties: {
                    email: { type: "string", format: "email", example: "priya@example.com" },
                    password: { type: "string", format: "password", example: "password123" }
                }
            }),
            responses: {
                200: ok("Logged in", { message: { type: "string" }, token: { type: "string" }, user: ref("UserSummary") }),
                ...pick(400, 403, 429, 500)
            }
        })
    },
    "/auth/profile": {
        put: op("Auth", "Update own name/email", {
            security: bearer,
            requestBody: body({
                type: "object",
                properties: { name: { type: "string" }, email: { type: "string", format: "email" } }
            }),
            responses: { 200: ok("Profile updated", { message: { type: "string" } }), ...pick(401, 500) }
        })
    },
    "/auth/change-password": {
        put: op("Auth", "Change own password", {
            security: bearer,
            requestBody: body({
                type: "object",
                required: ["oldPassword", "newPassword"],
                properties: {
                    oldPassword: { type: "string", format: "password" },
                    newPassword: { type: "string", format: "password" }
                }
            }),
            responses: { 200: ok("Password changed", { message: { type: "string" } }), ...pick(400, 401, 404, 500) }
        })
    },
    "/auth/delete-account": {
        delete: op("Auth", "Delete own account", {
            security: bearer,
            responses: { 200: ok("Account deleted", { message: { type: "string" } }), ...pick(401, 500) }
        })
    },
    "/auth/profile-image": {
        put: op("Auth", "Set own profile image URL", {
            description: "Takes an already-uploaded image URL (see `POST /upload/image`).",
            security: bearer,
            requestBody: body({
                type: "object",
                required: ["imageUrl"],
                properties: { imageUrl: { type: "string", format: "uri" } }
            }),
            responses: { 200: ok("Image updated", { message: { type: "string" } }), ...pick(401, 500) }
        })
    },

    // ------------------------------------------------------------- VENDORS
    "/vendors": {
        get: op("Vendors", "Search, filter, sort and paginate vendors", {
            description: "Public. Banned vendors are excluded and featured vendors are listed first. Page size is capped at 48.",
            parameters: [
                query("search", { type: "string" }, "Matches business name, category, city and description"),
                query("category", { type: "string" }),
                query("city", { type: "string" }),
                query("minRating", { type: "number", minimum: 0, maximum: 5 }),
                query("priceMin", { type: "integer" }, "Lower bound (INR) of the vendor's listed price range"),
                query("priceMax", { type: "integer" }),
                query("sort", { type: "string", enum: ["newest", "rating", "price", "price_low", "price_high"], default: "newest" }),
                query("page", { type: "integer", minimum: 1, default: 1 }),
                query("limit", { type: "integer", minimum: 1, maximum: 48, default: 9 })
            ],
            responses: {
                200: ok("A page of vendors", { vendors: { type: "array", items: ref("Vendor") }, pagination: ref("Pagination") }),
                ...pick(500)
            }
        })
    },
    "/vendors/create": {
        post: op("Vendors", "Create own vendor profile (vendor accounts only)", {
            description: "A second profile for the same account is refused with 400 (\"Vendor profile already exists\").",
            security: bearer,
            requestBody: body({
                type: "object",
                required: ["business_name", "category", "city"],
                properties: {
                    business_name: { type: "string" }, category: { type: "string" }, city: { type: "string" },
                    description: { type: "string" }, price_range: { type: "string", example: "₹50,000 - ₹1,50,000" },
                    portfolio_image: { type: "string", format: "uri" }
                }
            }),
            responses: { 201: ok("Profile created", { message: { type: "string" }, vendor: ref("Vendor") }), ...pick(400, 401, 403, 500) }
        })
    },
    "/vendors/edit": {
        put: op("Vendors", "Update own vendor profile (vendor accounts only)", {
            security: bearer,
            requestBody: body({
                type: "object",
                properties: {
                    business_name: { type: "string" }, category: { type: "string" }, city: { type: "string" },
                    description: { type: "string" }, price_range: { type: "string" },
                    portfolio_image: { type: "string", format: "uri" },
                    gallery_images: { type: "array", items: { type: "string", format: "uri" } }
                }
            }),
            responses: { 200: ok("Profile updated", { message: { type: "string" }, vendor: ref("Vendor") }), ...pick(400, 401, 403, 500) }
        })
    },
    "/vendors/related": {
        get: op("Vendors", "Vendors similar to a given one (same category)", {
            parameters: [query("category", { type: "string" }), query("vendorId", { type: "integer" }, "Excluded from the results")],
            responses: { 200: ok("Related vendors", { vendors: { type: "array", items: ref("Vendor") } }), ...pick(500) }
        })
    },
    "/vendors/recommended": {
        get: op("Vendors", "Personalised 'Recommended for You' vendors (customer accounts)", {
            description: "Based on the caller's own bookings, wishlist and views. `personalized` is false when there's no activity yet.",
            security: bearer,
            parameters: [query("limit", { type: "integer", maximum: 24, default: 8 })],
            responses: {
                200: ok("Recommendations", { vendors: { type: "array", items: ref("Vendor") }, personalized: { type: "boolean" } }),
                ...pick(401, 403, 500)
            }
        })
    },
    "/vendors/compare": {
        get: op("Vendors", "Side-by-side details for 2-4 vendors", {
            parameters: [query("ids", { type: "string", example: "1,2,3" }, "Comma-separated vendor ids (2-4, de-duplicated; invalid ids are ignored)")],
            responses: {
                200: ok("Vendors found, plus ids that were unavailable", {
                    vendors: { type: "array", items: ref("Vendor") },
                    missingIds: { type: "array", items: { type: "integer" } }
                }),
                ...pick(400, 500)
            }
        })
    },
    "/vendors/filters": {
        get: op("Vendors", "Distinct categories and cities for filter dropdowns", {
            responses: {
                200: ok("Filter options", {
                    categories: { type: "array", items: { type: "string" } },
                    cities: { type: "array", items: { type: "string" } }
                }),
                ...pick(500)
            }
        })
    },
    "/vendors/my-profile": {
        get: op("Vendors", "Own vendor profile (vendor accounts only)", {
            security: bearer,
            responses: { 200: ok("Profile", { vendor: ref("Vendor") }), ...pick(401, 403, 404, 500) }
        })
    },
    "/vendors/dashboard-stats": {
        get: op("Vendors", "Own dashboard KPIs (vendor accounts only)", {
            description: "Booking counts by status, rating, review count, profile views, response rate, estimated revenue and profile-completion checklist.",
            security: bearer,
            responses: { 200: ok("KPIs", { stats: { type: "object", additionalProperties: true } }), ...pick(401, 403, 404, 500) }
        })
    },
    "/vendors/availability/block": {
        post: op("Availability", "Block one of your own dates (vendor accounts only)", {
            description: "Idempotent. Refused with 400 if you already have a confirmed booking on that date, or the date is in the past. The vendor is always taken from the JWT, never the body.",
            security: bearer,
            requestBody: body({
                type: "object",
                required: ["date"],
                properties: { date: { type: "string", format: "date", example: "2027-01-20" }, reason: { type: "string" } }
            }),
            responses: { 201: ok("Date blocked", { message: { type: "string" } }), ...pick(400, 401, 403, 404, 500) }
        })
    },
    "/vendors/availability/block/{date}": {
        delete: op("Availability", "Unblock one of your own dates (vendor accounts only)", {
            security: bearer,
            parameters: [{ name: "date", in: "path", required: true, schema: { type: "string", format: "date" } }],
            responses: { 200: ok("Date unblocked", { message: { type: "string" } }), ...pick(401, 403, 404, 500) }
        })
    },
    "/vendors/{id}": {
        get: op("Vendors", "Public vendor details", {
            description: "Counts a profile view when the caller is logged in as someone other than the vendor.",
            security: [{}, ...bearer],
            parameters: [idParam("id", "Vendor id")],
            responses: { 200: ok("Vendor", { vendor: ref("Vendor") }), ...pick(400, 404, 500) }
        })
    },
    "/vendors/{id}/availability": {
        get: op("Availability", "Dates a vendor can't be booked (public)", {
            description: "Future CONFIRMED-booking dates and the vendor's own blocked dates. Pending/approved requests are deliberately excluded so browsing never leaks another customer's in-progress negotiation.",
            parameters: [idParam("id", "Vendor id")],
            responses: {
                200: ok("Unavailable dates", {
                    bookedDates: { type: "array", items: { type: "string", format: "date" } },
                    blockedDates: {
                        type: "array",
                        items: { type: "object", properties: { date: { type: "string", format: "date" }, reason: { type: "string", nullable: true } } }
                    }
                }),
                ...pick(404, 500)
            }
        })
    },

    // ------------------------------------------------------------ BOOKINGS
    "/bookings/create": {
        post: op("Bookings", "Request a booking (customer accounts only)", {
            description: "Refused with 409 if the vendor is already confirmed-booked or has blocked that date. A vendor cannot book their own business.",
            security: bearer,
            requestBody: body({
                type: "object",
                required: ["vendor_id", "event_date", "event_type", "guest_count"],
                properties: {
                    vendor_id: { type: "integer" },
                    event_date: { type: "string", format: "date" },
                    event_type: { type: "string", example: "Wedding" },
                    guest_count: { type: "integer", minimum: 1 },
                    message: { type: "string" }
                }
            }),
            responses: { 201: ok("Booking requested", { message: { type: "string" }, booking: ref("Booking") }), ...pick(400, 401, 403, 404, 409, 500) }
        })
    },
    "/bookings/vendor": {
        get: op("Bookings", "Bookings received by the logged-in vendor", {
            security: bearer,
            responses: {
                200: ok("Bookings", { count: { type: "integer" }, bookings: { type: "array", items: ref("Booking") } }),
                ...pick(401, 403, 404, 500)
            }
        })
    },
    "/bookings/customer": {
        get: op("Bookings", "Bookings made by the logged-in customer", {
            security: bearer,
            responses: {
                200: ok("Bookings", { count: { type: "integer" }, bookings: { type: "array", items: ref("Booking") } }),
                ...pick(401, 403, 500)
            }
        })
    },
    "/bookings/{bookingId}/status": {
        put: op("Bookings", "Vendor moves a booking forward or ends it", {
            description: "Lifecycle: `pending → approved → confirmed → completed`; `rejected`/`cancelled` are terminal. The vendor may set approved, rejected, completed or cancelled. `reason` is required when cancelling.",
            security: bearer,
            parameters: [idParam("bookingId", "Booking id")],
            requestBody: body({
                type: "object",
                required: ["status"],
                properties: { status: { type: "string", enum: ["approved", "rejected", "completed", "cancelled"] }, reason: { type: "string" } }
            }),
            responses: { 200: ok("Status updated", { message: { type: "string" } }), ...pick(400, 401, 403, 404, 500) }
        })
    },
    "/bookings/{bookingId}/customer-status": {
        put: op("Bookings", "Customer confirms or cancels their booking", {
            description: "`confirmed` is the lock-in: it is re-checked against the vendor's other confirmed bookings and returns 409 if the date was taken meanwhile. `reason` is required when cancelling.",
            security: bearer,
            parameters: [idParam("bookingId", "Booking id")],
            requestBody: body({
                type: "object",
                required: ["status"],
                properties: { status: { type: "string", enum: ["confirmed", "cancelled"] }, reason: { type: "string" } }
            }),
            responses: { 200: ok("Status updated", { message: { type: "string" } }), ...pick(400, 401, 403, 404, 409, 500) }
        })
    },
    "/bookings/{bookingId}/reschedule": {
        post: op("Bookings", "Propose a new date (either side)", {
            security: bearer,
            parameters: [idParam("bookingId", "Booking id")],
            requestBody: body({
                type: "object",
                required: ["new_date"],
                properties: { new_date: { type: "string", format: "date" }, message: { type: "string" } }
            }),
            responses: { 200: ok("Proposal sent", { message: { type: "string" } }), ...pick(400, 401, 403, 404, 500) }
        })
    },
    "/bookings/{bookingId}/reschedule/respond": {
        put: op("Bookings", "Accept or decline the other side's proposed date", {
            description: "Accepting onto a date the vendor is already confirmed-booked for returns 409 and leaves the booking unchanged.",
            security: bearer,
            parameters: [idParam("bookingId", "Booking id")],
            requestBody: body({
                type: "object",
                required: ["action"],
                properties: { action: { type: "string", enum: ["accept", "decline"] } }
            }),
            responses: { 200: ok("Response recorded", { message: { type: "string" } }), ...pick(400, 401, 403, 404, 409, 500) }
        })
    },
    "/bookings/{bookingId}/history": {
        get: op("Bookings", "Audit timeline of a booking (customer or vendor on it)", {
            security: bearer,
            parameters: [idParam("bookingId", "Booking id")],
            responses: {
                200: ok("Timeline", {
                    history: {
                        type: "array",
                        items: { type: "object", additionalProperties: true }
                    }
                }),
                ...pick(401, 403, 404, 500)
            }
        })
    },

    // ---------------------------------------------------------------- CHAT
    "/chat/conversations/list": {
        get: op("Chat", "Conversation list for the logged-in user", {
            security: bearer,
            responses: { 200: ok("Conversations", { conversations: { type: "array", items: { type: "object", additionalProperties: true } } }), ...pick(401, 500) }
        })
    },
    "/chat/{roomId}": {
        get: op("Chat", "Message history of a room you belong to", {
            description: "Room ids look like `chat-v{vendorId}-c{customerId}`. Live messaging itself happens over Socket.io (JWT in `auth.token`), not REST.",
            security: bearer,
            parameters: [{ name: "roomId", in: "path", required: true, schema: { type: "string", example: "chat-v1-c1" } }],
            responses: { 200: ok("Messages", { messages: { type: "array", items: ref("Message") } }), ...pick(401, 403, 500) }
        })
    },
    "/chat-upload": {
        post: op("Chat", "Upload a file to attach to a chat message", {
            security: bearer,
            requestBody: {
                required: true,
                content: {
                    "multipart/form-data": {
                        schema: { type: "object", required: ["file"], properties: { file: { type: "string", format: "binary" } } }
                    }
                }
            },
            responses: { 200: ok("Uploaded", { fileUrl: { type: "string", format: "uri" } }), ...pick(400, 401, 500) }
        })
    },

    // ------------------------------------------------------------- REVIEWS
    "/reviews/create": {
        post: op("Reviews", "Review a vendor you have a confirmed/completed booking with", {
            description: "One review per customer per vendor (a repeat returns 400). Refused with 403 until a booking with that vendor is confirmed or completed.",
            security: bearer,
            requestBody: body({
                type: "object",
                required: ["vendor_id", "rating", "review"],
                properties: {
                    vendor_id: { type: "integer" },
                    rating: { type: "integer", minimum: 1, maximum: 5 },
                    review: { type: "string" }
                }
            }),
            responses: { 201: ok("Review added", { message: { type: "string" } }), ...pick(400, 401, 403, 500) }
        })
    },
    "/reviews/vendor/{vendorId}": {
        get: op("Reviews", "All reviews for a vendor", {
            parameters: [idParam("vendorId", "Vendor id")],
            responses: { 200: ok("Reviews", { reviews: { type: "array", items: ref("Review") } }), ...pick(500) }
        })
    },
    "/reviews/stats/{vendorId}": {
        get: op("Reviews", "Average rating and review count for a vendor", {
            parameters: [idParam("vendorId", "Vendor id")],
            responses: { 200: ok("Stats", { stats: { type: "object", additionalProperties: true } }), ...pick(500) }
        })
    },

    // ------------------------------------------------------------- UPLOADS
    "/upload/image": {
        post: op("Uploads", "Upload an image (stored on Cloudinary)", {
            security: bearer,
            requestBody: {
                required: true,
                content: {
                    "multipart/form-data": {
                        schema: { type: "object", required: ["image"], properties: { image: { type: "string", format: "binary" } } }
                    }
                }
            },
            responses: { 200: ok("Uploaded", { imageUrl: { type: "string", format: "uri" } }), ...pick(400, 401, 500) }
        })
    },

    // ------------------------------------------------------------- AI CHAT
    "/ai-chat": {
        post: op("AI Assistant", "Ask the Eventora Assistant (Gemini)", {
            description: "Public but rate limited (30 requests / 15 min / IP) because each call hits a billed external API. Answers are grounded in real vendors matched from the database. The Gemini key stays on the server.",
            requestBody: body({
                type: "object",
                required: ["message"],
                properties: {
                    message: { type: "string", example: "Photographers in Jaipur under 1 lakh?" },
                    history: { type: "array", items: { type: "object", additionalProperties: true } }
                }
            }),
            responses: { 200: ok("Assistant reply", { reply: { type: "string" } }), ...pick(400, 429, 500) }
        })
    },

    // ------------------------------------------------------------ WISHLIST
    "/wishlist": {
        get: op("Wishlist", "Own saved vendors (customer accounts)", {
            security: bearer,
            responses: { 200: ok("Saved vendors", { vendors: { type: "array", items: ref("Vendor") } }), ...pick(401, 500) }
        })
    },
    "/wishlist/ids": {
        get: op("Wishlist", "Ids of own saved vendors (for heart toggles)", {
            security: bearer,
            responses: { 200: ok("Ids", { vendorIds: { type: "array", items: { type: "integer" } } }), ...pick(401, 500) }
        })
    },
    "/wishlist/add": {
        post: op("Wishlist", "Save a vendor (customer accounts)", {
            security: bearer,
            requestBody: body({ type: "object", required: ["vendor_id"], properties: { vendor_id: { type: "integer" } } }),
            responses: { 201: ok("Saved", { message: { type: "string" } }), ...pick(400, 401, 404, 500) }
        })
    },
    "/wishlist/{vendorId}": {
        delete: op("Wishlist", "Remove a saved vendor", {
            security: bearer,
            parameters: [idParam("vendorId", "Vendor id")],
            responses: { 200: ok("Removed", { message: { type: "string" } }), ...pick(401, 500) }
        })
    },

    // ------------------------------------------------------------- PLANNER
    "/planner/options": {
        get: op("Planner", "Event types, their categories and the input limits (customer accounts)", {
            description: "Lets the UI be driven by the server's own planning rules.",
            security: bearer,
            responses: {
                200: ok("Planner options", {
                    eventTypes: { type: "array", items: { type: "object", properties: { name: { type: "string" }, categories: { type: "array", items: { type: "string" } } } } },
                    limits: { type: "object", additionalProperties: { type: "integer" } }
                }),
                ...pick(401, 403, 500)
            }
        })
    },
    "/planner/generate": {
        post: op("Planner", "Generate a budget breakdown with real vendor recommendations (customer accounts)", {
            description: "Splits the budget across categories using event-type rules, then ranks the **real** vendors in the database for each category (price fit, rating, reviews, featured). With `event_date`, vendors with a confirmed booking or a manual block that day are left out. `plan.ai_summary` is written by Gemini from those facts when it is reachable; otherwise `ai_source` is `fallback` and `ai_summary` is null (the numbers, picks and checklist are always returned). Nothing is saved. Rate limited (15 requests / 15 min / IP).",
            security: bearer,
            requestBody: body(ref("PlannerInputs")),
            responses: {
                200: ok("Generated plan", { inputs: ref("PlannerInputs"), plan: ref("PlannerPlan") }),
                ...pick(400, 401, 403, 429, 500)
            }
        })
    },
    "/planner/plans": {
        get: op("Planner", "Own saved plans, newest first (customer accounts)", {
            security: bearer,
            responses: { 200: ok("Saved plans", { plans: { type: "array", items: ref("SavedPlanSummary") } }), ...pick(401, 403, 500) }
        }),
        post: op("Planner", "Save a plan (customer accounts)", {
            description: "Send the same inputs as `/planner/generate` (plus optionally the `ai_summary` text shown). The breakdown and vendor picks are rebuilt server-side from the database, never taken from the client. Max 30 saved plans per account (409 beyond that).",
            security: bearer,
            requestBody: body({
                allOf: [ref("PlannerInputs"), { type: "object", properties: { ai_summary: { type: "string", maxLength: 3000 } } }]
            }),
            responses: { 201: ok("Saved", { message: { type: "string" }, plan: ref("SavedPlan") }), ...pick(400, 401, 403, 409, 500) }
        })
    },
    "/planner/plans/{id}": {
        get: op("Planner", "One saved plan with its full result", {
            description: "404 for any plan that isn't the caller's own.",
            security: bearer,
            parameters: [idParam("id", "Plan id")],
            responses: { 200: ok("The plan", { plan: ref("SavedPlan") }), ...pick(401, 403, 404, 500) }
        }),
        delete: op("Planner", "Delete a saved plan", {
            description: "404 for any plan that isn't the caller's own.",
            security: bearer,
            parameters: [idParam("id", "Plan id")],
            responses: { 200: ok("Deleted", { message: { type: "string" } }), ...pick(401, 403, 404, 500) }
        })
    },

    // ------------------------------------------------------------- HISTORY
    "/history/view/{vendorId}": {
        post: op("History", "Record that you viewed a vendor", {
            security: bearer,
            parameters: [idParam("vendorId", "Vendor id")],
            responses: { 201: ok("Recorded", { message: { type: "string" } }), ...pick(401, 404, 500) }
        })
    },
    "/history/recently-viewed": {
        get: op("History", "Vendors you recently viewed", {
            security: bearer,
            responses: { 200: ok("Vendors", { vendors: { type: "array", items: ref("Vendor") } }), ...pick(401, 500) }
        })
    },
    "/history/recently-contacted": {
        get: op("History", "Vendors you recently messaged", {
            security: bearer,
            responses: { 200: ok("Vendors", { vendors: { type: "array", items: ref("Vendor") } }), ...pick(401, 500) }
        })
    },

    // ------------------------------------------------------- NOTIFICATIONS
    "/notifications": {
        get: op("Notifications", "Own notification history", {
            description: "New notifications are also pushed live over Socket.io.",
            security: bearer,
            parameters: [query("limit", { type: "integer", default: 30 })],
            responses: {
                200: ok("Notifications", { notifications: { type: "array", items: ref("Notification") }, unread_count: { type: "integer" } }),
                ...pick(401, 500)
            }
        })
    },
    "/notifications/read-all": {
        put: op("Notifications", "Mark all own notifications read", {
            security: bearer,
            responses: { 200: ok("Updated", {}), ...pick(401, 500) }
        })
    },
    "/notifications/{id}/read": {
        put: op("Notifications", "Mark one own notification read", {
            security: bearer,
            parameters: [idParam("id", "Notification id")],
            responses: { 200: ok("Updated", {}), ...pick(401, 404, 500) }
        })
    },
    "/notifications/{id}": {
        delete: op("Notifications", "Delete one own notification", {
            security: bearer,
            parameters: [idParam("id", "Notification id")],
            responses: { 200: ok("Deleted", {}), ...pick(401, 404, 500) }
        })
    },

    // --------------------------------------------------------------- ADMIN
    "/admin/stats": {
        get: op("Admin", "Platform KPIs", {
            security: bearer,
            responses: { 200: ok("Stats", { stats: { type: "object", additionalProperties: true } }), ...pick(401, 403, 500) }
        })
    },
    "/admin/users": {
        get: op("Admin", "List users", {
            security: bearer,
            parameters: [
                query("role", { type: "string", enum: ["customer", "vendor", "admin"] }),
                query("status", { type: "string", enum: ["active", "banned"] }),
                query("search", { type: "string" }, "Matches name or email (literal text, not a pattern)"),
                query("page", { type: "integer" }), query("limit", { type: "integer" }),
                query("sort", { type: "string" }, "Whitelisted sort key (varies per list); unknown keys fall back to the default"), query("dir", { type: "string", enum: ["asc", "desc"] })
            ],
            responses: {
                200: ok("Users", { users: { type: "array", items: { type: "object", additionalProperties: true } }, pagination: ref("Pagination") }),
                ...pick(401, 403, 500)
            }
        })
    },
    "/admin/users/{id}/ban": {
        put: op("Admin", "Suspend an account", {
            description: "The account loses access immediately, including with an existing token.",
            security: bearer,
            parameters: [idParam("id", "User id")],
            requestBody: body({ type: "object", required: ["reason"], properties: { reason: { type: "string", description: "Required; shown to the user as the suspension reason" } } }),
            responses: { 200: ok("Banned", { message: { type: "string" } }), ...pick(400, 401, 403, 404, 500) }
        })
    },
    "/admin/users/{id}/unban": {
        put: op("Admin", "Restore a suspended account", {
            security: bearer,
            parameters: [idParam("id", "User id")],
            responses: { 200: ok("Unbanned", { message: { type: "string" } }), ...pick(401, 403, 404, 500) }
        })
    },
    "/admin/users/{id}": {
        get: op("Admin", "One account with its vendor profile, booking tallies and recent bookings", {
            description: "The password hash is never returned.",
            security: bearer,
            parameters: [idParam("id", "User id")],
            responses: {
                200: ok("User detail", {
                    user: { type: "object", additionalProperties: true },
                    vendor_profile: { type: "object", nullable: true, additionalProperties: true },
                    bookings_as_customer: { type: "object", additionalProperties: true },
                    bookings_as_vendor: { type: "object", additionalProperties: true },
                    reviews_written: { type: "integer" },
                    recent_bookings: { type: "array", items: { type: "object", additionalProperties: true } }
                }),
                ...pick(400, 401, 403, 404, 500)
            }
        }),
        delete: op("Admin", "Delete an account", {
            security: bearer,
            parameters: [idParam("id", "User id")],
            responses: { 200: ok("Deleted", { message: { type: "string" } }), ...pick(400, 401, 403, 404, 500) }
        })
    },
    "/admin/vendors": {
        get: op("Admin", "List vendors (including banned owners)", {
            security: bearer,
            parameters: [
                query("search", { type: "string" }, "Business name or owner email"),
                query("category", { type: "string" }), query("city", { type: "string" }),
                query("status", { type: "string", enum: ["active", "inactive", "featured"] }),
                query("page", { type: "integer" }), query("limit", { type: "integer" }),
                query("sort", { type: "string" }, "Whitelisted sort key (varies per list); unknown keys fall back to the default"), query("dir", { type: "string", enum: ["asc", "desc"] })
            ],
            responses: { 200: ok("Vendors", { vendors: { type: "array", items: { type: "object", additionalProperties: true } }, pagination: ref("Pagination") }), ...pick(401, 403, 500) }
        })
    },
    "/admin/vendors/{id}/feature": {
        put: op("Admin", "Feature or un-feature a vendor", {
            security: bearer,
            parameters: [idParam("id", "Vendor id")],
            requestBody: body({ type: "object", required: ["featured"], properties: { featured: { type: "boolean" } } }),
            responses: { 200: ok("Updated", { message: { type: "string" } }), ...pick(400, 401, 403, 404, 500) }
        })
    },
    "/admin/vendors/{id}/status": {
        put: op("Admin", "Deactivate or reactivate a business listing", {
            description: "An inactive listing is hidden from browse, details, recommendations, comparison, the planner, the AI assistant, wishlist and history, and can't receive new booking requests. Existing bookings are untouched. The owner is notified. Different from suspending the owner's account.",
            security: bearer,
            parameters: [idParam("id", "Vendor id")],
            requestBody: body({ type: "object", required: ["active"], properties: { active: { type: "boolean" }, reason: { type: "string", maxLength: 500, description: "Required when active is false" } } }),
            responses: { 200: ok("Updated", { message: { type: "string" }, vendor: { type: "object", additionalProperties: true } }), ...pick(400, 401, 403, 404, 500) }
        })
    },
    "/admin/vendors/{id}": {
        delete: op("Admin", "Delete a vendor profile", {
            security: bearer,
            parameters: [idParam("id", "Vendor id")],
            responses: { 200: ok("Deleted", { message: { type: "string" } }), ...pick(401, 403, 404, 500) }
        })
    },
    "/admin/bookings": {
        get: op("Admin", "List all bookings", {
            security: bearer,
            parameters: [
                query("status", { type: "string", enum: ["pending", "approved", "confirmed", "completed", "rejected", "cancelled"] }),
                query("search", { type: "string" }, "Customer name, vendor business, event type, or an exact booking id"),
                query("page", { type: "integer" }), query("limit", { type: "integer" }),
                query("sort", { type: "string" }, "Whitelisted sort key (varies per list); unknown keys fall back to the default"), query("dir", { type: "string", enum: ["asc", "desc"] })
            ],
            responses: { 200: ok("Bookings", { bookings: { type: "array", items: { type: "object", additionalProperties: true } }, pagination: ref("Pagination") }), ...pick(401, 403, 500) }
        })
    },
    "/admin/bookings/{id}": {
        get: op("Admin", "One booking with both parties, cancellation details and its status history", {
            security: bearer,
            parameters: [idParam("id", "Booking id")],
            responses: { 200: ok("Booking detail", { booking: { type: "object", additionalProperties: true }, history: { type: "array", items: { type: "object", additionalProperties: true } } }), ...pick(400, 401, 403, 404, 500) }
        })
    },
    "/admin/reviews": {
        get: op("Admin", "Review overview (read-only)", {
            security: bearer,
            parameters: [
                query("rating", { type: "integer", minimum: 1, maximum: 5 }),
                query("search", { type: "string" }, "Review text, vendor business or reviewer name"),
                query("page", { type: "integer" }), query("limit", { type: "integer" }),
                query("sort", { type: "string" }, "Whitelisted sort key (varies per list); unknown keys fall back to the default"), query("dir", { type: "string", enum: ["asc", "desc"] })
            ],
            responses: { 200: ok("Reviews", { reviews: { type: "array", items: { type: "object", additionalProperties: true } }, pagination: ref("Pagination") }), ...pick(401, 403, 500) }
        })
    },
    "/admin/audit-log": {
        get: op("Admin", "Audit trail of admin actions, newest first", {
            description: "Records ban/unban/delete of users, feature/unfeature/activate/deactivate/delete of vendors and force-cancelled bookings, with the acting admin taken from the JWT.",
            security: bearer,
            parameters: [query("page", { type: "integer" }), query("limit", { type: "integer" })],
            responses: { 200: ok("Entries", { entries: { type: "array", items: { type: "object", additionalProperties: true } }, pagination: ref("Pagination") }), ...pick(401, 403, 500) }
        })
    },
    "/admin/bookings/{id}/cancel": {
        put: op("Admin", "Force-cancel a booking (both sides are notified)", {
            security: bearer,
            parameters: [idParam("id", "Booking id")],
            requestBody: body({ type: "object", required: ["reason"], properties: { reason: { type: "string", description: "Required; sent to both parties" } } }),
            responses: { 200: ok("Cancelled", { message: { type: "string" } }), ...pick(400, 401, 403, 404, 500) }
        })
    },

    // -------------------------------------------------------------- SYSTEM
    "/health": {
        get: op("System", "Liveness check", {
            description: "Public, never touches the database.",
            responses: {
                200: ok("Healthy", {
                    message: { type: "string" },
                    version: { type: "string", example: "v1" },
                    uptimeSeconds: { type: "integer" }
                })
            }
        })
    }
};

const schemas = {
    PlannerInputs: {
        type: "object",
        required: ["event_type", "budget", "guest_count", "city"],
        properties: {
            event_type: { type: "string", example: "Wedding", description: "One of the names returned by /planner/options" },
            budget: { type: "integer", minimum: 10000, maximum: 100000000, example: 1000000, description: "Total budget in rupees" },
            guest_count: { type: "integer", minimum: 1, maximum: 5000, example: 300 },
            city: { type: "string", maxLength: 80, example: "Jaipur" },
            event_date: { type: "string", format: "date", nullable: true, description: "Optional; today or later. Enables availability filtering and book-by dates." },
            categories: { type: "array", items: { type: "string" }, description: "Optional subset of the event type's categories; defaults to all of them." },
            notes: { type: "string", maxLength: 300 }
        }
    },
    PlannerVendorPick: {
        type: "object",
        properties: {
            id: { type: "integer" },
            business_name: { type: "string" },
            category: { type: "string" },
            city: { type: "string" },
            price_range: { type: "string", nullable: true },
            portfolio_image: { type: "string", nullable: true },
            avg_rating: { type: "number" },
            review_count: { type: "integer" },
            is_featured: { type: "boolean" },
            fit: { type: "string", enum: ["comfortable", "within", "stretch", "over", "unknown"], description: "How the vendor's listed price compares with this category's allocation" },
            score: { type: "number", description: "0-1 ranking score" },
            reasons: { type: "array", items: { type: "string" } },
            outOfCity: { type: "boolean", description: "True when the city has no vendors for this category and this one is from elsewhere" }
        }
    },
    PlannerPlan: {
        type: "object",
        properties: {
            allocation: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        category: { type: "string" },
                        amount: { type: "integer", description: "Rupees; all amounts add up to exactly the budget" },
                        percent: { type: "number" },
                        vendor_pool: { type: "string", enum: ["city", "other_cities", "none"] },
                        vendors_considered: { type: "integer" },
                        vendors_unavailable: { type: "integer", description: "Left out because they are booked or blocked on event_date" },
                        vendors: { type: "array", items: ref("PlannerVendorPick") }
                    }
                }
            },
            insights: { type: "array", items: { type: "object", properties: { type: { type: "string", enum: ["info", "warning"] }, message: { type: "string" } } } },
            checklist: { type: "array", items: { type: "object", properties: { when: { type: "string" }, task: { type: "string" }, urgent: { type: "boolean" } } } },
            ai_summary: { type: "string", nullable: true },
            ai_source: { type: "string", enum: ["gemini", "fallback"] },
            generated_at: { type: "string", format: "date-time" }
        }
    },
    SavedPlanSummary: {
        type: "object",
        properties: {
            id: { type: "integer" },
            title: { type: "string" },
            inputs: ref("PlannerInputs"),
            created_at: { type: "string", format: "date-time" }
        }
    },
    SavedPlan: {
        type: "object",
        properties: {
            id: { type: "integer" },
            title: { type: "string" },
            inputs: ref("PlannerInputs"),
            result: ref("PlannerPlan"),
            created_at: { type: "string", format: "date-time" }
        }
    },
    Error: {
        type: "object",
        properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Something went wrong. Please try again." }
        }
    },
    Pagination: {
        type: "object",
        properties: {
            page: { type: "integer" }, limit: { type: "integer" },
            total: { type: "integer" }, total_pages: { type: "integer" }
        }
    },
    UserSummary: {
        type: "object",
        properties: {
            id: { type: "integer" }, name: { type: "string" }, email: { type: "string" },
            role: { type: "string", enum: ["customer", "vendor", "admin"] }
        }
    },
    Vendor: {
        type: "object",
        properties: {
            id: { type: "integer" }, user_id: { type: "integer" }, business_name: { type: "string" },
            category: { type: "string" }, city: { type: "string" }, description: { type: "string" },
            price_range: { type: "string", example: "₹50,000 - ₹1,50,000" },
            portfolio_image: { type: "string", nullable: true },
            gallery_images: { type: "array", items: { type: "string" } },
            profile_views: { type: "integer" }, is_featured: { type: "boolean" },
            created_at: { type: "string", format: "date-time" }
        },
        additionalProperties: true
    },
    Booking: {
        type: "object",
        properties: {
            id: { type: "integer" }, customer_id: { type: "integer" }, vendor_id: { type: "integer" },
            event_date: { type: "string", format: "date" }, event_type: { type: "string" },
            guest_count: { type: "integer" }, message: { type: "string", nullable: true },
            booking_status: { type: "string", enum: ["pending", "approved", "confirmed", "completed", "rejected", "cancelled"] },
            reschedule_proposed_date: { type: "string", format: "date", nullable: true },
            reschedule_proposed_by: { type: "string", nullable: true },
            cancelled_by: { type: "string", nullable: true }, cancellation_reason: { type: "string", nullable: true },
            created_at: { type: "string", format: "date-time" }
        },
        additionalProperties: true
    },
    Review: {
        type: "object",
        properties: {
            id: { type: "integer" }, vendor_id: { type: "integer" }, rating: { type: "integer", minimum: 1, maximum: 5 },
            review: { type: "string", nullable: true }, created_at: { type: "string", format: "date-time" }
        },
        additionalProperties: true
    },
    Notification: {
        type: "object",
        properties: {
            id: { type: "integer" }, type: { type: "string" }, title: { type: "string" },
            message: { type: "string" }, link: { type: "string", nullable: true },
            is_read: { type: "boolean" }, created_at: { type: "string", format: "date-time" }
        }
    },
    Message: {
        type: "object",
        properties: {
            id: { type: "integer" }, room_id: { type: "string" }, sender_id: { type: "integer" },
            sender_name: { type: "string" }, message: { type: "string" },
            file_url: { type: "string", nullable: true }, seen: { type: "boolean" },
            created_at: { type: "string", format: "date-time" }
        }
    }
};

const spec = {
    openapi: "3.0.3",
    info: {
        title: "Eventora API",
        version: "1.0.0",
        description: [
            "REST API behind the Eventora wedding & event vendor marketplace.",
            "",
            "**Authentication** - call `POST /auth/login`, then click **Authorize** and paste the returned `token`. ",
            "Identity and role always come from the JWT; no endpoint trusts a user/vendor id from the request body.",
            "",
            "**Responses** - every response has a boolean `success`; errors are `{ success: false, message }`.",
            "",
            "**Versioning** - this is v1 (`/api/v1`). The unversioned `/api` prefix is a deprecated alias.",
            "",
            "**Real time** - chat messages, typing/online status and live notifications use Socket.io, not REST."
        ].join("\n")
    },
    servers: [{ url: "/api/v1", description: "This server" }],
    tags: [
        "Auth", "Vendors", "Availability", "Bookings", "Chat", "Reviews", "Uploads",
        "AI Assistant", "Planner", "Wishlist", "History", "Notifications", "Admin", "System"
    ].map((name) => ({ name })),
    paths,
    components: {
        securitySchemes: {
            bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
        },
        schemas
    }
};

module.exports = spec;
