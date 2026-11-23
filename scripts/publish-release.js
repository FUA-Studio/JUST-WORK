// JUST WORK · publish a GitHub Release with binary artifacts.
//   Usage: node scripts/publish-release.js <ghp_token> <tag> <version>
//   - creates (or reuses) a release with the given tag on main
//   - attaches dist/*.zip / *.exe as assets
const fs = require('fs');
const path = require('path');

const OWNER = 'FUA-Studio', REPO = 'JUST-WORK';
const token = process.argv[2];
const tag = process.argv[3] || 'v1.0.0';
const version = process.argv[4] || '1.0.0';
if (!token) { console.error('token required'); process.exit(1); }
const H = { Authorization: 'token ' + token, Accept: 'application/vnd.github+json' };
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;

async function j(method, url, body) {
  const r = await fetch(url, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let out; try { out = JSON.parse(t); } catch { out = t; }
  if (!r.ok) { console.error(`  ! ${method} ${url.replace(API, '')} -> ${r.status}`); console.error('    ' + String(t).slice(0, 300)); process.exit(1); }
  return out;
}

// find dist artifacts (single-file exes; the old zip gets dropped below)
const dist = path.join(__dirname, '..', 'dist');
const assets = fs.readdirSync(dist).filter((f) => /\.exe$/i.test(f) && fs.statSync(path.join(dist, f)).isFile());
console.log('  assets to attach:', assets.join(', ') || '(none)');

async function getRelease() {
  const r = await fetch(API + `/releases/tags/${encodeURIComponent(tag)}`, { headers: H });
  if (r.status === 404) return null;
  if (!r.ok) { console.error('  ! GET release ->', r.status); process.exit(1); }
  return r.json();
}

(async () => {
  // create or reuse release
  let rel = await getRelease();
  if (!rel) {
    rel = await j('POST', API + '/releases', {
      tag_name: tag,
      target_commitish: 'main',
      name: `JUST WORK ${version}`,
      draft: false, prerelease: false,
      body: ['# JUST WORK ' + version, '', 'FUA Studio · 桌面工作助手（三模式 · 120 技能）。', '', '## 安装', '- 安装包：JUST-WORK-' + version + '-x64.exe，双击安装。', '- 便携版：JUST-WORK-' + version + '-portable.exe，双击直接跑，免安装免解压。', '', 'Windows x64。'].join('\n')
    });
    console.log('  +release', rel.tag_name, rel.html_url);
  } else {
    console.log('  release exists:', rel.tag_name);
  }

  // drop old zip assets (we ship single-file exes now)
  for (const a of rel.assets || []) {
    if (/\.zip$/i.test(a.name)) {
      const r = await fetch(API + `/releases/assets/${a.id}`, { method: 'DELETE', headers: H });
      console.log(`  -asset ${a.name} ${r.ok ? '(deleted)' : '(still there, ' + r.status + ')'}`);
    }
  }

  // attach assets (skip ones already uploaded)
  const have = new Set((rel.assets || []).map((a) => a.name));
  for (const a of assets) {
    if (have.has(a)) { console.log('  =asset exists:', a); continue; }
    const p = path.join(dist, a);
    const buf = fs.readFileSync(p);
    const base = rel.upload_url.replace(/\{.*$/, '').replace(/\?.*$/, '');
    const r = await fetch(base + '?name=' + encodeURIComponent(a), {
      method: 'POST',
      headers: { ...H, 'Content-Type': 'application/octet-stream' },
      body: buf
    });
    if (!r.ok) { console.error(`  ! asset ${a} -> ${r.status}`); console.error('    ' + (await r.text()).slice(0, 200)); continue; }
    const aj = await r.json();
    console.log(`  +asset ${a} (${Math.round(buf.length / 1048576)} MB)`);
  }

  console.log(`\n  release: ${rel.html_url}`);
})();
