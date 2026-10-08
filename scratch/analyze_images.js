const fs = require("fs");
const path = require("path");

function getFolderStats(dirPath) {
  let count = 0;
  let totalBytes = 0;
  const exts = new Set([".webp", ".png", ".jpg", ".jpeg", ".gif", ".svg"]);
  const fileList = [];

  function scan(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    const items = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const item of items) {
      const full = path.join(currentDir, item.name);
      if (item.isDirectory()) {
        if (item.name !== "node_modules" && item.name !== ".git" && item.name !== ".next") {
          scan(full);
        }
      } else {
        const ext = path.extname(item.name).toLowerCase();
        if (exts.has(ext)) {
          const stat = fs.statSync(full);
          count++;
          totalBytes += stat.size;
          fileList.push({ name: item.name, rel: path.relative(process.cwd(), full), size: stat.size });
        }
      }
    }
  }

  scan(dirPath);
  return { count, sizeMB: (totalBytes / (1024 * 1024)).toFixed(2), totalBytes, fileList };
}

const foldersToScan = [
  "public/images",
  "public/resized_jpg",
  "images",
  "public",
  "out",
  "dist"
];

console.log("=== PROJECT IMAGE STORAGE ANALYSIS ===");
foldersToScan.forEach(f => {
  const p = path.resolve(process.cwd(), f);
  if (fs.existsSync(p)) {
    const stats = getFolderStats(p);
    console.log(`Folder: ${f.padEnd(20)} | Files: ${String(stats.count).padEnd(4)} | Size: ${stats.sizeMB} MB`);
  } else {
    console.log(`Folder: ${f.padEnd(20)} | NOT FOUND`);
  }
});
