const { createClient } = require("@supabase/supabase-js");

const url = "https://jpqaycxdmwpucoddfuge.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwcWF5Y3hkbXdwdWNvZGRmdWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3ODA0MjksImV4cCI6MjA5OTM1NjQyOX0.mbII7ftHfacBlFno26hw032d0TsdU5RtnkJ2QIlMK1E";

const supabase = createClient(url, anonKey);

async function inspectBlogs() {
  const { data, error } = await supabase.from("blogs").select("*");
  if (error) {
    console.error("Error fetching blogs:", error);
    return;
  }
  console.log(`Fetched ${data.length} blogs from Supabase.`);
  if (data.length > 0) {
    console.log("Sample blog row keys:", Object.keys(data[0]));
    const featured = data.filter(b => b.isFeaturedHome || b.is_featured_home);
    console.log(`Blogs with isFeaturedHome=true in Supabase: ${featured.length}`);
    data.slice(0, 5).forEach(b => {
      console.log(`- ID: ${b.id}, Title: ${b.title}, isFeaturedHome: ${b.isFeaturedHome}`);
    });
  }
}

inspectBlogs();
