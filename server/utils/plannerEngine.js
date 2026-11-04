// Pure planning logic for the Event Planner: no database, no network, no
// clock except where `now` is passed in - so every rule can be unit-tested
// (see test/plannerEngine.test.js). plannerController.js feeds it real data.

const {
    EVENT_TYPES,
    LEAN_CATERING_PER_GUEST,
    SHORT_NOTICE_DAYS,
    BOOK_AHEAD_DAYS
} = require("./plannerRules");

const money = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// "YYYY-MM-DD" -> UTC midnight ms (no timezone drift).
const dayMs = (dateStr) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
};

const toDateStr = (ms) => new Date(ms).toISOString().slice(0, 10);

const prettyDate = (dateStr) =>
    new Date(dayMs(dateStr)).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric", timeZone: "UTC"
    });

// -------------------------------------------------------------- allocation

// Splits `budget` across the chosen categories using the event type's
// weights, re-normalised over just those categories. Each amount is rounded
// down to a clean ₹100 and the leftover goes to the biggest slice, so the
// amounts always add up to exactly the budget.
function allocateBudget(eventType, categories, budget) {

    const weights = EVENT_TYPES[eventType];

    if (!weights) {
        throw new Error(`Unknown event type: ${eventType}`);
    }

    const chosen = categories.filter((c) => weights[c] > 0);

    if (chosen.length === 0) {
        throw new Error("No valid categories to allocate");
    }

    const totalWeight = chosen.reduce((sum, c) => sum + weights[c], 0);

    const slices = chosen.map((category) => {
        const share = weights[category] / totalWeight;
        return {
            category,
            share,
            amount: Math.floor((budget * share) / 100) * 100
        };
    });

    const allocated = slices.reduce((sum, s) => sum + s.amount, 0);
    const biggest = slices.reduce((a, b) => (b.amount > a.amount ? b : a));
    biggest.amount += budget - allocated;

    return slices
        .map((s) => ({ ...s, percent: Math.round((s.amount / budget) * 1000) / 10 }))
        .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category));
}

// ------------------------------------------------------------ vendor fit

// How a vendor's listed price compares with the money set aside for them.
//   comfortable: their top price is already within the allocation
//   within:      the allocation falls inside their range
//   stretch:     they start up to 25% above the allocation
//   over:        they start well above it
//   unknown:     no parseable price listed (never treated as free)
function fitStatus(price, allocation) {

    if (!price) return "unknown";
    if (price.max !== null && price.max <= allocation) return "comfortable";
    if (price.min <= allocation) return "within";
    if (price.min <= allocation * 1.25) return "stretch";
    return "over";
}

const FIT_SCORE = { within: 1, comfortable: 0.85, stretch: 0.5, unknown: 0.4, over: 0.1 };

// 0..1. Price fit matters most, then reputation, with a small nudge for
// featured vendors. Unreviewed vendors get a neutral rating, not zero.
function scoreVendor(vendor, fit) {

    const rating = vendor.review_count > 0 ? Number(vendor.avg_rating) / 5 : 0.5;
    const reviews = Math.min(vendor.review_count / 5, 1);

    return (
        0.5 * FIT_SCORE[fit] +
        0.3 * rating +
        0.12 * reviews +
        0.08 * (vendor.is_featured ? 1 : 0)
    );
}

function buildReasons(vendor, fit, allocation, ctx) {

    const reasons = [];
    const { price } = vendor;

    if (fit === "comfortable" || fit === "within") {
        reasons.push(`Lists ${vendor.price_range}, which fits your ${money(allocation)} allocation`);
    } else if (fit === "stretch") {
        reasons.push(`Starts at ${money(price.min)}, a stretch over your ${money(allocation)} allocation`);
    } else if (fit === "over") {
        reasons.push(`Starts at ${money(price.min)}, well above your ${money(allocation)} allocation`);
    } else {
        reasons.push("No price listed - ask for a quote");
    }

    if (vendor.review_count > 0) {
        reasons.push(`Rated ${Number(vendor.avg_rating).toFixed(1)} from ${vendor.review_count} review${vendor.review_count === 1 ? "" : "s"}`);
    } else {
        reasons.push("New on Eventora - no reviews yet");
    }

    if (vendor.is_featured) reasons.push("Featured vendor");

    if (ctx.eventDate) reasons.push(`Free on ${prettyDate(ctx.eventDate)}`);

    if (vendor.outOfCity) reasons.push(`Based in ${vendor.city}, not ${ctx.city}`);

    return reasons;
}

