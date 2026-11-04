const express = require("express");

const router = express.Router();

const upload = require("../middleware/uploadMiddleware");
const authMiddleware = require("../middleware/authMiddleware");

const {
    uploadImage
} = require("../controllers/uploadController");

// Requires login: prevents random unauthenticated uploads consuming the
// project's shared Cloudinary quota. Used for vendor portfolio/gallery
// images and profile pictures, all of which already require a logged-in user.
router.post(
    "/image",
    authMiddleware,
    (req, res, next) => {
        upload.single("image")(req, res, (err) => {
            if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message || "Upload failed"
                });
            }
            next();
        });
    },
    uploadImage
);

module.exports = router;