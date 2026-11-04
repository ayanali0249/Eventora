// Thin, failure-proof wrapper around the Gemini API for the Event Planner.
// The planner's numbers (budget split, vendor picks, checklist) are computed
// deterministically from real data; Gemini only writes a short narrative
// about them. So this helper NEVER throws: on a missing key, timeout,
// network error or a bad reply it returns null and the caller falls back to
// the built-in checklist. The key is read from the server environment only.

const GEMINI_MODEL = "gemini-3.6-flash";
const DEFAULT_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 12000;

async function generateText({ system, prompt, maxOutputTokens = 700 }) {

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return null;

    // GEMINI_API_BASE exists so tests can point at a local mock server.
    const base = (process.env.GEMINI_API_BASE || DEFAULT_API_BASE).replace(/\/$/, "");
    const url = `${base}/models/${GEMINI_MODEL}:generateContent`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                systemInstruction: { parts: [{ text: system }] },
                generationConfig: { temperature: 0.4, maxOutputTokens }
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            console.log("GEMINI PLANNER: HTTP", response.status);
            return null;
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        return typeof text === "string" && text.trim() ? text.trim() : null;

    } catch (error) {

        console.log("GEMINI PLANNER:", error.name === "AbortError" ? "timed out" : error.message);
        return null;

    } finally {

        clearTimeout(timer);
    }
}

module.exports = { generateText, GEMINI_MODEL };