const sameCity = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

// Ranks the vendors of ONE category against its allocation. Only vendors in
// the customer's city are considered; if there are none at all, other cities
// are used instead and flagged, rather than showing an empty slot.
function rankVendors(vendors, allocation, ctx, limit) {

    const inCity = vendors.filter((v) => sameCity(v.city, ctx.city));
    const poolScope = inCity.length > 0 ? "city" : vendors.length > 0 ? "other_cities" : "none";
    const pool = (inCity.length > 0 ? inCity : vendors).map((v) => ({
        ...v,
        price: v.price || null,
        outOfCity: poolScope === "other_cities"
    }));

    const ranked = pool
        .map((v) => {
            const fit = fitStatus(v.price, allocation);
            return { ...v, fit, score: scoreVendor(v, fit) };
        })
        .sort((a, b) =>
            b.score - a.score ||
            Number(b.avg_rating) - Number(a.avg_rating) ||
            a.id - b.id
        );

    const picks = ranked.slice(0, limit).map((v) => ({
        ...v,
        score: Math.round(v.score * 100) / 100,
        reasons: buildReasons(v, v.fit, allocation, ctx)
    }));

    const knownMins = pool.filter((v) => v.price).map((v) => v.price.min);

    return {
        poolScope,
        candidateCount: pool.length,
        cheapestStart: knownMins.length ? Math.min(...knownMins) : null,
        picks
    };
}

// ---------------------------------------------------------------- insights

// Plain-language observations computed from the numbers - the facts a person
// would otherwise have to work out themselves.
function buildInsights({ inputs, allocation, results, now }) {

    const insights = [];
    const { budget, guest_count: guests, city, event_date: eventDate } = inputs;

    const catering = allocation.find((a) => a.category === "Catering");
    if (catering) {
        const perGuest = Math.round(catering.amount / guests);
        const lean = perGuest < LEAN_CATERING_PER_GUEST;
        insights.push({
            type: lean ? "warning" : "info",
            message: `Catering gets ${money(catering.amount)}, about ${money(perGuest)} per guest for ${guests} guests${lean ? " - on the lean side for a full meal" : ""}.`
        });
    }

    for (const a of allocation) {
        const r = results[a.category];

        if (r.poolScope === "none") {
            insights.push({ type: "warning", message: `No ${a.category} vendors are listed on Eventora yet.` });
        } else if (r.poolScope === "other_cities") {
            insights.push({
                type: "warning",
                message: r.unavailableCount > 0
                    ? `Every ${a.category} vendor in ${city} is already booked or blocked on ${prettyDate(eventDate)} - showing ones from other cities.`
                    : `No ${a.category} vendors in ${city} yet - showing ones from other cities.`
            });
        } else if (r.cheapestStart !== null && r.cheapestStart > a.amount) {
            insights.push({
                type: "warning",
                message: `The cheapest ${a.category} vendor in ${city} starts at ${money(r.cheapestStart)}, ${money(r.cheapestStart - a.amount)} above the ${money(a.amount)} set aside for it.`
            });
        }

        if (r.unavailableCount > 0 && r.poolScope !== "other_cities") {
            insights.push({
                type: "info",
                message: `${r.unavailableCount} ${a.category} vendor${r.unavailableCount === 1 ? " was" : "s were"} left out because ${r.unavailableCount === 1 ? "they are" : "they're"} already booked or blocked on ${prettyDate(eventDate)}.`
            });
        }
    }

    const tops = allocation.map((a) => results[a.category].picks[0]).filter((p) => p && p.price);
    const topMin = tops.reduce((sum, p) => sum + p.price.min, 0);
    const covered = tops.length;

    if (covered > 0) {
        const diff = budget - topMin;
        insights.push({
            type: diff >= 0 ? "info" : "warning",
            message: diff >= 0
                ? `The top picks start at ${money(topMin)} in total (${covered} of ${allocation.length} categories priced) - ${money(diff)} under your budget before any extras.`
                : `The top picks start at ${money(topMin)} in total (${covered} of ${allocation.length} categories priced) - ${money(-diff)} over your budget. Consider fewer categories, fewer guests or a higher budget.`
        });
    }

    if (eventDate) {
        const daysAway = Math.round((dayMs(eventDate) - dayMs(toDateStr(now))) / MS_PER_DAY);
        if (daysAway < SHORT_NOTICE_DAYS) {
            insights.push({
                type: "warning",
                message: `Your event is only ${daysAway} day${daysAway === 1 ? "" : "s"} away - short notice, so book the most important vendors first.`
            });
        }
    }

    return insights;
}

