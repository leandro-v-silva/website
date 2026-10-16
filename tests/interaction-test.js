/* Interaction test: slicers must recompute measures to SQL-verified ground
 * truth, and the language toggle must translate the UI + localize number
 * formats. Run after tests/render-test.js (needs the local server).
 */
const { JSDOM } = require("jsdom");

const BASE = process.env.BASE_URL || "http://localhost:8000/";

/* Ground truth from DuckDB (see .github/workflows/ci.yml, which re-checks
 * these numbers on every run):
 *   SELECT round(sum(order_value),2), count(*), count(DISTINCT customer_id)
 *   FROM mart_orders WHERE year(order_date)=2010;                    -> y2010
 *   SELECT ... WHERE country='France';                               -> france
 * Japan (country idx 14) has no 2009 orders -> empty-selection guard. */
const TRUTH = {
  y2010: { revPrefix: "£8.37", orders: "18,325", customers: "4,231" },
  france: { revPrefix: "£349k", orders: "614", customers: "95" },
  allPt: { orders: "36.969" }, // pt-BR thousands separator
};

let pass = true;
const check = (name, cond, got) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  (got: " + got + ")"}`);
  if (!cond) pass = false;
};
const kpi = (doc, i) =>
  [...doc.querySelectorAll("#kpis .kpi .kpi-value")].map((e) => e.textContent)[i];
const click = (dom, el) => el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
const setCountry = (dom, document, value) => {
  const sel = document.getElementById("slicer-country");
  sel.value = String(value);
  sel.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
};
const yearChip = (document, year) =>
  [...document.querySelectorAll("#slicer-year .chip")].find((c) => c.dataset.year === String(year));

JSDOM.fromURL(BASE, {
  runScripts: "dangerously",
  resources: "usable",
  pretendToBeVisual: true,
}).then((dom) => {
  const { document } = dom.window;
  setTimeout(() => {
    check("initial: 6 KPI cards", document.querySelectorAll("#kpis .kpi").length === 6);
    check(
      "initial: all charts drawn",
      ["chart-revenue", "chart-newret", "chart-cohort", "chart-rfm", "chart-products", "chart-country"]
        .every((id) => document.querySelectorAll(`#${id} svg`).length === 1)
    );

    // year slicer = 2010 -> must match DuckDB ground truth
    click(dom, yearChip(document, 2010));
    setTimeout(() => {
      check("year=2010: revenue KPI", kpi(document, 0).startsWith(TRUTH.y2010.revPrefix), kpi(document, 0));
      check("year=2010: orders KPI", kpi(document, 1) === TRUTH.y2010.orders, kpi(document, 1));
      check("year=2010: customers KPI", kpi(document, 2) === TRUTH.y2010.customers, kpi(document, 2));

      // country slicer = France (idx 4), year back to All
      click(dom, yearChip(document, "all"));
      setCountry(dom, document, 4);
      setTimeout(() => {
        check("country=France: revenue KPI", kpi(document, 0).startsWith(TRUTH.france.revPrefix), kpi(document, 0));
        check("country=France: orders KPI", kpi(document, 1) === TRUTH.france.orders, kpi(document, 1));
        check("country=France: customers KPI", kpi(document, 2) === TRUTH.france.customers, kpi(document, 2));

        // empty-selection guard: Japan (idx 14) + 2009 = no data
        setCountry(dom, document, "all");
        click(dom, yearChip(document, 2009));
        setCountry(dom, document, 14);
        setTimeout(() => {
          const nodata = document.querySelectorAll(".nodata").length;
          check("empty combo: nodata state shown", nodata > 0, "nodata count=" + nodata);

          // language toggle -> PT with localized formats, slicers back to All
          setCountry(dom, document, "all");
          click(dom, yearChip(document, "all"));
          click(dom, [...document.querySelectorAll(".lang-btn")].find((b) => b.dataset.lang === "pt"));
          setTimeout(() => {
            check(
              "PT: title translated",
              document.querySelector("h1").textContent === "Análise de Marketing Varejista",
              document.querySelector("h1").textContent
            );
            check("PT: orders KPI localized", kpi(document, 1) === TRUTH.allPt.orders, kpi(document, 1));
            check(
              "PT: slicer labels",
              [...document.querySelectorAll(".slicer-label")].some((e) => e.textContent === "Ano")
            );
            check(
              "PT: RFM segment translated",
              [...document.querySelectorAll("#chart-rfm text")].some((t) => t.textContent === "Clientes fiéis")
            );

            console.log(pass ? "\n=== INTERACTION TEST PASSED ===" : "\n=== INTERACTION TEST FAILED ===");
            process.exit(pass ? 0 : 1);
          }, 400);
        }, 400);
      }, 400);
    }, 400);
  }, 2500);
});
