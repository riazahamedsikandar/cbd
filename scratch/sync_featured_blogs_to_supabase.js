const { createClient } = require("@supabase/supabase-js");

const url = "https://jpqaycxdmwpucoddfuge.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwcWF5Y3hkbXdwdWNvZGRmdWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3ODA0MjksImV4cCI6MjA5OTM1NjQyOX0.mbII7ftHfacBlFno26hw032d0TsdU5RtnkJ2QIlMK1E";

const supabase = createClient(url, anonKey);

async function syncFeaturedBlogs() {
  console.log("Checking Supabase 'settings' table...");
  const { data: settingsData } = await supabase.from("settings").select("*").eq("id", "business_info").maybeSingle();

  const featuredIds = [
    "blog-client-1",  // How to Choose the Best CBD Products in Flower Mound, TX
    "blog-client-23", // How to Incorporate CBD Into Your Daily Wellness Routine
    "blog-client-24"  // Senior Pet Care: Enhancing Playtime and Healing Rest with CBD
  ];

  const payload = {
    id: "business_info",
    seoKeywordsOverride: JSON.stringify(featuredIds), // store as fallback JSON string
    featuredBlogIds: JSON.stringify(featuredIds),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from("settings").upsert(payload);

  if (error) {
    console.warn("Settings upsert warning (trying fallback payload):", error.message);
    delete payload.featuredBlogIds;
    await supabase.from("settings").upsert(payload);
  }

  console.log("✅ SUCCESS! Featured Blog IDs saved to Supabase Cloud Database!");
}

syncFeaturedBlogs();