// -------------------------------------------------------------- checklist

const GENERIC_STEPS = {
    "Wedding": ["Fix the guest list and confirm the date with both families", "Finalise the menu and the day-of timeline"],
    "Engagement": ["Fix the guest list and confirm the date with both families", "Finalise the menu and the ceremony schedule"],
    "Sangeet / Mehendi Night": ["Fix the guest list and plan the performance order", "Finalise the menu and the music/sound schedule"],
    "Birthday Party": ["Fix the guest list and send invitations", "Plan the cake moment and activities"],
    "Anniversary": ["Fix the guest list and send invitations", "Plan the toast and any surprise moments"],
    "Corporate Event": ["Confirm attendee count and the agenda", "Arrange AV, signage and registration"],
    "Baby Shower": ["Fix the guest list and send invitations", "Plan the games and the cake moment"]
};

// Deterministic, date-aware to-do list. With an event date each vendor gets
// a "book by" date; without one it's expressed as lead time.
function buildChecklist({ eventType, eventDate, categories, now }) {

    const items = [];
    const today = dayMs(toDateStr(now));
    const eventMs = eventDate ? dayMs(eventDate) : null;

    const sorted = [...categories].sort((a, b) => (BOOK_AHEAD_DAYS[b] || 0) - (BOOK_AHEAD_DAYS[a] || 0));

    for (const category of sorted) {

        const lead = BOOK_AHEAD_DAYS[category] || 60;

        if (eventMs !== null) {
            const bookByMs = eventMs - lead * MS_PER_DAY;
            const late = bookByMs < today;
            items.push({
                when: late ? "As soon as possible" : `By ${prettyDate(toDateStr(bookByMs))}`,
                task: `Book ${category}`,
                urgent: late
            });
        } else {
            const months = Math.max(1, Math.round(lead / 30));
            items.push({ when: `About ${months} month${months === 1 ? "" : "s"} before`, task: `Book ${category}`, urgent: false });
        }
    }

    const steps = GENERIC_STEPS[eventType] || [];
    const weekBefore = eventMs !== null ? `By ${prettyDate(toDateStr(eventMs - 14 * MS_PER_DAY))}` : "2 weeks before";

    steps.forEach((task) => items.push({ when: weekBefore, task, urgent: false }));

    items.push({
        when: eventMs !== null ? `By ${prettyDate(toDateStr(eventMs - 7 * MS_PER_DAY))}` : "1 week before",
        task: "Confirm the final guest count with the venue and caterer",
        urgent: false
    });

    items.push({
        when: eventMs !== null ? prettyDate(toDateStr(eventMs - MS_PER_DAY)) : "The day before",
        task: "Reconfirm every vendor's arrival time and walk through the plan",
        urgent: false
    });

    return items;
}

module.exports = {
    money,
    allocateBudget,
    fitStatus,
    scoreVendor,
    rankVendors,
    buildInsights,
    buildChecklist
};
