// "No new lint problems" gate for CI.
//
// The codebase carries a known backlog of lint errors (mostly React's newer
// `set-state-in-effect` / `only-export-components` rules, from the established
// fetch-in-useEffect pattern used across the app). Failing CI on that backlog
// would make the check useless, and hiding the rules would bury the problem.
// Instead this fails only if a rule's error/warning count goes UP versus
// lint-baseline.json (or a brand-new rule starts firing). When you fix some,
// lower the numbers in the baseline (run with --update) so the gain is locked in.
//
//   npm run lint:ci            # check
//   npm run lint:ci -- --update  # rewrite the baseline to the current counts

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const baselinePath = path.join(__dirname, "..", "lint-baseline.json");

let output;
try {
    output = execSync("npx eslint . -f json", { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, cwd: path.join(__dirname, "..") });
} catch (e) {
    // eslint exits 1 when it finds problems; the JSON is still on stdout.
    output = e.stdout;
    if (!output) { console.error("ESLint failed to run:", e.message); process.exit(2); }
}

const counts = {};
for (const file of JSON.parse(output)) {
    for (const m of file.messages) {
        const rule = m.ruleId || "(parse error)";
        counts[rule] = (counts[rule] || 0) + 1;
    }
}

if (process.argv.includes("--update")) {
    fs.writeFileSync(baselinePath, JSON.stringify(counts, null, 2) + "\n");
    console.log("Baseline updated:", counts);
    process.exit(0);
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
const regressions = [];
const improvements = [];

for (const rule of new Set([...Object.keys(counts), ...Object.keys(baseline)])) {
    const now = counts[rule] || 0;
    const was = baseline[rule] || 0;
    if (now > was) regressions.push(`${rule}: ${was} -> ${now}`);
    if (now < was) improvements.push(`${rule}: ${was} -> ${now}`);
}

const total = Object.values(counts).reduce((a, b) => a + b, 0);
console.log(`Lint problems: ${total} (baseline ${Object.values(baseline).reduce((a, b) => a + b, 0)})`);

if (improvements.length) {
    console.log("\nFewer problems than the baseline - lock it in with `npm run lint:ci -- --update`:\n  " + improvements.join("\n  "));
}
if (regressions.length) {
    console.error("\nNew lint problems introduced:\n  " + regressions.join("\n  ") + "\n\nRun `npx eslint .` to see them.");
    process.exit(1);
}
console.log("No new lint problems.");
