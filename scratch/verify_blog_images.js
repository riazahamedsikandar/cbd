const fs = require("fs");
const path = require("path");

const publicImagesDir = path.resolve(process.cwd(), "public/images");
const availableImages = fs.readdirSync(publicImagesDir);
console.log(`Available images in public/images (${availableImages.length} files):`);

const clientBlogsPath = path.resolve(process.cwd(), "src/clientBlogs.ts");
const content = fs.readFileSync(clientBlogsPath, "utf8");

const imageMatches = content.match(/\/images\/[a-zA-Z0-9._-]+/g) || [];
console.log(`Found ${imageMatches.length} image references in clientBlogs.ts:`);

const missing = [];
imageMatches.forEach((img) => {
  const filename = img.replace("/images/", "");
  if (!availableImages.includes(filename)) {
    missing.push(filename);
  }
});

console.log("Missing image files:", Array.from(new Set(missing)));
