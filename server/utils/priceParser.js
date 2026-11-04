// Vendors store price_range as a free-text string such as
// "₹50,000 - ₹1,50,000" or "₹10,000+" (see server/db/seed.sql) - there is no
// separate numeric price column. To turn that into a usable number for the
// "Estimated Revenue" KPI without fabricating data, this pulls out every
// digit group, strips thousands separators, and returns the midpoint of the
// smallest/largest numbers found (or that single number if only one is
// found). Returns null when the string has no parseable number at all, so
// callers can skip vendors whose price_range is empty/free-text-only rather
// than silently treating them as ₹0.
function parsePriceRangeMidpoint(priceRangeStr) {

    if (!priceRangeStr || typeof priceRangeStr !== "string") {
        return null;
    }

    // Matches groups of digits that may contain commas, e.g. "1,50,000" or
    // "50000". Indian-style comma grouping (lakhs/crores) is handled fine
    // since we just strip every comma before parsing.
    const matches = priceRangeStr.match(/[\d][\d,]*/g);

    if (!matches || matches.length === 0) {
        return null;
    }

    const numbers = matches
        .map((group) => Number(group.replace(/,/g, "")))
        .filter((num) => Number.isFinite(num) && num > 0);

    if (numbers.length === 0) {
        return null;
    }

    const min = Math.min(...numbers);
    const max = Math.max(...numbers);

    return Math.round((min + max) / 2);
}

// Returns { min, max } from a free-text range, or null when nothing parseable.
// "₹50,000 - ₹1,50,000" -> { min: 50000, max: 150000 }; a single number is a
// fixed price ({ min: n, max: n }); "₹10,000+" is open-ended ({ min: 10000,
// max: null }). Used by the event planner to judge whether a vendor fits a
// budget allocation without inventing a price for vendors that list none.
function parsePriceRange(priceRangeStr) {

    if (!priceRangeStr || typeof priceRangeStr !== "string") {
        return null;
    }

    const matches = priceRangeStr.match(/[\d][\d,]*/g);

    if (!matches) {
        return null;
    }

    const numbers = matches
        .map((group) => Number(group.replace(/,/g, "")))
        .filter((num) => Number.isFinite(num) && num > 0);

    if (numbers.length === 0) {
        return null;
    }

    const min = Math.min(...numbers);
    const max = Math.max(...numbers);

    if (numbers.length === 1 && /\+\s*$/.test(priceRangeStr.trim())) {
        return { min, max: null };
    }

    return { min, max };
}

module.exports = { parsePriceRangeMidpoint, parsePriceRange };
