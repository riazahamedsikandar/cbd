const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const url = "https://jpqaycxdmwpucoddfuge.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwcWF5Y3hkbXdwdWNvZGRmdWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3ODA0MjksImV4cCI6MjA5OTM1NjQyOX0.mbII7ftHfacBlFno26hw032d0TsdU5RtnkJ2QIlMK1E";

const supabase = createClient(url, anonKey);

async function syncBlogs() {
  console.log("Connecting to Supabase to sync all 33 client blogs...");
  
  // Read client blogs from clientBlogs.ts
  const filePath = path.resolve(process.cwd(), "src/clientBlogs.ts");
  const fileContent = fs.readFileSync(filePath, "utf8");
  const jsonMatch = fileContent.match(/export const CLIENT_BLOG_POSTS: BlogPost\[\] = (\[[\s\S]*\]);/);
  
  if (!jsonMatch) {
    console.error("Could not parse CLIENT_BLOG_POSTS from src/clientBlogs.ts");
    return;
  }
  
  const blogs = JSON.parse(jsonMatch[1]);
  console.log(`Found ${blogs.length} articles in src/clientBlogs.ts`);

  // Detect table columns for 'blogs' in Supabase
  let validCols = new Set();
  try {
    const { data } = await supabase.from("blogs").select("*").limit(1);
    if (data && data.length > 0) {
      Object.keys(data[0]).forEach(k => validCols.add(k));
    }
  } catch (e) {
    console.warn("Could not fetch schema sample:", e);
  }

  // Format blogs for Supabase
  const formattedRows = blogs.map((b, i) => {
    const row = {
      id: b.id || `blog-${i + 1}`,
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (validCols.size > 0) {
      const cleanRow = {};
      for (const k of Object.keys(row)) {
        if (validCols.has(k)) cleanRow[k] = row[k];
      }
      return cleanRow;
    }
    return row;
  });

  console.log("Upserting formatted blogs into Supabase 'blogs' table...");
  const { data, error } = await supabase.from("blogs").upsert(formattedRows);

  if (error) {
    console.error("Supabase upsert error:", error);
  } else {
    console.log(`✅ SUCCESS! Successfully synced ${blogs.length} articles directly into Supabase 'blogs' table!`);
  }

  // Verify fetch count
  const { data: fetchResult, count } = await supabase.from("blogs").select("*", { count: "exact" });
  console.log(`Live count in Supabase 'blogs' table: ${fetchResult ? fetchResult.length : 0}`);
}

syncBlogs();
