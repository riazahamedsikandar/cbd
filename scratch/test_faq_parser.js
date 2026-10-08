const fs = require("fs");
const path = require("path");

const filePath = path.resolve(process.cwd(), "src/clientBlogs.ts");
const fileContent = fs.readFileSync(filePath, "utf8");
const jsonMatch = fileContent.match(/export const CLIENT_BLOG_POSTS: BlogPost\[\] = (\[[\s\S]*\]);/);

const articles = JSON.parse(jsonMatch[1]);
console.log(`Testing FAQ extraction on all ${articles.length} articles...`);

let articlesWithFaqs = 0;

articles.forEach((art, idx) => {
  const content = art.content || "";
  const blocks = content.split("\n\n");
  
  let inFaq = false;
  const faqs = [];
  
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (/^(#+)?\s*(frequently asked questions|faqs|questions|common questions|q&a)/i.test(block)) {
      inFaq = true;
      continue;
    }

    if (inFaq || /^(#+\s*)?(q:|\d+\.|\?)/i.test(block) || (block.includes("?") && block.length < 150)) {
      if (block.startsWith("#") || block.endsWith("?") || /^\d+\./.test(block) || /^Q:/i.test(block)) {
        const lines = block.split("\n");
        const qText = lines[0].replace(/^#+\s*|^\d+\.\s*|^Q:\s*/i, "").trim();
        const aText = lines.slice(1).join("\n").trim() || (blocks[i + 1] && !blocks[i + 1].endsWith("?") ? blocks[i + 1] : "");
        if (qText) {
          faqs.push({ q: qText, a: aText });
        }
      }
    }
  }

  if (faqs.length > 0) {
    articlesWithFaqs++;
    console.log(`Article #${idx + 1} (${art.title.slice(0, 35)}...): Found ${faqs.length} FAQ Accordions!`);
  }
});

console.log(`\n🎉 FAQ Parser successfully identified FAQs in ${articlesWithFaqs} out of ${articles.length} articles!`);
