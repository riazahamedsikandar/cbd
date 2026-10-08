const fs = require("fs");
const path = require("path");

const filePath = path.resolve(process.cwd(), "src/clientBlogs.ts");
const fileContent = fs.readFileSync(filePath, "utf8");
const jsonMatch = fileContent.match(/export const CLIENT_BLOG_POSTS: BlogPost\[\] = (\[[\s\S]*\]);/);

if (!jsonMatch) {
  console.error("Could not parse CLIENT_BLOG_POSTS");
  process.exit(1);
}

const articles = JSON.parse(jsonMatch[1]);
console.log(`Fixing FAQ formatting across all ${articles.length} articles...`);

articles.forEach((art, idx) => {
  let content = art.content || "";

  // 1. Fix hyphens attached to questions like "- What helps sore muscles...?"
  // Insert \n\n before any "- Question?"
  content = content.replace(/(?<!\n)(-\s+[A-Z0-9][^?\n]+\?)/g, "\n\n$1");

  // 2. Separate question from answer if squished together: "- Question?The answer..." -> "Q: Question?\n\nThe answer..."
  content = content.replace(/-\s+([A-Z0-9][^?\n]+\?)([A-Z0-9])/g, "Q: $1\n\n$2");

  // 3. Ensure double newlines after every question mark in FAQ sections
  const blocks = content.split("\n\n");
  const cleanedBlocks = [];

  let inFaq = false;
  for (let b of blocks) {
    let trimmed = b.trim();
    if (/^(#+)?\s*(frequently asked questions|faqs|questions|common questions)/i.test(trimmed)) {
      inFaq = true;
      cleanedBlocks.push(trimmed);
      continue;
    }

    if (inFaq) {
      // If block has multiple hyphens or squished questions, split them
      if (trimmed.includes("?") && (trimmed.includes("- ") || trimmed.includes("Q:"))) {
        const subItems = trimmed.split(/(?=(?:-\s+|Q:\s*|\d+\.\s*)[A-[#])/);
        for (let sub of subItems) {
          const cleanSub = sub.replace(/^-\s*/, "Q: ").trim();
          if (cleanSub) cleanedBlocks.push(cleanSub);
        }
        continue;
      }
    }

    cleanedBlocks.push(trimmed);
  }

  art.content = cleanedBlocks.join("\n\n");
});

console.log("Successfully formatted and separated all FAQ questions and answers!");

const tsContent = `import { BlogPost } from "./types";\n\nexport const CLIENT_BLOG_POSTS: BlogPost[] = ${JSON.stringify(articles, null, 2)};\n`;

fs.writeFileSync(path.resolve(process.cwd(), "src/clientBlogs.ts"), tsContent, "utf8");
console.log("Updated src/clientBlogs.ts with clean separate FAQ blocks!");
