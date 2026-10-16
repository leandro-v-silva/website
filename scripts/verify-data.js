/* CI helper: verify that a freshly exported data.js is semantically
 * identical to the committed one (order-insensitive, so formatting or
 * key-order differences never produce false alarms).
 *
 *   node scripts/verify-data.js <committed.js> <regenerated.js>
 */
const fs = require("fs");

const [committedPath, regeneratedPath] = process.argv.slice(2);
if (!committedPath || !regeneratedPath) {
  console.error("usage: node scripts/verify-data.js <committed.js> <regenerated.js>");
  process.exit(2);
}

function load(path) {
  const sandbox = {};
  // data.js is `window.MARTS = {...};` — evaluate it with a fake window.
  new Function("window", fs.readFileSync(path, "utf8"))(sandbox);
  return sandbox.MARTS;
}

const stable = (v) =>
  v === null ? "null"
  : typeof v === "object" ? (Array.isArray(v) ? "[" : "{") + Object.keys(v).sort().map((k) => `${k}:${stable(v[k])}`).join(",") + (Array.isArray(v) ? "]" : "}")
  : String(v);

const a = load(committedPath);
const b = load(regeneratedPath);

for (const key of Object.keys(a)) {
  if (!(key in b)) {
    console.error(`FAIL: regenerated data.js is missing "${key}"`);
    process.exit(1);
  }
}

const orderKey = (x) =>
  JSON.stringify(
    x.orders
      .map((o) => [o.date, o.country, o.customer, o.value, o.items, o.lines])
      .sort() // multiset comparison: row sequence must not matter
  );

if (stable(a.countries) !== stable(b.countries) || orderKey(a) !== orderKey(b) ||
    stable(a.top_products) !== stable(b.top_products)) {
  console.error("FAIL: data.js is not reproducible — the committed file differs from a fresh ETL run.");
  console.error("Did etl/ or sql/ change without running `make export` and committing the result?");
  process.exit(1);
}

console.log(`OK: data.js reproducible (${b.orders.length.toLocaleString("en")} orders, ` +
            `${b.countries.length} countries, ${b.top_products.length} products)`);
