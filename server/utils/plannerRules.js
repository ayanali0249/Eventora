// Static rules behind the Event Planner. Everything here is a plain rule of
// thumb - NOT market data - so it lives in one obvious place to tweak.
// How the money is split is decided here; WHICH vendors fill each slot is
// always decided from the real vendors in the database (plannerEngine.js).

// Must match the vendor categories used across the app.
const CATEGORIES = [
    "Venue",
    "Catering",
    "Decoration",
    "Photography",
    "Entertainment",
    "Makeup & Beauty",
    "Mehendi Artist",
    "Wedding Planning",
    "Invitations & Stationery",
    "Transportation"
];

// Relative share of the total budget each category usually takes, per event
// type. A category missing from an event type isn't offered for it. When the
// customer picks only some categories, the shares of the chosen ones are
// re-normalised, so the whole budget is always allocated.
const EVENT_TYPES = {
    "Wedding": {
        Venue: 22, Catering: 30, Decoration: 12, Photography: 10, Entertainment: 6,
        "Makeup & Beauty": 4, "Mehendi Artist": 2, "Wedding Planning": 8,
        "Invitations & Stationery": 2, Transportation: 4
    },
    "Engagement": {
        Venue: 20, Catering: 30, Decoration: 14, Photography: 12, Entertainment: 8,
        "Makeup & Beauty": 6, "Mehendi Artist": 2, "Wedding Planning": 4,
        "Invitations & Stationery": 2, Transportation: 2
    },
    "Sangeet / Mehendi Night": {
        Venue: 15, Catering: 25, Decoration: 15, Photography: 8, Entertainment: 22,
        "Makeup & Beauty": 5, "Mehendi Artist": 3, "Wedding Planning": 3,
        "Invitations & Stationery": 2, Transportation: 2
    },
    "Birthday Party": {
        Venue: 20, Catering: 35, Decoration: 18, Photography: 8, Entertainment: 15,
        "Invitations & Stationery": 4
    },
    "Anniversary": {
        Venue: 22, Catering: 32, Decoration: 15, Photography: 10, Entertainment: 14,
        "Makeup & Beauty": 4, "Invitations & Stationery": 3
    },
    "Corporate Event": {
        Venue: 30, Catering: 30, Decoration: 8, Photography: 8, Entertainment: 10,
        "Wedding Planning": 10, "Invitations & Stationery": 2, Transportation: 2
    },
    "Baby Shower": {
        Venue: 18, Catering: 32, Decoration: 24, Photography: 10, Entertainment: 8,
        "Mehendi Artist": 3, "Invitations & Stationery": 5
    }
};

// Guardrails on what the form may send.
const LIMITS = {
    minBudget: 10000,
    maxBudget: 100000000,
    minGuests: 1,
    maxGuests: 5000,
    maxNotes: 300,
    maxCityLength: 80,
    maxSavedPlans: 30,
    vendorsPerCategory: 3
};

// Below this catering spend per guest the plan is flagged as lean. A rule of
// thumb for a typical Indian event, deliberately only a soft warning.
const LEAN_CATERING_PER_GUEST = 500;

// An event this close leaves little time to book anyone.
const SHORT_NOTICE_DAYS = 30;

// How far ahead each kind of vendor usually needs booking (days before the
// event). Used for the "book by" dates in the checklist.
const BOOK_AHEAD_DAYS = {
    Venue: 180,
    Catering: 120,
    "Wedding Planning": 180,
    Photography: 120,
    Decoration: 90,
    Entertainment: 90,
    "Makeup & Beauty": 60,
    "Mehendi Artist": 45,
    "Invitations & Stationery": 60,
    Transportation: 30
};

// Sanity-check the table at load time so a typo in a weight fails loudly
// instead of quietly mis-allocating money.
for (const [eventType, weights] of Object.entries(EVENT_TYPES)) {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    if (total !== 100) {
        throw new Error(`plannerRules: weights for "${eventType}" add up to ${total}, expected 100`);
    }
    for (const category of Object.keys(weights)) {
        if (!CATEGORIES.includes(category)) {
            throw new Error(`plannerRules: unknown category "${category}" in "${eventType}"`);
        }
    }
}

module.exports = {
    CATEGORIES,
    EVENT_TYPES,
    LIMITS,
    LEAN_CATERING_PER_GUEST,
    SHORT_NOTICE_DAYS,
    BOOK_AHEAD_DAYS
};
