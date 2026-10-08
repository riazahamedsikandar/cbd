const fs = require("fs");
const path = require("path");

// Recursively copy directory synchronously
function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i += 1;
        } else {
          insideQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else if (char === '"') {
      insideQuotes = true;
    } else if (char === ",") {
      currentRow.push(currentField);
      currentField = "";
    } else if (char === "\r") {
      continue;
    } else if (char === "\n") {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }

  if (currentField !== "" || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getCategoryHierarchy(primaryCat) {
  const cat = (primaryCat || "").toLowerCase().trim();
  return [cat || "cbd-oils"];
}

function classifyCategory(name = "", desc = "") {
  const text = (name + " " + desc).toLowerCase().trim();

  // 1. Pets
  if (
    text.includes("cat") ||
    text.includes("dog") ||
    text.includes("pet") ||
    text.includes("puppy") ||
    text.includes("kitten") ||
    text.includes("feline") ||
    text.includes("canine")
  ) {
    return "pets";
  }

  // 2. Beverages & Drinks
  if (
    text.includes("seltzer") ||
    text.includes("beverage") ||
    text.includes("soda") ||
    text.includes("drink") ||
    text.includes("cocktail") ||
    text.includes("tonic") ||
    text.includes("lemonade") ||
    text.includes("mocktail") ||
    text.includes("sparkling water") ||
    text.includes("iced tea") ||
    text.includes("syrup") ||
    text.includes("shot") ||
    text.includes("shots") ||
    text.includes("elixir")
  ) {
    if (text.includes("shot") || text.includes("cocktail") || text.includes("elixir")) {
      return "shots-cocktails";
    }
    if (text.includes("cbd") && !text.includes("thc") && !text.includes("delta")) {
      return "cbd-drinks";
    }
    return "thc-drinks";
  }

  // 3. Gummies
  if (
    text.includes("gummy") ||
    text.includes("gummies") ||
    text.includes("chew") ||
    text.includes("chews") ||
    text.includes("gummie")
  ) {
    if (text.includes("sleep") || text.includes("cbn") || text.includes("night") || text.includes("dream")) {
      return "sleep-gummies";
    }
    if (text.includes("delta 9") || text.includes("delta-9") || text.includes("d9") || text.includes("delta9")) {
      return "delta-9-gummies";
    }
    if (text.includes("delta 8") || text.includes("delta-8") || text.includes("d8") || text.includes("delta8")) {
      return "delta-8-gummies";
    }
    if (text.includes("cbd") && !text.includes("delta")) {
      return "cbd-gummies";
    }
    return "gummies";
  }

  // 4. Edibles
  if (
    text.includes("chocolate") ||
    text.includes("cereal") ||
    text.includes("bites") ||
    text.includes("bite") ||
    text.includes("mint") ||
    text.includes("mints") ||
    text.includes("candy") ||
    text.includes("candies") ||
    text.includes("brownie") ||
    text.includes("cookie") ||
    text.includes("crunch") ||
    text.includes("honey") ||
    text.includes("caramel") ||
    text.includes("caramels") ||
    text.includes("bar") ||
    text.includes("edible") ||
    text.includes("edibles") ||
    text.includes("waffle")
  ) {
    return "edibles";
  }

  // 5. Vapes
  if (
    text.includes("disposable") ||
    text.includes("cartridge") ||
    text.includes("cart") ||
    text.includes("vape") ||
    text.includes("510") ||
    text.includes("pod")
  ) {
    if (text.includes("disposable")) return "disposables";
    if (text.includes("cartridge") || text.includes("cart")) return "cartridges";
    return "vapes";
  }

  // 6. Tinctures & Oils
  if (
    text.includes("tincture") ||
    text.includes("tinctures") ||
    text.includes("dropper") ||
    text.includes("sublingual") ||
    text.includes("oil drops") ||
    text.includes("oil drop") ||
    text.includes("cbd oil") ||
    text.includes("hemp oil") ||
    text.includes("oil")
  ) {
    if (text.includes("delta 9") || text.includes("delta-9") || text.includes("d9")) return "delta-9-tinctures";
    if (text.includes("delta 8") || text.includes("delta-8") || text.includes("d8")) return "delta-8-tinctures";
    if (text.includes("cbd")) return "cbd-tinctures";
    return "cbd-oils";
  }

  // 7. Flower
  if (
    text.includes("flower") ||
    text.includes("bud") ||
    text.includes("buds") ||
    text.includes("pre-roll") ||
    text.includes("preroll") ||
    text.includes("joint") ||
    text.includes("joints") ||
    text.includes("sativa") ||
    text.includes("indica") ||
    text.includes("hybrid") ||
    text.includes("rosin") ||
    text.includes("shake")
  ) {
    return "flower";
  }

  // 8. Topicals
  if (
    text.includes("cream") ||
    text.includes("roll-on") ||
    text.includes("roll on") ||
    text.includes("rollon") ||
    text.includes("salve") ||
    text.includes("lotion") ||
    text.includes("balm") ||
    text.includes("topical") ||
    text.includes("cooling") ||
    text.includes("warming") ||
    text.includes("ointment") ||
    text.includes("gel")
  ) {
    return "topicals";
  }

  // 9. Smoke & Accessories
  if (
    text.includes("battery") ||
    text.includes("grinder") ||
    text.includes("paper") ||
    text.includes("accessory") ||
    text.includes("pipe") ||
    text.includes("device") ||
    text.includes("tray")
  ) {
    return "smoke-accessories";
  }

  if (text.includes("thc") || text.includes("delta")) {
    return "thc-drinks";
  }

  return "cbd-oils";
}

function getCategoryLabel(category) {
  const map = {
    gummies: "Artisanal Gummies",
    "delta-9-gummies": "Delta 9 Gummies",
    "delta-8-gummies": "Delta 8 Gummies",
    "cbd-gummies": "CBD Gummies",
    "sleep-gummies": "Sleep Gummies",
    "cbd-tinctures": "CBD Tinctures",
    "delta-9-tinctures": "Delta 9 Tinctures",
    "delta-8-tinctures": "Delta 8 Tinctures",
    "cbd-oils": "Oils & Tinctures",
    "thc-drinks": "THC Drinks",
    "cbd-drinks": "CBD Drinks",
    beverages: "Infused Beverages",
    "shots-cocktails": "Shots & Cocktails",
    topicals: "Targeted Topicals",
    pets: "Pet Wellness Care",
    disposables: "Disposables",
    vapes: "Vapes & Disposables",
    cartridges: "Cartridges",
    edibles: "Edibles & Cereal Bites",
    flower: "Premium Buds",
    "smoke-accessories": "Smoke & Accessories",
  };
  return map[category] || "CBD & Hemp Wellness";
}

function matchProductImage(
  name,
  slug,
  category,
  detectedImages,
  detectedFolder,
  index = 0
) {
  if (!detectedImages || !detectedImages.length) {
    return "/images/cbd_dropper_1779557730794.png";
  }

  const normName = (name + " " + slug).toLowerCase();

  const STOP_WORDS = new Set([
    "cbd", "thc", "mg", "gummies", "gummy", "free", "delta", "the", "and", "for",
    "with", "in", "of", "pack", "count", "ct", "oz", "ml", "product", "item",
    "hemp", "extract", "natural", "full", "spectrum", "broad", "bottle", "pure",
    "raw", "daily", "blend", "formula", "super", "premium", "two", "budz", "twobudz"
  ]);

  const clean = (str) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1);

  const productTokens = clean(normName).filter((t) => !STOP_WORDS.has(t));

  let bestMatch = null;
  let maxScore = 0;

  for (const img of detectedImages) {
    if (img.includes("logo") || img.includes("hero_bg")) continue;

    const imgNameClean = img.replace(/\.(webp|png|jpg|jpeg)$/i, "");
    const imgTokens = clean(imgNameClean.replace(/[-_]/g, " ")).filter((t) => !STOP_WORDS.has(t));

    let score = 0;

    // Word token overlaps for non-stop words
    for (const pToken of productTokens) {
      for (const iToken of imgTokens) {
        if (pToken === iToken) {
          score += 15;
        } else if (pToken.length > 3 && (iToken.includes(pToken) || pToken.includes(iToken))) {
          score += 5;
        }
      }
    }

    // Brand matching
    const brands = ["wyld", "barney", "enjoy", "hometown", "proleve", "stardust", "justcbd", "delta"];
    for (const b of brands) {
      if (normName.includes(b) && imgNameClean.toLowerCase().includes(b)) {
        score += 20;
      }
    }

    // Flavor matching
    const flavors = [
      "blackberry", "raspberry", "grapefruit", "lemon", "peach", "cherry", "strawberry", "starawberry",
      "orange", "elderberry", "pomegranate", "pear", "marionberry", "maui", "wowie", "wedding", "gelato",
      "blue", "purple", "cool", "warm", "mint", "cocoa", "fruity", "rainbow", "passion", "tuna", "salmon",
      "chicken", "rose", "bliss", "chill", "euphoria", "balance", "relief", "wintergreen", "dark"
    ];
    for (const f of flavors) {
      if (normName.includes(f) && imgNameClean.toLowerCase().includes(f)) {
        score += 18;
      }
    }

    // Product form matching
    if ((normName.includes("water") || normName.includes("sparkling") || normName.includes("drink") || normName.includes("beverage")) &&
        (imgNameClean.includes("water") || imgNameClean.includes("drink") || imgNameClean.includes("sparkling"))) {
      score += 15;
    }
    if ((normName.includes("tea") || normName.includes("lemonade")) && (imgNameClean.includes("tea") || imgNameClean.includes("lemonade"))) {
      score += 15;
    }
    if (normName.includes("shot") && imgNameClean.includes("shot")) {
      score += 15;
    }
    if ((normName.includes("roll-on") || normName.includes("rollon") || normName.includes("cooling") || normName.includes("warming")) &&
        (imgNameClean.includes("roll") || imgNameClean.includes("cool") || imgNameClean.includes("warm"))) {
      score += 15;
    }
    if ((normName.includes("cereal") || normName.includes("bites") || normName.includes("chocolate") || normName.includes("mint")) &&
        (imgNameClean.includes("cereal") || imgNameClean.includes("bites") || imgNameClean.includes("chocolate") || imgNameClean.includes("mint"))) {
      score += 15;
    }

    // Prefer webp over unencoded jpg for Vercel stability
    if (img.toLowerCase().endsWith(".webp")) {
      score += 2;
    }

    if (score > maxScore) {
      maxScore = score;
      bestMatch = img;
    }
  }

  // Require score threshold of 10 so exact and partial image matches are utilized
  if (bestMatch && maxScore >= 10) {
    return `/${detectedFolder}/${bestMatch}`;
  }

  // Fallback pools per category to ensure distinct visual variety
  const gummyPool = [
    "sleep-cbd-gummies-mixed-fruit.webp",
    "wyld-thc-free-peach-cbd-gummies.webp",
    "enjoy-live-rosin-delta-9-gummies-300mg-bliss.webp",
    "enjoy-live-rosin-chill-delta-9-gummies-600mg.webp",
    "barneys-botanicals-12mg-delta-9-gummies-10ct.webp",
    "dark-cherry-cbd-cbn-thc-gummies-sleep-support.webp",
    "marionberry-indica-thc-gummies-10mg.webp",
    "pomegranate-thc-cbd-gummies-10mg.webp",
    "wyld-blood-orange-thc-cbc-gummies-bliss.webp",
    "balance-thc-cbd-gummies-25mg-hybrid.webp",
    "elderberry-thc-cbn-gummies-10mg-30ct.webp",
    "proleve-cbd-daily-gummies-50-mg-30-count.webp",
    "pear-cbd-gummies-hemp-extract-edibles.webp",
    "enjoy-cbd-cbg-gummies-3300mg-relief.webp",
    "enjoy-cbdcbn-gummies-3300mg-sleep.webp",
    "northern-lights-live-rosin-thc-gummies-indica.webp",
    "hometown-hero-delta-9-live-rosin-gummies-blue-dream-10ct.webp",
    "hometown-hero-delta-9-live-rosin-gummies-gelato-10ct.webp",
    "hometown-hero-delta-9-live-rosin-gummies-grand-daddy-purple-10ct.webp"
  ];

  const drinkPool = [
    "10mg-thc-shots-hemp-infused-beverage.webp",
    "drink-delta-d9-water-maui-wowie-passion-fruit-20mg.webp",
    "drink-delta-d9-water-wedding-cake-blood-orange-20mg.webp",
    "wyld-cbd-sparkling-water-blackberry-50mg.webp",
    "wyld-cbd-sparkling-water-blood-orange-50mg.webp",
    "wyld-cbd-sparkling-water-grapefruit-50mg.webp",
    "wyld-cbd-sparkling-water-lemon-50mg.webp",
    "wyld-cbd-sparkling-water-raspberry-50mg.webp",
    "sparkling-thc-iced-tea-lemonade.webp",
    "sparkling-thc-raspberry-lemonade.webp"
  ];

  const oilPool = [
    "cbd_dropper_1779557730794.png",
    "cbd-roll-on-cooling-2000mg.webp",
    "cbd-roll-on-warming-2000mg.webp",
    "proleve-cbd-daily-gummies-50-mg-30-count.webp",
    "wyld-thc-free-peach-cbd-gummies.webp"
  ];

  const ediblePool = [
    "desert-stardust-mushroom-chocolate-bar-starawberry-crunch.webp",
    "hometown-hero-delta-9-cocoa-crisp-cereal-bites.webp",
    "hometown-hero-delta-9-fruity-rainbow-cereal-bites.webp",
    "wintergreen-thc-microdose-mints-40-count.webp"
  ];

  // Hash string + product index offset to cycle pool deterministically
  let hash = index;
  for (let i = 0; i < normName.length; i++) {
    hash = (hash << 5) - hash + normName.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);

  const normCat = (category || "").toLowerCase();
  let pool = gummyPool;

  if (normCat.includes("drink") || normCat.includes("beverage") || normCat.includes("shot") || normName.includes("drink") || normName.includes("water") || normName.includes("tea")) {
    pool = drinkPool;
  } else if (normCat.includes("oil") || normCat.includes("tincture") || normCat.includes("topical") || normCat.includes("pet") || normName.includes("tincture") || normName.includes("dropper") || normName.includes("oil")) {
    pool = oilPool;
  } else if (normCat.includes("edible") || normName.includes("chocolate") || normName.includes("mint") || normName.includes("cereal") || normName.includes("bar")) {
    pool = ediblePool;
  }

  const selectedImage = pool[(positiveHash + index) % pool.length];
  return `/${detectedFolder}/${selectedImage}`;
}

function extractTHC(name, desc) {
  const match = (name + " " + desc).match(
    /(\d+\s*mg\s*(?:delta-?\d+|thc|cbn|cbg|cbd)?(?:\s*per\s*piece)?|\b< ?0\.3% THC\b)/i,
  );
  return match ? match[0] : "< 0.3% Delta-9 THC";
}

function extractCBD(name, desc) {
  const match = (name + " " + desc).match(
    /(\d+\s*mg\s*cbd|\bfull spectrum\b|\bbroad spectrum\b)/i,
  );
  return match ? match[0] : "Full Spectrum Hemp";
}

function writeStaticCsvProducts(detectedImages, detectedFolder) {
  const srcDir = path.resolve(process.cwd(), "src");
  const publicDir = path.resolve(process.cwd(), "public");
  const rawCsvNames = ["TwoBudz_Products_Catalog_2026-08-08.csv", "products_raw.csv", "products_raw_1.csv", "products_raw_2.csv", "products_raw_3.csv", "products_raw_4.csv"];
  const csvFiles = rawCsvNames
    .map((name) => {
      const sPath = path.join(srcDir, name);
      if (fs.existsSync(sPath)) return sPath;
      const pPath = path.join(publicDir, name);
      if (fs.existsSync(pPath)) return pPath;
      const rPath = path.join(process.cwd(), name);
      if (fs.existsSync(rPath)) return rPath;
      return null;
    })
    .filter(Boolean);

  if (!csvFiles.length) {
    return;
  }

  const allRawItems = [];

  csvFiles.forEach((csvPath) => {
    const text = fs.readFileSync(csvPath, "utf8");
    const rows = parseCSV(text);
    if (!rows || rows.length < 2) return;

    const header = rows[0].map((v) => v.trim());
    function getValue(row, key) {
      const idx = header.indexOf(key);
      return idx >= 0 ? (row[idx] || "").trim() : "";
    }

    rows.slice(1).forEach((row) => {
      if (row.length > 1 && row[0].trim().toLowerCase() !== "s.no") {
        const name = getValue(row, "Product Name");
        if (name) {
          allRawItems.push({
            row,
            name,
            id: getValue(row, "TwoBudz ID"),
            rawPrice: getValue(row, "Regular Price ($)"),
            status: getValue(row, "Status"),
            rawShortDesc: getValue(row, "Short Description") || name,
            rawLongDesc: getValue(row, "Long Description") || (getValue(row, "Short Description") || name),
          });
        }
      }
    });
  });

  // Deduplicate products by ID or normalized name to prevent duplicate entries while keeping all unique items
  const uniqueItems = [];
  const seenKeys = new Set();

  allRawItems.forEach((item) => {
    const key = item.id ? item.id.toUpperCase().trim() : item.name.toLowerCase().trim();
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueItems.push(item);
    }
  });

  const products = uniqueItems.map((item, index) => {
    const name = item.name;
    const rawPriceNum = item.rawPrice.replace(/[^0-9.]/g, "");
    const price = Number(rawPriceNum) || 29.99;
    const status = item.status || "Available";

    const rawShortDesc = item.rawShortDesc;
    const rawLongDesc = item.rawLongDesc;

    const category = classifyCategory(name, rawShortDesc);
    const categoryLabel = getCategoryLabel(category);
    const image = matchProductImage(
      name,
      slugify(name),
      category,
      detectedImages,
      detectedFolder,
      index
    );

    const thc = extractTHC(name, rawShortDesc);
    const cbd = extractCBD(name, rawShortDesc);
    const currentSlug = slugify(name);

    const FEATURED_HOME_SLUGS = [
      "sleep-cbd-gummies-mixed-fruit",
      "hometown-hero-delta-9-live-rosin-gummies-grand-daddy-purple-10ct",
      "10mg-thc-shots-hemp-infused-beverage",
      "barneys-botanicals-12mg-delta-9-gummies-10ct",
      "enjoy-live-rosin-delta-9-gummies-300mg-bliss",
      "wyld-cbd-sparkling-water-blood-orange-50mg",
      "cbd-roll-on-cooling-2000mg",
      "northern-lights-live-rosin-thc-gummies-indica"
    ];
    const isCuratedFeatured = FEATURED_HOME_SLUGS.includes(currentSlug);

    return {
      id: item.id || `TB-${String(index + 1).padStart(3, "0")}`,
      slug: currentSlug,
      name,
      description: rawShortDesc,
      longDescription: rawLongDesc,
      price,
      category,
      categories: Array.from(new Set([...getCategoryHierarchy(category), "all"])),
      categoryLabel,
      rating: 4.8,
      image,
      reviewsCount: Math.floor(12 + Math.random() * 40),
      thc,
      cbd,
      options: ["Single Pack", "3-Pack Value"],
      benefits: [
        "Farm-bill compliant organic formula",
        "Third-party lab tested for purity and potency",
        "Available in Flower Mound, TX & online shipping",
      ],
      labResults: {
        purity: "99.8%",
        cannabinoids: "Compliant Phytocannabinoid Profile",
        solventFree: true,
        heavyMetalsPass: true,
        pesticidesPass: true,
      },
      isBestSeller: isCuratedFeatured,
      isFeaturedHome: isCuratedFeatured,
      isNew: index % 12 === 0,
      status,
      metaTitle: `${name} | TwoBudz Flower Mound, TX`,
      metaDescription: rawShortDesc.slice(0, 155),
      tags: `${category}, ${name.toLowerCase().split(" ").slice(0, 3).join(", ")}, hemp, twobudz`,
      altText: name,
    };
  });

  const outputPath = path.resolve(process.cwd(), "src/csvProducts.ts");
  const outputContent = `// Generated by setup-images.js. Do not edit directly.
export const CSV_PRODUCTS = ${JSON.stringify(products, null, 2)};
`;

  fs.writeFileSync(outputPath, outputContent, "utf8");
  console.log(
    `[Setup Images] Generated ${products.length} CSV products with smart categories & images in src/csvProducts.ts.`,
  );
}

