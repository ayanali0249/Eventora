const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const {
    addToWishlist,
    removeFromWishlist,
    getWishlist,
    getWishlistIds
} = require("../controllers/wishlistController");

router.get("/", authMiddleware, requireRole("customer"), getWishlist);
router.get("/ids", authMiddleware, requireRole("customer"), getWishlistIds);
router.post("/add", authMiddleware, requireRole("customer"), addToWishlist);
router.delete("/:vendorId", authMiddleware, requireRole("customer"), removeFromWishlist);

module.exports = router;
