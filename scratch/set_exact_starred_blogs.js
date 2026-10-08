const { createClient } = require("@supabase/supabase-js");

const url = "https://jpqaycxdmwpucoddfuge.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwcWF5Y3hkbXdwdWNvZGRmdWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3ODA0MjksImV4cCI6MjA5OTM1NjQyOX0.mbII7ftHfacBlFno26hw032d0TsdU5RtnkJ2QIlMK1E";

const supabase = createClient(url, anonKey);

async function setExactStarredBlogs() {
  console.log("Setting exact starred blog IDs in Supabase Cloud Database...");
  
  // The exact 3 starred blogs from the user's screenshot:
  // 1. Understanding the Purity Difference: CBD vs. Delta-8 vs. Delta-9 (blog-client-19)
  // 2. Senior Pet Care: Enhancing Playtime and Healing Rest with CBD (blog-client-24)
  // 3. How to Incorporate CBD Into Your Daily Wellness Routine (blog-client-23)
  const starredIds = [
    "blog-client-19",
    "blog-client-24",
    "blog-client-23",
    "understanding-the-purity-difference-cbd-vs-delta-8-vs-delta-9",
    "senior-pet-care-enhancing-playtime-and-healing-rest-with-cbd",
    "how-to-incorporate-cbd-into-your-daily-wellness-routine"
  ];

  const payload = {
    id: "business_info",
    seoKeywordsOverride: JSON.stringify(starredIds),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from("settings").upsert(payload);

  if (error) {
    console.error("Error setting starred blogs in Supabase:", error);
  } else {
    console.log("✅ SUCCESS! Pushed exact 3 Starred Blogs to Supabase Cloud Database!");
  }
}

setExactStarredBlogs();
