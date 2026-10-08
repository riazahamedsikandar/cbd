const fs = require("fs");
const path = require("path");

// Parse the full CSV string passed by the user
const fullText = fs.readFileSync(path.join(__dirname, "../scratch/user_blogs_raw.txt"), "utf8");

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

const rows = parseCSV(fullText);
console.log(`Parsed ${rows.length} rows from user_blogs_raw.txt`);

const blogPosts = [];
const imagePool = [
  "/images/wyld-cbd-sparkling-water-lemon-50mg.webp",
  "/images/balance-thc-cbd-gummies-25mg-hybrid.webp",
  "/images/wyld-cbd-sparkling-water-blood-orange-50mg.webp",
  "/images/wyld-thc-free-peach-cbd-gummies.webp",
  "/images/10mg-thc-shots-hemp-infused-beverage.webp",
  "/images/enjoy-live-rosin-delta-9-gummies-300mg-bliss.webp",
  "/images/cbd-roll-on-cooling-2000mg.webp",
  "/images/barneys-botanicals-12mg-delta-9-gummies-10ct.webp",
  "/images/sleep-cbd-gummies-mixed-fruit.webp",
  "/images/northern-lights-live-rosin-thc-gummies-indica.webp",
  "/images/proleve-cbd-daily-gummies-50-mg-30-count.webp",
  "/images/enjoy-sleep-3300mg-cbd-cbn-mixed-fruit-gummies.webp",
  "/images/barneys-botanicals-30mg-delta-9-gummies-30ct.webp",
  "/images/sparkling-thc-iced-tea-lemonade.webp"
];

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (row.length < 5) continue;

  const title = (row[0] || "").replace(/^["']|["']$/g, "").trim();
  const urlVal = (row[1] || "").trim();
  const metaTitle = (row[3] || title).replace(/^["']|["']$/g, "").trim();
  const metaDesc = (row[4] || "").replace(/^["']|["']$/g, "").trim();
  const bodyContent = (row[5] || "").replace(/^["']|["']$/g, "").trim();

  if (!title) continue;

  let slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (urlVal) {
    try {
      const match = urlVal.match(/\/blog\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        slug = match[1].toLowerCase().trim();
      }
    } catch (e) {}
  }

  // Deduplicate slugs
  let finalSlug = slug;
  let counter = 1;
  while (blogPosts.some(b => b.slug === finalSlug)) {
    finalSlug = `${slug}-${counter}`;
    counter++;
  }

  // Determine category based on title & body
  let category = "CBD Wellness";
  const tLower = title.toLowerCase();
  if (tLower.includes("sleep") || tLower.includes("melatonin") || tLower.includes("night")) category = "Sleep Support";
  else if (tLower.includes("dog") || tLower.includes("pet")) category = "Pet Care";
  else if (tLower.includes("gummy") || tLower.includes("oil") || tLower.includes("tincture") || tLower.includes("capsule")) category = "Product Guides";
  else if (tLower.includes("texas") || tLower.includes("flower mound") || tLower.includes("legal")) category = "Texas Hemp";
  else if (tLower.includes("dosage") || tLower.includes("beginner") || tLower.includes("how much")) category = "Dosage & Usage";
  else if (tLower.includes("stress") || tLower.includes("anxiety") || tLower.includes("burnout")) category = "Stress Relief";
  else if (tLower.includes("cbg") || tLower.includes("thca") || tLower.includes("shatter") || tLower.includes("spectrum")) category = "Cannabinoid Science";

  const img = imagePool[i % imagePool.length];
  const readTime = `${Math.max(4, Math.ceil(bodyContent.split(/\s+/).length / 200))} min read`;

  // Format snippet / summary
  const summary = metaDesc || bodyContent.slice(0, 160).replace(/\n/g, " ") + "...";

  blogPosts.push({
    id: `blog-client-${i}`,
    title,
    slug: finalSlug,
    excerpt: summary,
    content: bodyContent || summary,
    category,
    date: new Date(Date.now() - i * 86400000 * 3).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    author: "Two Budz Wellness Team",
    image: img,
    readTime,
    metaTitle,
    metaDescription: metaDesc,
  });
}

console.log(`Generated ${blogPosts.length} clean client blog posts!`);

const fileContent = `import { BlogPost } from "./types";\n\nexport const CLIENT_BLOG_POSTS: BlogPost[] = ${JSON.stringify(blogPosts, null, 2)};\n`;
fs.writeFileSync(path.join(__dirname, "../src/clientBlogs.ts"), fileContent);
console.log("Successfully wrote src/clientBlogs.ts!");
