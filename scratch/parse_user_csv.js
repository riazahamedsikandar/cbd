const fs = require("fs");
const path = require("path");

const csvPath = "C:\\Users\\moham\\.gemini\\antigravity\\brain\\940600f3-29a1-4bff-9763-7aa0d431efd3\\.user_uploaded\\media_1787704712436.csv";
let csvText = fs.readFileSync(csvPath, "utf8");

// Clean common character encoding artifacts
csvText = csvText
  .replace(/\uFFFD/g, "'")
  .replace(/\u2019/g, "'")
  .replace(/\u201C/g, '"')
  .replace(/\u201D/g, '"')
  .replace(/\u2014/g, " - ")
  .replace(/\u2013/g, " - ");

console.log(`Read and cleaned CSV file (${csvText.length} bytes)`);

function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentField.trim());
      if (currentRow.some(f => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows;
}

const parsedRows = parseCSV(csvText);
console.log(`Parsed ${parsedRows.length} rows from CSV`);

const imageMap = [
  "/images/balance-thc-cbd-gummies-25mg-hybrid.webp",
  "/images/wyld-cbd-sparkling-water-blood-orange-50mg.webp",
  "/images/wyld-thc-free-peach-cbd-gummies.webp",
  "/images/10mg-thc-shots-hemp-infused-beverage.webp",
  "/images/cbd-roll-on-cooling-2000mg.webp",
  "/images/sleep-cbd-gummies-mixed-fruit.webp",
  "/images/barneys-botanicals-12mg-delta-9-gummies-10ct.webp",
  "/images/enjoy-live-rosin-delta-9-gummies-300mg-bliss.webp",
  "/images/hometown-hero-delta-9-live-rosin-gummies-grand-daddy-purple-10ct.webp",
  "/images/enjoy-cbdcbn-gummies-3300mg-sleep.webp",
  "/images/northern-lights-live-rosin-thc-gummies-indica.webp",
  "/images/dark-cherry-cbd-cbn-thc-gummies-sleep-support.webp",
  "/images/sparkling-thc-iced-tea-lemonade.webp",
  "/images/barneys-botanicals-30mg-delta-9-gummies-30ct.webp"
];

const categoryList = [
  "Texas Hemp",
  "Cannabinoid Science",
  "Product Guides",
  "CBD Wellness",
  "Sleep Support",
  "Dosage & Usage",
  "Pet Health",
  "Fitness Recovery"
];

const clientBlogs = [];

for (let i = 1; i < parsedRows.length; i++) {
  const row = parsedRows[i];
  if (!row || row.length < 4) continue;

  const title = (row[0] || "").replace(/^["'\s]+|["'\s]+$/g, "");
  const url = row[1] || "";
  const metaTitle = (row[3] || title).replace(/^["'\s]+|["'\s]+$/g, "");
  const metaDescription = (row[4] || "").replace(/^["'\s]+|["'\s]+$/g, "");
  let bodyContent = (row[5] || metaDescription || title).replace(/^["'\s]+|["'\s]+$/g, "");

  if (!title || title.toLowerCase().includes("post title")) continue;

  // Clean formatting artifacts in bodyContent
  bodyContent = bodyContent
    .replace(/\uFFFD/g, "'")
    .replace(/(?<!\n)(#+\s+)/g, "\n\n$1")
    .replace(/(#+\s+[^\n]+)(?!\n\n)/g, "$1\n\n");

  let slug = "";
  if (url && url.includes("/blog/")) {
    slug = url.split("/blog/")[1].replace(/\/$/, "");
  } else {
    slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  let excerpt = metaDescription;
  if (!excerpt || excerpt.length < 20) {
    const cleanBody = bodyContent.replace(/^#+\s+/gm, "").replace(/\n+/g, " ");
    excerpt = cleanBody.slice(0, 180) + "...";
  }

  const category = categoryList[(i - 1) % categoryList.length];
  const image = imageMap[(i - 1) % imageMap.length];

  clientBlogs.push({
    id: `blog-client-${i}`,
    title: title,
    slug: slug,
    excerpt: excerpt,
    content: bodyContent,
    category: category,
    date: `August ${Math.max(1, 26 - i)}, 2026`,
    author: i % 2 === 0 ? "Two Budz Editor" : "Two Budz Wellness Team",
    image: image,
    readTime: `${Math.max(3, Math.ceil(bodyContent.split(/\s+/).length / 200))} min read`,
    metaTitle: metaTitle,
    metaDescription: metaDescription
  });
}

console.log(`Successfully parsed ${clientBlogs.length} clean articles with formatted headers!`);

const tsContent = `import { BlogPost } from "./types";\n\nexport const CLIENT_BLOG_POSTS: BlogPost[] = ${JSON.stringify(clientBlogs, null, 2)};\n`;

fs.writeFileSync(path.resolve(process.cwd(), "src/clientBlogs.ts"), tsContent, "utf8");
console.log("Updated src/clientBlogs.ts with clean markdown content!");
