const express = require("express");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const { sendMessage } = require("../controllers/aiChatController");

// This endpoint calls a billed external API (Gemini) and has no auth
// requirement, so without a limiter here a single visitor - or a script -
// could run up real cost with unlimited requests. Noticeably stricter
// than the general API ceiling in index.js.
const aiChatLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many AI chat requests. Please slow down and try again shortly." }
});

// POST /api/ai-chat  -> { message, history } -> { reply }
router.post("/", aiChatLimiter, sendMessage);

module.exports = router;
