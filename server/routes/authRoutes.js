const express = require("express");

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

router.get("/test", testAuth);

router.post("/register", registerUser);

router.post("/login", loginUser);

router.put("/profile", auth, updateProfile);

router.put("/change-password", auth, changePassword);

router.delete("/delete-account", auth, deleteAccount);

router.put("/profile-image", auth, updateProfileImage);

module.exports = router;