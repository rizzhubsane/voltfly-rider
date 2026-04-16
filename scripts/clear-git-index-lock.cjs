/**
 * Removes a stale .git/index.lock when no process has the file open.
 * Safe to run if Git commands hang with no obvious in-progress operation.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const lock = path.join(__dirname, '..', '.git', 'index.lock');

if (!fs.existsSync(lock)) {
  console.log('No .git/index.lock (nothing to do).');
  process.exit(0);
}

try {
  execSync(`lsof "${lock}"`, { stdio: 'pipe' });
  console.error(
    'index.lock exists and a process still has it open. Close that Git process, then retry.',
  );
  process.exit(1);
} catch {
  fs.unlinkSync(lock);
  console.log('Removed stale .git/index.lock');
  process.exit(0);
}
