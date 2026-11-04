const express = require("express");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
    testAuth,
    registerUser,
    loginUser,
    updateProfile,
    changePassword,
    deleteAccount,
    updateProfileImage
} = require("../controllers/authController");

// Register/login are the classic brute-force, credential-stuffing, and
// fake-account-spam targets, so they get a much stricter limit than the
// rest of the API (set in index.js). Keyed per IP, so one person
// fumbling their password a few times never gets blocked - this is aimed
// at a script hammering the endpoint.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many attempts. Please try again in a few minutes." }
});

router.get("/test", testAuth);

router.post("/register", authLimiter, registerUser);

router.post("/login", authLimiter, loginUser);

router.put("/profile", auth, updateProfile);

router.put("/change-password", auth, changePassword);

router.delete("/delete-account", auth, deleteAccount);

router.put("/profile-image", auth, updateProfileImage);

module.exports = router;