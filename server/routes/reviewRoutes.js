const express = require("express");

const router = express.Router();

const {

    addReview,

    getVendorReviews,

    getVendorReviewStats

} = require("../controllers/reviewController");

const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

// Only customers leave reviews
router.post(

    "/create",

    auth,

    requireRole("customer"),

    addReview

);

router.get(

    "/vendor/:vendorId",

    getVendorReviews

);

router.get(

"/stats/:vendorId",

getVendorReviewStats

);

module.exports = router;