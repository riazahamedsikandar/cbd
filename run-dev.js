const { spawn, execSync } = require('child_process');

console.log('[Dev Runner] Running image setup...');
try {
  execSync('node setup-images.js', { stdio: 'inherit' });
} catch (e) {
  console.error('[Dev Runner] Warning: Image setup failed:', e);
}

// Process arguments to filter out --host or --host=...
const args = [];
const originalArgs = process.argv.slice(2);
for (let i = 0; i < originalArgs.length; i++) {
  const arg = originalArgs[i];
  if (arg === '--host') {
    // Skip --host and its potential value
    if (i + 1 < originalArgs.length && !originalArgs[i + 1].startsWith('-')) {
      i++;
    }
  } else if (arg.startsWith('--host=')) {
    // Skip --host=value
  } else {
    args.push(arg);
  }
}

console.log('[Dev Runner] Spawning next dev server with arguments:', args);

const nextDev = spawn('next', ['dev', '-p', '3000', '-H', '0.0.0.0', ...args], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: 'development',
    NEXT_DEV: 'true'
  }
});

nextDev.on('close', (code) => {
  process.exit(code || 0);
});
