const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const {
    recordVendorView,
    getRecentlyViewed,
    getRecentlyContacted
} = require("../controllers/historyController");

router.post("/view/:vendorId", authMiddleware, requireRole("customer"), recordVendorView);
router.get("/recently-viewed", authMiddleware, requireRole("customer"), getRecentlyViewed);
router.get("/recently-contacted", authMiddleware, requireRole("customer"), getRecentlyContacted);

module.exports = router;
