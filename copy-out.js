const fs = require('fs');
const path = require('path');

if (fs.existsSync('out')) {
  // Ensure .htaccess is copied if present in public
  if (fs.existsSync('public/.htaccess')) {
    fs.copyFileSync('public/.htaccess', 'out/.htaccess');
  }

  // Create .html aliases for all directory routes to prevent directory slash redirects
  const entries = fs.readdirSync('out', { withFileTypes: true });
  entries.forEach(entry => {
    if (entry.isDirectory() && entry.name !== '_next') {
      const indexPath = path.join('out', entry.name, 'index.html');
      const aliasPath = path.join('out', `${entry.name}.html`);
      if (fs.existsSync(indexPath)) {
        fs.copyFileSync(indexPath, aliasPath);
      }
    }
  });

  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
  }
  fs.cpSync('out', 'dist', { recursive: true });
  console.log('[Postbuild] Copied out/ to dist/ (including .htaccess and dynamic HTML aliases)');
}
