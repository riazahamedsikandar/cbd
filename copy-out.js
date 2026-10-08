const fs = require('fs');
const path = require('path');

if (fs.existsSync('out')) {
  // Ensure .htaccess is copied if present in public
  if (fs.existsSync('public/.htaccess')) {
    fs.copyFileSync('public/.htaccess', 'out/.htaccess');
  }

  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
  }
  fs.cpSync('out', 'dist', { recursive: true });
  console.log('[Postbuild] Copied out/ to dist/ (including .htaccess)');
}
