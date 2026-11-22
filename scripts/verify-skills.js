// JUST WORK · CI-style skill validator.
// Reads the generated assets/skills/*.json and asserts:
//   1. exact counts (55 / 40 / 25)
//   2. unique ids across the whole set
//   3. every skill has name/desc/cat and a non-empty tpl OR a known fn
//   4. every {{placeholder}} in tpl resolves to an io key (or its Cap)
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const dir = path.join(__dirname, '..', 'assets', 'skills');
const EXPECT = { 'just-working': 55, agent: 40, urgent: 25 };
const KNOWN_FN = new Set([
  'csvToJson','jsonToCsv','b64Encode','b64Decode','urlEncode','urlDecode','tsNow',
  'epochToDate','genUuid','genPass','caseConvert','textStats','dedupLines','sortLines',
  'reverseText','jsonFmt','regexMatch','htmlEscape','replaceText','trimLines','squeeze',
  'numFmt','dateFmt','randomPick','lineDiff'
]);

const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;
let allIds = new Set();
let total = 0;

for (const [mode, expected] of Object.entries(EXPECT)) {
  const file = path.join(dir, `${mode}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.strictEqual(data.length, expected, `${mode} count ${data.length} != ${expected}`);
  for (const s of data) {
    assert.ok(s.name, `${mode}/${s.id}: missing name`);
    assert.ok(s.desc, `${mode}/${s.id}: missing desc`);
    assert.ok(s.cat, `${mode}/${s.id}: missing cat`);
    assert.ok(!allIds.has(s.id), `duplicate id ${s.id}`);
    allIds.add(s.id);
    // placeholder resolution
    const known = new Set();
    (s.io || []).forEach((f) => { known.add(f.k); known.add(cap(f.k)); });
    if (s.tpl) {
      const ph = s.tpl.match(/\{\{\s*([\w]+)\s*\}\}/g) || [];
      ph.forEach((p) => {
        const key = p.replace(/[{}\s]/g, '');
        assert.ok(known.has(key), `${s.id}: unresolved placeholder {{${key}}}`);
      });
    }
    assert.ok(s.tpl || s.fn, `${s.id}: has neither tpl nor fn`);
    if (s.fn) assert.ok(KNOWN_FN.has(s.fn), `${s.id}: unknown fn ${s.fn}`);
    total++;
  }
  console.log(`  ${mode.padEnd(13)} ${data.length} ok`);
}

console.log(`\n  validated ${total} skills across ${allIds.size} unique ids — all placeholders resolve, no unknown fn.`);
console.log('  PASS');
