const express = require("express");

const router = express.Router();

const {
    getMessages,
    getConversations
} = require("../controllers/chatController");
const authMiddleware = require("../middleware/authMiddleware");

// GET MY CONVERSATIONS (must come before /:roomId or it'd be swallowed)
router.get("/conversations/list", authMiddleware, getConversations);

// GET CHAT HISTORY (must be logged in)
router.get("/:roomId", authMiddleware, getMessages);

module.exports = router;