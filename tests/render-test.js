/* Headless render test: JSDOM fetches the dashboard from a locally served
 * copy and executes the scripts exactly like a browser would
 * (runScripts: "dangerously" + resources: "usable").
 *
 * Usage: start `python3 -m http.server 8000 --directory report` first,
 * then `node tests/render-test.js` (or npm test).
 */
const { JSDOM } = require("jsdom");

const BASE = process.env.BASE_URL || "http://localhost:8000/";

let pass = true;
const check = (name, cond, got) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  (got: " + got + ")"}`);
  if (!cond) pass = false;
};

JSDOM.fromURL(BASE, {
  runScripts: "dangerously",
  resources: "usable",
  pretendToBeVisual: true,
}).then((dom) => {
  setTimeout(() => {
    const { document } = dom.window;

    const kpis = [...document.querySelectorAll("#kpis .kpi .kpi-value")].map((e) => e.textContent);
    const subs = [...document.querySelectorAll("#kpis .kpi .kpi-sub")].map((e) => e.textContent);
    console.log(`KPI cards (${kpis.length}):`);
    kpis.forEach((v, i) => console.log(`  ${v}  —  ${subs[i]}`));

    check("6 KPI cards rendered", kpis.length === 6, kpis.length);
    check("revenue KPI formatted (£)", kpis[0] && kpis[0].includes("£"), kpis[0]);

    console.log("charts:");
    for (const id of ["chart-revenue", "chart-newret", "chart-cohort", "chart-rfm", "chart-products", "chart-country"]) {
      const svg = document.querySelectorAll(`#${id} svg`);
      const shapes = svg.length ? svg[0].querySelectorAll("path,rect,circle,text").length : 0;
      console.log(`  ${id.padEnd(16)} svg:${svg.length} shapes:${shapes}`);
      if (!svg.length || !shapes) pass = false;
    }

    const tick = document.querySelector("#chart-revenue .axis text");
    const cohortText = [...document.querySelectorAll("#chart-cohort text")].map((t) => t.textContent).filter(Boolean);
    console.log("samples:");
    console.log("  revenue axis tick:", tick ? tick.textContent : "MISSING");
    console.log("  cohort labels     :", cohortText.slice(0, 4).join(", ") || "MISSING");
    console.log("  period badge      :", document.getElementById("period-badge").textContent);

    console.log(pass ? "\n=== RENDER TEST PASSED ===" : "\n=== RENDER TEST FAILED ===");
    process.exit(pass ? 0 : 1);
  }, 3000);
});
