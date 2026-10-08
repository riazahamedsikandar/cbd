const fs = require("fs");
const path = require("path");

function searchInDir(dir, query) {
  let matches = [];
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) {
      if (f.name !== "node_modules" && f.name !== ".next") {
        matches = matches.concat(searchInDir(full, query));
      }
    } else {
      const content = fs.readFileSync(full, "utf8");
      if (content.includes(query)) {
        matches.push(full);
      }
    }
  }
  return matches;
}

const usage = searchInDir(path.resolve(process.cwd(), "src"), "resized_jpg");
console.log("Usage of 'resized_jpg' inside src directory:", usage);
