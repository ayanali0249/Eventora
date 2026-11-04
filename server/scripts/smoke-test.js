// End-to-end smoke test against a RUNNING server (used by CI and handy after a
// deploy). Read-only apart from logging in, so it is safe to point at a
// database with demo data.
//
//   SMOKE_URL=http://localhost:5000 npm run smoke
//
// Expects the seeded demo accounts (password "password123"). Exit code 1 if
// any check fails.

const BASE = (process.env.SMOKE_URL || "http://localhost:5000").replace(/\/+$/, "");
const API = `${BASE}/api/v1`;

let failures = 0;

const check = (name, ok, detail = "") => {
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `  -> ${detail}`}`);
    if (!ok) failures++;
};

const call = async (path, { method = "GET", token, body, base = API } = {}) => {
    const res = await fetch(`${base}${path}`, {
        method,
        headers: {
            ...(body ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: body ? JSON.stringify(body) : undefined
    });
    let json = null;
    try { json = await res.json(); } catch { /* non-JSON */ }
    return { res, json };
};

const login = async (email) => {
    const { json } = await call("/auth/login", { method: "POST", body: { email, password: "password123" } });
    return json?.token;
};

(async () => {

    // liveness + platform basics
    let r = await call("/health");
    check("GET /health is 200 and success:true", r.res.status === 200 && r.json?.success === true, JSON.stringify(r.json));
    check("responses carry X-API-Version: v1", r.res.headers.get("x-api-version") === "v1");
    check("Helmet header X-Content-Type-Options: nosniff", r.res.headers.get("x-content-type-options") === "nosniff");
    check("X-Powered-By is not exposed", !r.res.headers.has("x-powered-by"));

    // public data
    r = await call("/vendors?limit=3");
    check("GET /vendors returns vendors + pagination", r.res.status === 200 && Array.isArray(r.json?.vendors) && r.json.vendors.length > 0 && r.json.pagination?.total > 0, `status ${r.res.status}`);

    r = await call("/vendors/1/availability");
    check("GET /vendors/1/availability returns date lists", r.res.status === 200 && Array.isArray(r.json?.bookedDates) && Array.isArray(r.json?.blockedDates), `status ${r.res.status}`);

    r = await call("/vendors/filters");
    check("GET /vendors/filters returns categories + cities", r.res.status === 200 && r.json?.categories?.length > 0 && r.json?.cities?.length > 0);

    // docs
    r = await call("/openapi.json");
    check("GET /openapi.json serves the spec", r.res.status === 200 && r.json?.openapi && Object.keys(r.json.paths || {}).length > 0);

    // error envelope + auth boundaries
    r = await call("/bookings/customer");
    check("protected route without token -> 401 {success:false}", r.res.status === 401 && r.json?.success === false);

    r = await call("/definitely-not-a-route");
    check("unknown route -> 404 {success:false,message}", r.res.status === 404 && r.json?.success === false && typeof r.json?.message === "string");

    r = await call("/auth/login", { method: "POST", body: { email: "priya@example.com", password: "wrong-password" } });
    check("wrong password -> 400 {success:false}", r.res.status === 400 && r.json?.success === false, `status ${r.res.status}`);

    // real login + role enforcement
    const customer = await login("priya@example.com");
    check("customer can log in and gets a token", typeof customer === "string" && customer.length > 20);

    if (customer) {
        r = await call("/bookings/customer", { token: customer });
        check("customer can list their bookings", r.res.status === 200 && Array.isArray(r.json?.bookings), `status ${r.res.status}`);

        r = await call("/bookings/vendor", { token: customer });
        check("customer is refused vendor bookings (403)", r.res.status === 403, `status ${r.res.status}`);

        r = await call("/admin/stats", { token: customer });
        check("customer is refused admin stats (403)", r.res.status === 403, `status ${r.res.status}`);

        // AI Event Planner (generates a plan but saves nothing)
        r = await call("/planner/generate", { method: "POST", token: customer, body: { event_type: "Birthday Party", budget: 200000, guest_count: 40, city: "Jaipur" } });
        const alloc = r.json?.plan?.allocation;
        check("planner builds a plan whose amounts add up to the budget", r.res.status === 200 && Array.isArray(alloc) && alloc.length > 0 && alloc.reduce((sum, a) => sum + a.amount, 0) === 200000, `status ${r.res.status}`);
        check("planner recommends real vendors and a checklist", Array.isArray(alloc) && alloc.some((a) => a.vendors.length > 0) && r.json?.plan?.checklist?.length > 0);

        r = await call("/planner/generate", { method: "POST", token: customer, body: { event_type: "Wedding", budget: 5 } });
        check("planner rejects an invalid budget (400)", r.res.status === 400 && r.json?.success === false, `status ${r.res.status}`);

        r = await call("/planner/plans/999999", { token: customer });
        check("planner: someone else's / missing plan -> 404", r.res.status === 404, `status ${r.res.status}`);
    }

    const vendorUser = await login("vendor1@example.com");
    if (vendorUser) {
        r = await call("/planner/generate", { method: "POST", token: vendorUser, body: { event_type: "Wedding", budget: 500000, guest_count: 100, city: "Jaipur" } });
        check("planner is customer-only (vendor gets 403)", r.res.status === 403, `status ${r.res.status}`);
    }

    const admin = await login("admin@example.com");
    if (admin) {
        r = await call("/admin/stats", { token: admin });
        check("admin can read platform stats", r.res.status === 200 && r.json?.success === true, `status ${r.res.status}`);
    } else {
        check("admin can log in", false, "no token (is the demo seed loaded?)");
    }

    // admin boundary: server-side only, never trust the UI
    r = await call("/admin/users");
    check("admin API without a token -> 401", r.res.status === 401, `status ${r.res.status}`);

    r = await call("/auth/register", { method: "POST", body: { name: "Nope", email: "smoke-admin-attempt@example.com", password: "secret123", role: "admin" } });
    check("public registration as admin is rejected (400)", r.res.status === 400 && r.json?.success === false, `status ${r.res.status}`);

    if (admin) {
        r = await call("/admin/users/not-a-number", { token: admin });
        check("admin API rejects a malformed id (400)", r.res.status === 400, `status ${r.res.status}`);

        r = await call("/admin/reviews?limit=1", { token: admin });
        check("admin can read the review overview", r.res.status === 200 && Array.isArray(r.json?.reviews), `status ${r.res.status}`);
    }

    // deprecated unversioned alias still works and says so
    r = await call("/vendors?limit=1", { base: `${BASE}/api` });
    check("legacy /api/vendors still works, flagged Deprecation", r.res.status === 200 && r.res.headers.get("deprecation") === "true");

    console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll smoke checks passed");
    process.exit(failures ? 1 : 0);

})().catch((e) => {
    console.error("Smoke test crashed:", e.message);
    process.exit(1);
});
