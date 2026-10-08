const fs = require("fs");

const db = JSON.parse(fs.readFileSync("C:/Users/ho13431/AppData/Local/Temp/opencode/supabase_products_dump.json", "utf8"));

function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", iq = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (c === '"') {
      if (iq && n === '"') { cell += '"'; i++; } else iq = !iq;
    } else if (c === "," && !iq) {
      row.push(cell); cell = "";
    } else if ((c === "\n" || c === "\r") && !iq) {
      if (c === "\r" && n === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const t = fs.readFileSync("TwoBudz_Products_Catalog_2026-08-08.csv", "utf8");
const rows = parseCSV(t).slice(1);

const cleanStr = (s) => (s || "").toLowerCase().trim().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// CSV records with ID (col 18), Slug (col 19), Name (col 0)
const csvRecs = rows.map(r => ({
  name: r[0] ? r[0].trim() : "",
  price: r[3],
  category: r[4] ? r[4].trim() : "",
  id: r[18] ? r[18].trim() : "",
  slug: r[19] ? r[19].trim() : "",
}));

const csvByName = new Map();
csvRecs.forEach(r => { if (r.name) csvByName.set(cleanStr(r.name), r); });
const csvBySlug = new Map();
csvRecs.forEach(r => { if (r.slug) csvBySlug.set(cleanStr(r.slug), r); });
const csvById = new Map();
csvRecs.forEach(r => { if (r.id) csvById.set(String(r.id).toLowerCase().trim(), r); });

console.log("CSV products:", csvRecs.length);
console.log("DB products:", db.length);

// For each DB product, check if it exists in CSV by id, slug, or name
const missingFromCSV = [];
const matchedIds = new Set();
db.forEach(p => {
  const pid = String(p.id || "").toLowerCase().trim();
  const psl = cleanStr(p.slug);
  const pnm = cleanStr(p.name);
  let match = csvById.get(pid) || csvBySlug.get(psl) || csvByName.get(pnm);
  if (match) {
    matchedIds.add(pid);
  } else {
    missingFromCSV.push({ id: p.id, slug: p.slug, name: p.name, category: p.category, price: p.price });
  }
});
console.log("\nDB products NOT in CSV:", missingFromCSV.length);
missingFromCSV.forEach(p => console.log("  -", p.id, "|", p.slug, "|", p.name, "|", p.category, "|", p.price));

// CSV products not in DB
const dbIds = new Set(db.map(p => String(p.id || "").toLowerCase().trim()));
const dbSlugs = new Set(db.map(p => cleanStr(p.slug)));
const dbNames = new Set(db.map(p => cleanStr(p.name)));

const csvNotInDB = csvRecs.filter(r => {
  const idMatch = csvById.get(String(r.id).toLowerCase().trim());
  const byId = r.id && dbIds.has(String(r.id).toLowerCase().trim());
  const bySlug = r.slug && dbSlugs.has(cleanStr(r.slug));
  const byName = r.name && dbNames.has(cleanStr(r.name));
  return !(byId || bySlug || byName);
});
console.log("\nCSV products NOT in DB (would be new):", csvNotInDB.length);
csvNotInDB.forEach(r => console.log("  +", r.id, "|", r.slug, "|", r.name, "|", r.category, "|", r.price));

// CSV products that match by ID but have different slug/name (would update existing)
console.log("\n--- CSV rows whose ID matches a DB product (updates) ---");
const updates = [];
csvRecs.forEach(r => {
  const dbProd = db.find(p => String(p.id || "").toLowerCase().trim() === String(r.id).toLowerCase().trim());
  if (dbProd) {
    const slugDiff = cleanStr(dbProd.slug) !== cleanStr(r.slug);
    const nameDiff = cleanStr(dbProd.name) !== cleanStr(r.name);
    const priceDiff = String(dbProd.price) !== String(r.price);
    const catDiff = cleanStr(dbProd.category) !== cleanStr(r.category);
    if (slugDiff || nameDiff || priceDiff || catDiff) {
      updates.push({ id: r.id, dbName: dbProd.name, csvName: r.name, priceDB: dbProd.price, priceCSV: r.price, catDB: dbProd.category, catCSV: r.category });
    }
  }
});
console.log("CSV rows matching DB by ID with differences:", updates.length);
updates.forEach(u => console.log("  *", u.id, "| DB:", u.dbName, "@", u.priceDB, u.catDB, "=> CSV:", u.csvName, "@", u.priceCSV, u.catCSV));
