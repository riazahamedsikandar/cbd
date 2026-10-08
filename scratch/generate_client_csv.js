const fs = require("fs");
const path = require("path");

// Load CLIENT_REVIEWS and products
const clientReviewsPath = path.join(__dirname, "../src/clientReviews.ts");
const csvProductsPath = path.join(__dirname, "../src/csvProducts.ts");

const reviewsContent = fs.readFileSync(clientReviewsPath, "utf8");
const reviewsMatch = reviewsContent.match(/export const CLIENT_REVIEWS: ReviewItem\[\] = (\[[\s\S]*?\]);/);
let reviews = [];
if (reviewsMatch) {
  reviews = eval(reviewsMatch[1]);
}

const productsContent = fs.readFileSync(csvProductsPath, "utf8");
const productsMatch = productsContent.match(/export const CSV_PRODUCTS = (\[[\s\S]*?\]);/);
let products = [];
if (productsMatch) {
  products = eval(productsMatch[1]);
}

console.log(`Loaded ${reviews.length} client reviews and ${products.length} products.`);

const csvHeader = ["Product Name", "Reviewer Name", "Rating Score (1-5)", "Review Headline", "Detailed Review Comment", "Date"].join(",");
const csvRows = [csvHeader];

reviews.forEach((r) => {
  // Find matching product in catalog
  let matchedProd = products.find(p => p.id === r.productId);
  if (!matchedProd) {
    matchedProd = products.find(p => p.name.toLowerCase().trim() === (r.productName || "").toLowerCase().trim());
  }

  const prodName = matchedProd ? matchedProd.name : r.productName;
  const author = r.author || r.name || "Verified Client";
  const rating = r.rating || 5;
  const title = r.title || "";
  const comment = (r.comment || "").replace(/"/g, '""');
  const date = r.date || "May 20, 2026";

  const row = [
    `"${prodName.replace(/"/g, '""')}"`,
    `"${author.replace(/"/g, '""')}"`,
    `"${rating}"`,
    `"${title.replace(/"/g, '""')}"`,
    `"${comment}"`,
    `"${date}"`
  ];
  csvRows.push(row.join(","));
});

// Write with UTF-8 BOM
const finalCsvContent = "\uFEFF" + csvRows.join("\n");
const outputPath = path.join(__dirname, "../public/TwoBudz_Client_Reviews_Import.csv");
fs.writeFileSync(outputPath, finalCsvContent, "utf8");
console.log(`Successfully generated public/TwoBudz_Client_Reviews_Import.csv with ${csvRows.length - 1} rows!`);
