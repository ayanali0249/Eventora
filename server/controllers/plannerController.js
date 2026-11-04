const pool = require("../config/db");
const { parsePriceRange } = require("../utils/priceParser");
const { EVENT_TYPES, LIMITS } = require("../utils/plannerRules");
const {
    money,
    allocateBudget,
    rankVendors,
    buildInsights,
    buildChecklist
} = require("../utils/plannerEngine");
const { generateText } = require("../utils/gemini");

const SERVER_ERROR = "Something went wrong. Please try again.";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const todayStr = () => new Date().toISOString().slice(0, 10);

const isRealDate = (s) => {
    if (!DATE_RE.test(s)) return false;
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

// Validates and normalises the request body. Returns { inputs } or { error }.
// Nothing here is identity-related: who is planning always comes from the JWT.
function validateInputs(body) {

    const b = body || {};
    const eventType = typeof b.event_type === "string" ? b.event_type.trim() : "";

    if (!EVENT_TYPES[eventType]) {
        return { error: `Event type must be one of: ${Object.keys(EVENT_TYPES).join(", ")}` };
    }

    const budget = Number(b.budget);
    if (!Number.isInteger(budget) || budget < LIMITS.minBudget || budget > LIMITS.maxBudget) {
        return { error: `Budget must be a whole number of rupees between ${money(LIMITS.minBudget)} and ${money(LIMITS.maxBudget)}` };
    }

    const guests = Number(b.guest_count);
    if (!Number.isInteger(guests) || guests < LIMITS.minGuests || guests > LIMITS.maxGuests) {
        return { error: `Guest count must be a whole number between ${LIMITS.minGuests} and ${LIMITS.maxGuests}` };
    }

    const city = typeof b.city === "string" ? b.city.trim() : "";
    if (!city) return { error: "City is required" };
    if (city.length > LIMITS.maxCityLength) return { error: `City must be at most ${LIMITS.maxCityLength} characters` };

    let eventDate = null;
    if (b.event_date !== undefined && b.event_date !== null && b.event_date !== "") {
        if (typeof b.event_date !== "string" || !isRealDate(b.event_date)) {
            return { error: "Event date must be a valid date (YYYY-MM-DD)" };
        }
        if (b.event_date < todayStr()) {
            return { error: "Event date cannot be in the past" };
        }
        eventDate = b.event_date;
    }

    const offered = Object.keys(EVENT_TYPES[eventType]);
    let categories = offered;
    if (b.categories !== undefined && b.categories !== null) {
        if (!Array.isArray(b.categories) || b.categories.length === 0) {
            return { error: "Pick at least one category" };
        }
        const unique = [...new Set(b.categories)];
        const bad = unique.find((c) => !offered.includes(c));
        if (bad !== undefined) {
            return { error: `"${String(bad).slice(0, 40)}" is not a category offered for ${eventType}` };
        }
        categories = offered.filter((c) => unique.includes(c));
    }

    let notes = "";
    if (b.notes !== undefined && b.notes !== null) {
        if (typeof b.notes !== "string") return { error: "Notes must be text" };
        notes = b.notes.trim();
        if (notes.length > LIMITS.maxNotes) return { error: `Notes must be at most ${LIMITS.maxNotes} characters` };
    }

    return {
        inputs: {
            event_type: eventType,
            budget,
            guest_count: guests,
            city,
            event_date: eventDate,
            categories,
            notes
        }
    };
}

// One query for every vendor in the chosen categories, with real review
// aggregates and - when a date was given - whether they're taken that day
// (a confirmed booking or a manual block: the same two rules as
// utils/availability.js, done in bulk so a plan costs one query, not one per
// vendor). Banned vendors are excluded, as on the public browse page.
async function fetchVendors(categories, eventDate) {

    const result = await pool.query(
        `
        SELECT
            vendors.id,
            vendors.business_name,
            vendors.category,
            vendors.city,
            vendors.price_range,
            vendors.portfolio_image,
            vendors.is_featured,
            COALESCE(ROUND(AVG(reviews.rating)::numeric, 1), 0) AS avg_rating,
            COUNT(reviews.id)::int AS review_count,
            (
                $2::date IS NOT NULL AND (
                    EXISTS (
                        SELECT 1 FROM bookings
                        WHERE bookings.vendor_id = vendors.id
                          AND bookings.event_date = $2::date
                          AND bookings.booking_status = 'confirmed'
                    )
                    OR EXISTS (
                        SELECT 1 FROM vendor_blocked_dates
                        WHERE vendor_blocked_dates.vendor_id = vendors.id
                          AND vendor_blocked_dates.blocked_date = $2::date
                    )
                )
            ) AS unavailable
        FROM vendors
        JOIN users ON users.id = vendors.user_id
        LEFT JOIN reviews ON reviews.vendor_id = vendors.id
        WHERE vendors.category = ANY($1::text[])
          AND users.is_banned = FALSE
          AND vendors.is_active = TRUE
        GROUP BY vendors.id
        `,
        [categories, eventDate]
    );

    return result.rows.map((v) => ({
        ...v,
        avg_rating: Number(v.avg_rating),
        price: parsePriceRange(v.price_range)
    }));
}

const VENDOR_FIELDS = [
    "id", "business_name", "category", "city", "price_range", "portfolio_image",
    "avg_rating", "review_count", "is_featured", "fit", "score", "reasons", "outOfCity"
];

const publicVendor = (v) => {
    const out = {};
    VENDOR_FIELDS.forEach((k) => { out[k] = v[k]; });
    out.outOfCity = Boolean(v.outOfCity);
    return out;
};

// Builds the deterministic part of a plan from real data.
async function buildPlan(inputs, now = new Date()) {

    const allocation = allocateBudget(inputs.event_type, inputs.categories, inputs.budget);
    const vendors = await fetchVendors(inputs.categories, inputs.event_date);
    const ctx = { city: inputs.city, eventDate: inputs.event_date };

    const results = {};

    const slices = allocation.map((slice) => {

        const all = vendors.filter((v) => v.category === slice.category);
        const available = all.filter((v) => !v.unavailable);
        const ranked = rankVendors(available, slice.amount, ctx, LIMITS.vendorsPerCategory);

        // Vendors in the city who are taken on the date (not out-of-city ones
        // that merely aren't being shown).
        const cityAll = all.filter((v) => String(v.city || "").trim().toLowerCase() === inputs.city.toLowerCase());
        const unavailableCount = (cityAll.length > 0 ? cityAll : all).filter((v) => v.unavailable).length;

        results[slice.category] = { ...ranked, unavailableCount };

        return {
            category: slice.category,
            amount: slice.amount,
            percent: slice.percent,
            vendor_pool: ranked.poolScope,
            vendors_considered: ranked.candidateCount,
            vendors_unavailable: unavailableCount,
            vendors: ranked.picks.map(publicVendor)
        };
    });

    const insights = buildInsights({ inputs, allocation, results, now });
    const checklist = buildChecklist({
        eventType: inputs.event_type,
        eventDate: inputs.event_date,
        categories: inputs.categories,
        now
    });

    return {
        allocation: slices,
        insights,
        checklist,
        ai_summary: null,
        ai_source: "fallback",
        generated_at: now.toISOString()
    };
}

const SUMMARY_SYSTEM = `
You are the planning assistant inside Eventora, an event-vendor marketplace.
You are given a customer's event details, a budget breakdown and the real
vendors Eventora has picked for each category. Write a short, friendly
summary (at most 120 words, plain text, no markdown, no bullet characters)
that: states the overall approach, points out the one or two biggest
trade-offs or risks, and names the single most important thing to do first.

CRITICAL RULES:
- Use ONLY the facts supplied. Never invent vendors, prices, contact details,
  discounts or availability.
- Only mention a vendor by the exact business name given.
- Do not change any rupee amounts you are given.
`;

function summaryPrompt(inputs, plan) {

    const lines = plan.allocation.map((a) => {
        const picks = a.vendors.length
            ? a.vendors.map((v) => `${v.business_name} (${v.price_range || "no price listed"}, ${v.fit})`).join("; ")
            : "no vendors available";
        return `- ${a.category}: ${money(a.amount)} (${a.percent}%) -> ${picks}`;
    });

    return [
        `Event: ${inputs.event_type} in ${inputs.city}`,
        `Budget: ${money(inputs.budget)} for ${inputs.guest_count} guests`,
        inputs.event_date ? `Date: ${inputs.event_date}` : "Date: not decided yet",
        inputs.notes ? `Customer notes: ${inputs.notes}` : "",
        "",
        "Breakdown and picks:",
        ...lines,
        "",
        "Observations:",
        ...plan.insights.map((i) => `- ${i.message}`)
    ].filter((l) => l !== "").join("\n");
}

const planTitle = (inputs) =>
    `${inputs.event_type} · ${inputs.city} · ${money(inputs.budget)}`.slice(0, 160);

// GET /planner/options - lets the UI be driven by the server's own rules.
const getOptions = (req, res) => {

    const eventTypes = Object.entries(EVENT_TYPES).map(([name, weights]) => ({
        name,
        categories: Object.keys(weights)
    }));

    res.json({
        success: true,
        eventTypes,
        limits: LIMITS
    });
};

// POST /planner/generate
const generatePlan = async (req, res) => {

    try {

        const { inputs, error } = validateInputs(req.body);

        if (error) {
            return res.status(400).json({ success: false, message: error });
        }

        const plan = await buildPlan(inputs);

        const narrative = await generateText({
            system: SUMMARY_SYSTEM,
            prompt: summaryPrompt(inputs, plan)
        });

        if (narrative) {
            plan.ai_summary = narrative;
            plan.ai_source = "gemini";
        }

        res.json({ success: true, inputs, plan });

    } catch (error) {

        console.log("PLANNER GENERATE ERROR:", error);
        res.status(500).json({ success: false, message: SERVER_ERROR });
    }
};

// POST /planner/plans - saves a plan for the logged-in customer. The client
// only sends the inputs (and the AI summary text it was shown); the numbers
// and vendor picks are rebuilt here from the database, so a saved plan can
// never contain data the server didn't produce.
const savePlan = async (req, res) => {

    try {

        const { inputs, error } = validateInputs(req.body);

        if (error) {
            return res.status(400).json({ success: false, message: error });
        }

        const plan = await buildPlan(inputs);

        const summary = req.body.ai_summary;
        if (typeof summary === "string" && summary.trim() && summary.length <= 3000) {
            plan.ai_summary = summary.trim();
            plan.ai_source = "gemini";
        }

        // The cap check and the insert are one statement, so two quick
        // requests can't both slip under the limit.
        const inserted = await pool.query(
            `
            INSERT INTO event_plans (user_id, title, inputs, result)
            SELECT $1, $2, $3::jsonb, $4::jsonb
            WHERE (SELECT COUNT(*) FROM event_plans WHERE user_id = $1) < $5
            RETURNING id, title, inputs, created_at
            `,
            [req.user.id, planTitle(inputs), JSON.stringify(inputs), JSON.stringify(plan), LIMITS.maxSavedPlans]
        );

        if (inserted.rows.length === 0) {
            return res.status(409).json({
                success: false,
                message: `You can keep up to ${LIMITS.maxSavedPlans} saved plans. Delete one to save another.`
            });
        }

        res.status(201).json({
            success: true,
            message: "Plan saved",
            plan: { ...inserted.rows[0], result: plan }
        });

    } catch (error) {

        console.log("PLANNER SAVE ERROR:", error);
        res.status(500).json({ success: false, message: SERVER_ERROR });
    }
};

// GET /planner/plans
const listPlans = async (req, res) => {

    try {

        const result = await pool.query(
            `SELECT id, title, inputs, created_at
             FROM event_plans
             WHERE user_id = $1
             ORDER BY created_at DESC, id DESC`,
            [req.user.id]
        );

        res.json({ success: true, plans: result.rows });

    } catch (error) {

        console.log("PLANNER LIST ERROR:", error);
        res.status(500).json({ success: false, message: SERVER_ERROR });
    }
};

const parseId = (value) => (/^\d{1,9}$/.test(String(value)) ? Number(value) : null);

// GET /planner/plans/:id  (404 for anyone but the owner)
const getPlan = async (req, res) => {

    try {

        const id = parseId(req.params.id);

        if (id === null) {
            return res.status(404).json({ success: false, message: "Plan not found" });
        }

        const result = await pool.query(
            `SELECT id, title, inputs, result, created_at
             FROM event_plans
             WHERE id = $1 AND user_id = $2`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Plan not found" });
        }

        res.json({ success: true, plan: result.rows[0] });

    } catch (error) {

        console.log("PLANNER GET ERROR:", error);
        res.status(500).json({ success: false, message: SERVER_ERROR });
    }
};

// DELETE /planner/plans/:id  (404 for anyone but the owner)
const deletePlan = async (req, res) => {

    try {

        const id = parseId(req.params.id);

        if (id === null) {
            return res.status(404).json({ success: false, message: "Plan not found" });
        }

        const result = await pool.query(
            `DELETE FROM event_plans WHERE id = $1 AND user_id = $2 RETURNING id`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Plan not found" });
        }

        res.json({ success: true, message: "Plan deleted" });

    } catch (error) {

        console.log("PLANNER DELETE ERROR:", error);
        res.status(500).json({ success: false, message: SERVER_ERROR });
    }
};

module.exports = {
    validateInputs,
    getOptions,
    generatePlan,
    savePlan,
    listPlans,
    getPlan,
    deletePlan
};
