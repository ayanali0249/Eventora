const express = require("express");

const router = express.Router();

const authMiddleware = require(

"../middleware/authMiddleware"

);

const optionalAuth = require("../middleware/optionalAuth");

const requireRole = require("../middleware/roleMiddleware");

const {

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

} = require(

"../controllers/vendorController"

);

const {

getVendorAvailability,

blockDate,

unblockDate

} = require(

"../controllers/availabilityController"

);

// CREATE VENDOR

router.post(

"/create",

authMiddleware,

requireRole("vendor"),

createVendor

);

// EDIT VENDOR

router.put(

"/edit",

authMiddleware,

requireRole("vendor"),

updateVendorProfile

);

// GET VENDORS

router.get(

"/",

getAllVendors

);

router.get(

"/related",

getRelatedVendors

);

// Personalized picks for the logged-in customer, built from their own
// booking/wishlist/view history. Must be registered BEFORE "/:id" below,
// otherwise Express would match "recommended" as an :id value instead.
router.get(

"/recommended",

authMiddleware,

requireRole("customer"),

getRecommendedVendors

);

// Side-by-side comparison of 2-4 vendors by id. Public - no auth required,
// same as browsing /vendors itself. Must be registered BEFORE "/:id"
// below, otherwise Express would match "compare" as an :id value instead.
router.get(

"/compare",

compareVendors

);

// Distinct categories/cities actually in use, to power filter dropdowns
router.get(

"/filters",

getVendorFilters

);

router.get(

"/my-profile",

authMiddleware,

requireRole("vendor"),

getMyVendorProfile

);

// Real, DB-backed KPI numbers for the vendor dashboard (bookings by status,
// rating, profile views, response rate, estimated revenue, profile
// completion %). Must be registered BEFORE the "/:id" route below, otherwise
// Express would match "dashboard-stats" as an :id value instead.
router.get(

"/dashboard-stats",

authMiddleware,

requireRole("vendor"),

getVendorDashboardStats

);

// A vendor manages their own calendar's manual blackout dates. Must be
// registered BEFORE "/:id" and "/:id/availability" below, otherwise Express
// would match "availability" as an :id value instead.
router.post(

"/availability/block",

authMiddleware,

requireRole("vendor"),

blockDate

);

router.delete(

"/availability/block/:date",

authMiddleware,

requireRole("vendor"),

unblockDate

);

router.get(

"/:id",

optionalAuth,

getVendorById

);

// A vendor's availability calendar - public (same as the profile itself),
// so a prospective customer can see open dates before requesting a
// booking, and the vendor's own dashboard reuses this same endpoint with
// their own id to manage their calendar.
router.get(

"/:id/availability",

getVendorAvailability

);

module.exports = router;