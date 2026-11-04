// Where the backend lives. Defaults to the local dev server, so nothing
// changes for `npm run dev`; Docker/production builds override it at build
// time with VITE_API_URL (the public URL the BROWSER uses to reach the API,
// e.g. https://api.example.com). Only the URL is configured here - it's baked
// into the public bundle, so never put a secret in a VITE_* variable.
export const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");

// Versioned REST base (see server/routes/v1.js).
export const API_BASE_URL = `${API_ORIGIN}/api/v1`;

// Socket.io lives on the same origin as the REST API.
export const SOCKET_URL = API_ORIGIN;
