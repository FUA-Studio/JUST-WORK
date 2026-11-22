// JUST WORK · publish to GitHub via the Git Data API (no git needed).
//   Flow: blob(s) -> nested tree -> commit (parent = current main HEAD) -> update refs/heads/main
//   The token is read from argv/env and is NEVER written into the repository.
//   Usage:  node scripts/upload.js <ghp_token>
const fs = require('fs');
const path = require('path');

const OWNER = 'FUA-Studio';
const REPO = 'JUST-WORK';
const BRANCH = 'main';
const token = process.env.GH_TOKEN || process.argv[2];
if (!token) { console.error('GH_TOKEN missing (env or 2nd arg)'); process.exit(1); }
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
const H = { Authorization: 'token ' + token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' };

const ROOT = path.join(__dirname, '..');
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'config']);

// ---------- collect files ----------
function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    const rel = path.relative(ROOT, p).replace(/\\/g, '/');
    if (e.isDirectory()) { if (!EXCLUDE_DIRS.has(e.name)) out.push(...walk(p)); }
    else out.push(rel);
  }
  return out;
}
const files = walk(ROOT);
console.log(`  ${files.length} files to publish`);

// ---------- API helper ----------
async function api(method, url, body) {
  const r = await fetch(url, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  if (!r.ok) { console.error(`  ! ${method} ${url.replace(API, '')} -> ${r.status}`); console.error('    ' + String(text).slice(0, 300)); process.exit(1); }
  return json;
}

// ---------- 1) blobs ----------
const blobShas = {};
async function makeBlobs() {
  for (const rel of files) {
    const b64 = fs.readFileSync(path.join(ROOT, rel)).toString('base64');
    blobShas[rel] = (await api('POST', API + '/git/blobs', { content: b64, encoding: 'base64' })).sha;
  }
  console.log(`  +${files.length} blobs`);
}

// ---------- 2) nested trees (bottom-up) ----------
async function createTree(relDir) {
  const prefix = relDir ? relDir + '/' : '';
  const under = files.filter((f) => f.startsWith(prefix));
  const entries = [];
  for (const f of under.filter((f) => !f.slice(prefix.length).includes('/'))) {
    entries.push({ path: f.slice(prefix.length), mode: '100644', type: 'blob', sha: blobShas[f] });
  }
  const subDirs = [...new Set(under.map((f) => {
    const rest = f.slice(prefix.length);
    const i = rest.indexOf('/');
    return i === -1 ? null : rest.slice(0, i);
  }).filter(Boolean))];
  for (const sd of subDirs) entries.push({ path: sd, mode: '040000', type: 'tree', sha: await createTree(prefix + sd) });
  const bad = entries.filter((e) => !e.sha || (e.type === 'tree' && !e.sha));
  if (bad.length) throw new Error('createTree<' + relDir + '> has entry with missing sha: ' + JSON.stringify(bad));
  console.log('  tree<' + relDir + '> ' + entries.length + ' entries');
  const j = await api('POST', API + '/git/trees', { tree: entries });
  return j.sha; // the new tree sha is top-level, not .tree.sha
}

// ---------- run ----------
(async () => {
  await makeBlobs();
  const rootTree = await createTree('');
  console.log('  +root tree');

  let parent = null;
  try {
    const commits = await api('GET', API + '/commits?sha=' + BRANCH + '&per_page=1');
    if (commits[0]) parent = commits[0].sha;
  } catch { /* empty repo: no parent */ }

  const commit = await api('POST', API + '/git/commits', {
    message: 'JUST WORK: full project source, skills, logo, docs (FUA Studio)',
    tree: rootTree,
    parents: parent ? [parent] : [],
  });
  console.log('  +commit ' + commit.sha.slice(0, 8));

  // ---------- 5) point refs/heads/main at the commit ----------
  if (parent) {
    const ref = await api('PUT', API + '/git/refs/heads/' + BRANCH, { sha: commit.sha, force: true });
    console.log('  ^ref ' + ref.ref + ' (updated)');
  } else {
    const ref = await api('POST', API + '/git/refs', { ref: 'refs/heads/' + BRANCH, sha: commit.sha });
    console.log('  +ref ' + ref.ref);
  }

  console.log(`\n  published ${files.length} files -> https://github.com/${OWNER}/${REPO}/tree/${BRANCH}`);
})();
