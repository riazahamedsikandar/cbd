const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const env = fs.readFileSync(".env", "utf8");
const url = env.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const key = env.match(/VITE_SUPABASE_ANON_KEY="([^"]+)"/)[1];

const supabase = createClient(url, key);

(async () => {
  const { data, error, count } = await supabase
    .from("products")
    .select("*", { count: "exact" });
  if (error) {
    console.error("ERROR:", error);
    return;
  }
  console.log("TOTAL PRODUCTS in Supabase:", data.length, "exact count:", count);

  // Analyze
  const ids = new Map();
  const slugs = new Map();
  const names = new Map();
  const cats = new Map();
  const images = new Map();
  const noImage = [];
  const genericImages = [];
  data.forEach(p => {
    const id = String(p.id || "").trim().toLowerCase();
    const slug = String(p.slug || "").trim().toLowerCase();
    const name = String(p.name || "").trim().toLowerCase();
    const cat = String(p.category || "");
    ids.set(id, (ids.get(id) || 0) + 1);
    slugs.set(slug, (slugs.get(slug) || 0) + 1);
    names.set(name, (names.get(name) || 0) + 1);
    cats.set(cat, (cats.get(cat) || 0) + 1);
    const img = p.image || "";
    if (!img) noImage.push(p.name);
    else if (img.includes("cbd_dropper_1779557730794.png") || img.includes("placeholder")) genericImages.push(p.name);
    images.set(img, (images.get(img) || 0) + 1);
  });

  const dupIds = [...ids.entries()].filter(([k, v]) => v > 1);
  const dupSlugs = [...slugs.entries()].filter(([k, v]) => v > 1);
  const dupNames = [...names.entries()].filter(([k, v]) => v > 1);

  console.log("\nDUP IDS:", JSON.stringify(dupIds));
  console.log("DUP SLUGS:", JSON.stringify(dupSlugs));
  console.log("DUP NAMES:", JSON.stringify(dupNames));

  console.log("\nCategories:");
  [...cats.entries()].sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log("  ", c, "=>", n));

  console.log("\nProducts with NO image:", noImage.length);
  noImage.forEach(n => console.log("   -", n));
  console.log("\nProducts with GENERIC image:", genericImages.length);
  genericImages.forEach(n => console.log("   -", n));

  console.log("\nSample of distinct image paths (count):", images.size);

  // Write full dump for detailed analysis
  fs.writeFileSync(
    "C:/Users/ho13431/AppData/Local/Temp/opencode/supabase_products_dump.json",
    JSON.stringify(data, null, 2),
    "utf8"
  );
  console.log("\nWrote dump to temp file.");

  // Also dump categories table
  const { data: catsDb, error: catErr } = await supabase.from("categories").select("*");
  if (catErr) console.error("cat fetch error:", catErr);
  else {
    console.log("\nCATEGORIES in DB:", catsDb.length);
    catsDb.forEach(c => console.log("  ", c.id, "|", c.title));
  }
})();
