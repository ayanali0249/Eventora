const express = require("express");

const router = express.Router();

const {

    addReview,

    getVendorReviews,

    getVendorReviewStats

} = require("../controllers/reviewController");

const auth = require("../middleware/authMiddleware");

router.post(

    "/create",

    auth,

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