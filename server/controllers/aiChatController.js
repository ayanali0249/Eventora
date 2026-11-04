const pool = require("../config/db");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-3.6-flash";

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_INSTRUCTION = `
You are "Eventora Assistant", a helpful AI chatbot embedded in the Eventora
event-vendor booking platform. Help users with questions about booking
vendors, how the platform works, and event planning tips.

You will sometimes be given a "REAL VENDOR DATA FROM EVENTORA" section below
the user's question, listing actual vendors from Eventora's own database that
matched their question. Base any vendor recommendations strictly on that
data (name, category, city, price range, description) when it is provided.

CRITICAL RULES:
- Never invent, guess, or make up business names, phone numbers, addresses,
  or contact details that are not in the provided vendor data.
- If no REAL VENDOR DATA is provided, or it's empty, tell the user you
  couldn't find a matching vendor on Eventora and suggest they browse the
  Vendors page or refine their search (e.g. by city or category).
- Do not claim to have searched the internet. You only know what's in
  Eventora's own database, shown to you below.
`;

// Pull a small set of plausibly-relevant vendors from our own DB based on
// keyword matching against category, city, business_name, description.
// We split the message into words so "photographer in Jaipur" can match
// a row where city = "Jaipur" and category = "Photography" separately.
const STOPWORDS = new Set([
    "the", "a", "an", "in", "at", "for", "of", "to", "and", "or", "is",
    "are", "i", "me", "my", "need", "want", "please", "find", "looking",
    "budget", "with",
]);

const findRelevantVendors = async (message) => {
    try {
        const words = message
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, " ")
            .split(/\s+/)
            .filter((w) => w.length > 2 && !STOPWORDS.has(w));

        if (words.length === 0) {
            return [];
        }

        // Build: (business_name ILIKE %w1% OR category ILIKE %w1% OR ...)
        //     OR (business_name ILIKE %w2% OR category ILIKE %w2% OR ...) ...
        const conditions = [];
        const values = [];
        let paramIndex = 1;

        words.forEach((word) => {
            conditions.push(
                `(business_name ILIKE $${paramIndex} OR category ILIKE $${paramIndex} OR city ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
            );
            values.push(`%${word}%`);
            paramIndex++;
        });

        const result = await pool.query(
            `
            SELECT business_name, category, city, price_range, description
            FROM vendors
            WHERE is_active = TRUE AND (${conditions.join(" OR ")})
            LIMIT 5
            `,
            values
        );

        return result.rows;
    } catch (error) {
        console.log("VENDOR LOOKUP ERROR:", error);
        return [];
    }
};

const sendMessage = async (req, res) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const { message, history } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                message: "Message is required",
            });
        }

        if (!apiKey) {
            return res.status(503).json({
                success: false,
                message: "The AI assistant is not available right now.",
            });
        }

        // Look up real vendors from our own DB that might match this question
        const vendors = await findRelevantVendors(message);

        let vendorContext = "";
        if (vendors.length > 0) {
            vendorContext =
                "\n\nREAL VENDOR DATA FROM EVENTORA:\n" +
                vendors
                    .map(
                        (v, i) =>
                            `${i + 1}. ${v.business_name} | Category: ${v.category} | City: ${v.city} | Price range: ${v.price_range} | ${v.description}`
                    )
                    .join("\n");
        } else {
            vendorContext = "\n\nREAL VENDOR DATA FROM EVENTORA: (none found matching this query)";
        }

        const contents = [];

        if (Array.isArray(history)) {
            history.forEach((h) => {
                contents.push({
                    role: h.sender === "bot" ? "model" : "user",
                    parts: [{ text: h.text }],
                });
            });
        }

        contents.push({
            role: "user",
            parts: [{ text: message + vendorContext }],
        });

        const response = await fetch(GEMINI_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
                contents,
                systemInstruction: {
                    parts: [{ text: SYSTEM_INSTRUCTION }],
                },
                generationConfig: {
                    temperature: 0.6,
                    maxOutputTokens: 512,
                },
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.log("GEMINI ERROR:", data);
            return res.status(500).json({
                success: false,
                message: "The AI assistant could not answer right now. Please try again.",
            });
        }

        const reply =
            data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            "Sorry, I couldn't come up with a response. Please try again.";

        return res.status(200).json({
            success: true,
            reply,
        });
    } catch (error) {
        console.log("AI CHAT ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });
    }
};

module.exports = {
    sendMessage,
};