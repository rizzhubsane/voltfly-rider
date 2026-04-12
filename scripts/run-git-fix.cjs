const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const log = path.join(__dirname, 'git-fix-log.txt');
const lines = [];

function logLine(msg) {
  lines.push(msg);
  console.log(msg);
}

process.chdir(root);

try {
  const stampProbe = Date.now();
  const probeDir = path.join('/tmp', `eas-git-probe-${stampProbe}`);
  const fileUrl = `file://${root.replace(/\\/g, '/')}`;
  try {
    fs.rmSync(probeDir, { recursive: true, force: true });
    execSync(`git clone --no-checkout --no-hardlinks --depth 1 "${fileUrl}" "${probeDir}"`, {
      stdio: 'pipe',
    });
    fs.rmSync(probeDir, { recursive: true, force: true });
    logLine('Git repo is already cloneable (EAS-style). Nothing to fix.');
    process.exit(0);
  } catch (_) {
    logLine('Shallow clone failed; repairing .git from origin...');
  }

  const origin = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
  logLine(`origin: ${origin}`);

  const stamp = Date.now();
  // Keep backup outside the repo so `git add -A` never tries to index a broken tree (EAS/GitKraken crumbs, etc.).
  const backup = path.join('/tmp', `voltfly-rider-git-corrupt-${stamp}`);
  logLine(`mv .git -> ${backup}`);
  execSync(`mv .git "${backup}"`, { stdio: 'inherit' });

  const tmp = path.join('/tmp', `voltfly-git-fix-${stamp}`);
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  logLine(`git clone --depth 1 into ${tmp}/fresh`);
  execSync(`git clone --depth 1 "${origin}" fresh`, { cwd: tmp, stdio: 'inherit' });

  execSync(`cp -R "${path.join(tmp, 'fresh', '.git')}" "${path.join(root, '.git')}"`, { stdio: 'inherit' });
  fs.rmSync(tmp, { recursive: true, force: true });

  const testDir = path.join('/tmp', `eas-shallow-test-${stamp}`);
  fs.rmSync(testDir, { recursive: true, force: true });
  logLine(`Testing shallow clone: ${fileUrl}`);
  execSync(`git clone --no-checkout --no-hardlinks --depth 1 "${fileUrl}" "${testDir}"`, {
    stdio: 'inherit',
  });
  fs.rmSync(testDir, { recursive: true, force: true });
  logLine('OK: shallow clone works.');
  logLine('Next (run yourself — avoids slow "Refresh index" during repair):');
  logLine('  git add -A && git status && git commit -m "chore: sync after git repair"');

  fs.writeFileSync(log, lines.join('\n'));
  logLine(`Wrote ${log}`);
} catch (e) {
  const err = String(e && e.message ? e.message : e);
  lines.push('ERROR: ' + err);
  try {
    fs.writeFileSync(log, lines.join('\n'));
  } catch (_) {}
  console.error(err);
  process.exit(1);
}
