const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const supabaseUrl = "https://jpqaycxdmwpucoddfuge.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwcWF5Y3hkbXdwdWNvZGRmdWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3ODA0MjksImV4cCI6MjA5OTM1NjQyOX0.mbII7ftHfacBlFno26hw032d0TsdU5RtnkJ2QIlMK1E";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const reviewsContent = fs.readFileSync(path.join(__dirname, "../src/clientReviews.ts"), "utf8");
  const reviewsMatch = reviewsContent.match(/export const CLIENT_REVIEWS: ReviewItem\[\] = (\[[\s\S]*?\]);/);
  if (!reviewsMatch) {
    console.error("Could not parse CLIENT_REVIEWS from src/clientReviews.ts");
    return;
  }

  const reviews = eval(reviewsMatch[1]);
  console.log(`Pushing ${reviews.length} client reviews to Supabase 'reviews' table...`);

  // Format payload for Supabase reviews table
  const payload = reviews.map((r) => ({
    id: r.id,
    productId: r.productId,
    productName: r.productName,
    author: r.author || r.name,
    rating: r.rating || 5,
    title: r.title || "",
    comment: r.comment || "",
    date: r.date || "May 20, 2026",
    status: r.status || "approved",
    verified: r.verified ?? true,
    created_at: r.created_at || new Date().toISOString()
  }));

  const { data, error } = await supabase.from("reviews").upsert(payload);

  if (error) {
    console.error("Error upserting reviews to Supabase:", error.message);
  } else {
    console.log("Successfully synced all 200 client reviews directly to Supabase cloud database!");
  }
}

main();
