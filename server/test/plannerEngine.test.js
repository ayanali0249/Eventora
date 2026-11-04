const test = require("node:test");
const assert = require("node:assert/strict");

const { EVENT_TYPES, CATEGORIES } = require("../utils/plannerRules");
const { parsePriceRange } = require("../utils/priceParser");
const {
    allocateBudget, fitStatus, rankVendors, buildInsights, buildChecklist
} = require("../utils/plannerEngine");

const NOW = new Date("2026-10-16T09:00:00Z");

const vendor = (id, over = {}) => ({
    id, business_name: `V${id}`, category: "Catering", city: "Jaipur",
    price_range: "₹1,00,000 - ₹2,00,000", avg_rating: 4, review_count: 3, is_featured: false,
    ...over,
    price: parsePriceRange(over.price_range !== undefined ? over.price_range : "₹1,00,000 - ₹2,00,000")
});

test("every event type's weights sum to 100 and use known categories", () => {
    for (const [name, weights] of Object.entries(EVENT_TYPES)) {
        assert.equal(Object.values(weights).reduce((a, b) => a + b, 0), 100, name);
        Object.keys(weights).forEach((c) => assert.ok(CATEGORIES.includes(c), `${name}: ${c}`));
    }
});

test("allocation always adds up to exactly the budget, in clean ₹100 steps", () => {
    for (const budget of [10000, 123456, 500000, 777777, 99999999]) {
        for (const type of Object.keys(EVENT_TYPES)) {
            const cats = Object.keys(EVENT_TYPES[type]);
            const slices = allocateBudget(type, cats, budget);
            assert.equal(slices.reduce((s, x) => s + x.amount, 0), budget, `${type} ${budget}`);
            assert.ok(slices.every((x) => x.amount >= 0));
        }
    }
});

test("allocation re-normalises over just the chosen categories", () => {
    const slices = allocateBudget("Wedding", ["Venue", "Catering"], 520000);
    assert.equal(slices.length, 2);
    assert.equal(slices[0].category, "Catering");
    assert.equal(slices[0].amount, 300000);
    assert.equal(slices[1].amount, 220000);
});

test("allocation rejects unknown event types and empty selections", () => {
    assert.throws(() => allocateBudget("Nope", ["Venue"], 100000));
    assert.throws(() => allocateBudget("Birthday Party", ["Mehendi Artist"], 100000));
});

test("price range parsing", () => {
    assert.deepEqual(parsePriceRange("₹50,000 - ₹1,50,000"), { min: 50000, max: 150000 });
    assert.deepEqual(parsePriceRange("₹75,000"), { min: 75000, max: 75000 });
    assert.deepEqual(parsePriceRange("₹2,00,000+"), { min: 200000, max: null });
    assert.equal(parsePriceRange("Contact us"), null);
    assert.equal(parsePriceRange(null), null);
});

test("fitStatus classifies price vs allocation", () => {
    assert.equal(fitStatus({ min: 10000, max: 50000 }, 60000), "comfortable");
    assert.equal(fitStatus({ min: 10000, max: 90000 }, 60000), "within");
    assert.equal(fitStatus({ min: 70000, max: 90000 }, 60000), "stretch");
    assert.equal(fitStatus({ min: 100000, max: 120000 }, 60000), "over");
    assert.equal(fitStatus({ min: 40000, max: null }, 60000), "within");
    assert.equal(fitStatus(null, 60000), "unknown");
});

const ctx = { city: "Jaipur", eventDate: null };

test("rankVendors prefers vendors whose price fits over better-rated ones that don't", () => {
    const fits = vendor(1, { price_range: "₹40,000 - ₹90,000", avg_rating: 3.5 });
    const pricey = vendor(2, { price_range: "₹3,00,000 - ₹4,00,000", avg_rating: 5, review_count: 10 });
    const r = rankVendors([pricey, fits], 100000, ctx, 3);
    assert.equal(r.picks[0].id, 1);
    assert.equal(r.picks[1].fit, "over");
    assert.equal(r.poolScope, "city");
});

test("rankVendors never treats a missing price as free", () => {
    const unpriced = vendor(1, { price_range: "Contact us", avg_rating: 5, review_count: 10 });
    const priced = vendor(2, { price_range: "₹40,000 - ₹90,000", avg_rating: 4 });
    const r = rankVendors([unpriced, priced], 100000, ctx, 3);
    assert.equal(r.picks[0].id, 2);
    assert.equal(r.picks.find((p) => p.id === 1).fit, "unknown");
});

test("rankVendors keeps to the city, and falls back (flagged) only when the city has none", () => {
    const here = vendor(1);
    const away = vendor(2, { city: "Delhi" });
    const local = rankVendors([away, here], 150000, ctx, 3);
    assert.deepEqual(local.picks.map((p) => p.id), [1]);
    const fallback = rankVendors([away], 150000, ctx, 3);
    assert.equal(fallback.poolScope, "other_cities");
    assert.equal(fallback.picks[0].outOfCity, true);
    assert.equal(rankVendors([], 150000, ctx, 3).poolScope, "none");
});

test("rankVendors respects the limit and is deterministic on ties", () => {
    const vs = [vendor(3), vendor(1), vendor(2), vendor(4)];
    const a = rankVendors(vs, 150000, ctx, 3).picks.map((p) => p.id);
    const b = rankVendors([...vs].reverse(), 150000, ctx, 3).picks.map((p) => p.id);
    assert.equal(a.length, 3);
    assert.deepEqual(a, b);
});

test("insights flag lean catering, short notice and out-of-reach categories", () => {
    const inputs = { budget: 200000, guest_count: 400, city: "Jaipur", event_date: "2026-10-30" };
    const allocation = [{ category: "Catering", amount: 100000 }];
    const results = { Catering: { poolScope: "city", cheapestStart: 150000, unavailableCount: 2, picks: [vendor(1, { fit: "over" })] } };
    const msgs = buildInsights({ inputs, allocation, results, now: NOW }).map((i) => i.message).join("\n");
    assert.match(msgs, /₹250 per guest/);
    assert.match(msgs, /lean side/);
    assert.match(msgs, /starts at ₹1,50,000/);
    assert.match(msgs, /2 Catering vendors were left out/);
    assert.match(msgs, /only 14 days away/);
});

test("checklist gives each category a book-by date, marking late ones urgent", () => {
    const items = buildChecklist({
        eventType: "Wedding", eventDate: "2026-12-01",
        categories: ["Venue", "Transportation"], now: NOW
    });
    const venue = items.find((i) => i.task === "Book Venue");
    const transport = items.find((i) => i.task === "Book Transportation");
    assert.equal(venue.urgent, true);
    assert.equal(venue.when, "As soon as possible");
    assert.equal(transport.urgent, false);
    assert.match(transport.when, /^By /);
    assert.equal(items.at(-1).task.startsWith("Reconfirm"), true);
});

test("checklist without a date uses lead times", () => {
    const items = buildChecklist({ eventType: "Birthday Party", eventDate: null, categories: ["Venue"], now: NOW });
    assert.match(items[0].when, /month/);
});
