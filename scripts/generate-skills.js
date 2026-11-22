// JUST WORK · skill data builder
// Normalizes the compact specs in scripts/skills/*.js into the runtime
// schema and writes assets/skills/*.json, asserting exact counts.
const fs = require('fs');
const path = require('path');

const just = require('./skills/just.js');
const agent = require('./skills/agent.js');
const urgent = require('./skills/urgent.js');

const EXPECT = { 'just-working': 55, agent: 40, urgent: 25 };

function normalize(list, mode) {
  const seen = new Set();
  return list.map((s) => {
    if (!s.id || seen.has(s.id)) throw new Error(`[mode:${mode}] bad/dup skill id: ${s.id}`);
    seen.add(s.id);
    const io = (s.io || []).map(([k, l, t = 'text']) => ({ k, l, t }));
    return {
      id: s.id,
      name: s.n,
      cat: s.c,
      desc: s.d,
      io,
      tpl: s.tpl || '',
      fn: s.fn || null,
      out: s.out || 'md',
      lang: s.lang || null,
      ext: extFor(s.out),
      mode
    };
  });
}

function extFor(out) {
  switch (out) {
    case 'code': return 'code';
    case 'json': return 'json';
    case 'txt': return 'txt';
    case 'md': default: return 'md';
  }
}

const outDir = path.join(__dirname, '..', 'assets', 'skills');
fs.mkdirSync(outDir, { recursive: true });

let total = 0;
for (const [mode, list] of Object.entries({ 'just-working': just, agent, urgent })) {
  const data = normalize(list, mode);
  if (data.length !== EXPECT[mode]) {
    throw new Error(`COUNT MISMATCH for ${mode}: got ${data.length}, expected ${EXPECT[mode]}`);
  }
  const file = path.join(outDir, `${mode}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  total += data.length;
  // category distribution (handy for UI + docs)
  const cats = {};
  data.forEach((s) => { cats[s.cat] = (cats[s.cat] || 0) + 1; });
  console.log(`  ${mode.padEnd(13)} ${data.length} skills  ${JSON.stringify(cats)}`);
}

console.log(`\n  total skills: ${total} (expected ${55 + 40 + 25})`);
console.log('  OK: all counts match. Wrote assets/skills/*.json');
