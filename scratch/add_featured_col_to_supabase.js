const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const url = "https://jpqaycxdmwpucoddfuge.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwcWF5Y3hkbXdwdWNvZGRmdWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3ODA0MjksImV4cCI6MjA5OTM1NjQyOX0.mbII7ftHfacBlFno26hw032d0TsdU5RtnkJ2QIlMK1E";

const supabase = createClient(url, anonKey);

async function addFeaturedColumnAndSync() {
  console.log("Updating Supabase 'blogs' table with isFeaturedHome values...");

  // Read client blogs from clientBlogs.ts
  const filePath = path.resolve(process.cwd(), "src/clientBlogs.ts");
  const fileContent = fs.readFileSync(filePath, "utf8");
  const jsonMatch = fileContent.match(/export const CLIENT_BLOG_POSTS: BlogPost\[\] = (\[[\s\S]*\]);/);
  
  if (!jsonMatch) {
    console.error("Could not parse CLIENT_BLOG_POSTS");
    return;
  }
  
  const blogs = JSON.parse(jsonMatch[1]);
  
  // Set the 3 starred blogs from the user's screenshot as isFeaturedHome: true
  // 1. How to Choose the Best CBD Products in Flower Mound, TX (blog-client-1)
  // 2. How to Incorporate CBD Into Your Daily Wellness Routine (blog-client-23)
  // 3. Senior Pet Care: Enhancing Playtime and Healing Rest with CBD (blog-client-24)
  const featuredSlugs = new Set([
    "how-to-choose-the-best-cbd-products-in-flower-mound-tx",
    "how-to-incorporate-cbd-into-your-daily-wellness-routine",
    "senior-pet-care-enhancing-playtime-and-healing-rest-with-cbd"
  ]);

  const formattedRows = blogs.map((b, i) => {
    const isFeatured = featuredSlugs.has(b.slug) || i < 3;
    return {
      id: String(b.id),
      title: b.title,
      slug: b.slug,
      summary: b.excerpt || b.summary || b.metaDescription || "",
      content: b.content,
      category: b.category || "Education",
      author: b.author || "Two Budz Team",
      date: b.date || "May 2026",
      image: b.image,
      readTime: b.readTime || "4 min read",
      metaTitle: b.metaTitle || b.title,
      metaDescription: b.metaDescription || b.summary || "",
      tags: b.tags || "",
      isFeaturedHome: isFeatured,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  const { data, error } = await supabase.from("blogs").upsert(formattedRows);

  if (error) {
    console.error("Supabase upsert error:", error);
  } else {
    console.log(`✅ SUCCESS! Successfully updated ${blogs.length} articles with isFeaturedHome in Supabase!`);
  }

  // Verify fetch
  const { data: verifyData } = await supabase.from("blogs").select("*");
  if (verifyData) {
    const starred = verifyData.filter(b => b.isFeaturedHome === true);
    console.log(`Live count of blogs with isFeaturedHome=true in Supabase: ${starred.length}`);
    starred.forEach(b => console.log(` - ⭐ Featured: ${b.title}`));
  }
}

addFeaturedColumnAndSync();
