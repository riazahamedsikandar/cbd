const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const url = "https://jpqaycxdmwpucoddfuge.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwcWF5Y3hkbXdwdWNvZGRmdWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3ODA0MjksImV4cCI6MjA5OTM1NjQyOX0.mbII7ftHfacBlFno26hw032d0TsdU5RtnkJ2QIlMK1E";

const supabase = createClient(url, anonKey);

async function keepOnlyCSVBlogs() {
  const filePath = path.resolve(process.cwd(), "src/clientBlogs.ts");
  const fileContent = fs.readFileSync(filePath, "utf8");
  const jsonMatch = fileContent.match(/export const CLIENT_BLOG_POSTS: BlogPost\[\] = (\[[\s\S]*\]);/);
  
  if (!jsonMatch) return;
  const csvBlogs = JSON.parse(jsonMatch[1]);

  // Filter allowed columns for 'blogs' table
  const allowedCols = new Set(["id", "title", "slug", "summary", "content", "category", "author", "date", "image", "metaTitle", "metaDescription", "created_at", "updated_at"]);

  const formattedRows = csvBlogs.map((b) => {
    const row = {
      id: String(b.id),
      title: b.title,
      slug: b.slug,
      summary: b.excerpt || b.metaDescription || "",
      content: b.content,
      category: b.category || "Texas Hemp",
      author: b.author || "Two Budz Team",
      date: b.date || "August 2026",
      image: b.image,
      metaTitle: b.metaTitle || b.title,
      metaDescription: b.metaDescription || b.excerpt || "",
      created_at: b.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const clean = {};
    for (const k of Object.keys(row)) {
      if (allowedCols.has(k)) clean[k] = row[k];
    }
    return clean;
  });

  const { error } = await supabase.from("blogs").upsert(formattedRows);
  if (error) {
    console.error("Upsert error:", error);
  } else {
    console.log(`✅ Upserted ${formattedRows.length} clean CSV blogs to Supabase.`);
  }

  const { data: finalDb } = await supabase.from("blogs").select("id, title");
  console.log(`🎉 FINAL COUNT in Supabase 'blogs' table: ${finalDb ? finalDb.length : 0} EXACT CSV ARTICLES!`);
}

keepOnlyCSVBlogs();
