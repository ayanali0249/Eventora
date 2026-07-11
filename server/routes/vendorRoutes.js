const express = require("express");

const router = express.Router();

const authMiddleware = require(

"../middleware/authMiddleware"

);

const {

createVendor,

getAllVendors,

getVendorById,

getRelatedVendors,

updateVendorProfile,

getMyVendorProfile

} = require(

"../controllers/vendorController"

);

// CREATE VENDOR

router.post(

"/create",

authMiddleware,

createVendor

);

// EDIT VENDOR

router.put(

"/edit",

authMiddleware,

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

router.get(

"/my-profile",

authMiddleware,

getMyVendorProfile

);

router.get(

"/:id",

getVendorById

);

module.exports = router;