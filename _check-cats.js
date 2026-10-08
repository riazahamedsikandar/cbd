const fs = require("fs");
const db = JSON.parse(fs.readFileSync("C:/Users/ho13431/AppData/Local/Temp/opencode/supabase_products_dump.json", "utf8"));

const catArrCounts = new Map();
let withAll = 0, withoutCatArray = 0, withInvalidCats = 0;
db.forEach(p => {
  const arr = p.categories;
  if (!Array.isArray(arr)) { withoutCatArray++; return; }
  const key = JSON.stringify(arr);
  catArrCounts.set(key, (catArrCounts.get(key) || 0) + 1);
  if (arr.includes("all")) withAll++;
  const validIds = new Set(["gummies","delta-9-gummies","delta-8-gummies","cbd-gummies","sleep-gummies","edibles","beverages","thc-drinks","cbd-drinks","shots-cocktails","vapes","disposables","cartridges","cbd-oils","cbd-tinctures","delta-9-tinctures","delta-8-tinctures","flower","topicals","pets","smoke-accessories"]);
  const invalid = arr.filter(c => !validIds.has(c) && c !== "all");
  if (invalid.length) withInvalidCats++;
});

console.log("products without categories array:", withoutCatArray);
console.log("products with 'all':", withAll);
console.log("products with invalid category ids:", withInvalidCats);
console.log("distinct categories arrays:", catArrCounts.size);
const sorted = [...catArrCounts.entries()].sort((a,b) => b[1]-a[1]);
sorted.slice(0, 30).forEach(([k,v]) => console.log("  ", v, "x", k));