console.log("[Setup Images] Starting image setup...");

// Image directory copy disabled to prevent duplicate storage
// try {
//   const rootSrc = path.resolve(process.cwd(), "resized_jpg");
//   const publicDest = path.resolve(process.cwd(), "public/resized_jpg");
//   if (fs.existsSync(rootSrc)) {
//     copyDirSync(rootSrc, publicDest);
//   }
// } catch (e) {}

// Scan public/images for available images
const possibleDirs = ["public/images"];
let targetDir = "";
let detectedFolder = "images";
let detected = [];

for (const dir of possibleDirs) {
  const fullPath = path.resolve(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    targetDir = fullPath;
    detectedFolder = dir.replace("public/", "");
    break;
  }
}

if (targetDir) {
  try {
    detected = fs.readdirSync(targetDir).filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return (
        ext === ".webp" || ext === ".png" || ext === ".jpg" || ext === ".jpeg"
      );
    });
  } catch (e) {
    console.error(`Error reading ${detectedFolder} directory:`, e);
  }
}

const outputPath = path.resolve(process.cwd(), "src/utils/detectedImages.ts");
const fileContent = `// Automatically generated by setup-images.js at build/dev time. Do not edit directly.
export const DETECTED_IMAGES: string[] = ${JSON.stringify(detected, null, 2)};
export const DETECTED_FOLDER: string = ${JSON.stringify(detectedFolder)};
`;

const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

try {
  fs.writeFileSync(outputPath, fileContent, "utf-8");
  console.log(
    `[Setup Images] Detected ${detected.length} local images in ${detectedFolder}. Updated src/utils/detectedImages.ts.`,
  );
} catch (e) {
  console.error("Failed to write detected images config:", e);
}

// Static CSV products generation disabled to ensure 100% pure dynamic Supabase catalog
// try {
//   writeStaticCsvProducts(detected, detectedFolder);
// } catch (e) {
//   console.error("[Setup Images] Failed to generate csvProducts module:", e);
// }
