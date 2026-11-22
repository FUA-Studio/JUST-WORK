// JUST WORK · logic smoke test (run with: node scripts/test-logic.js)
const L = require("../src/logic.js");
const assert = require("assert");

let n = 0;
const ok = (label, fn) => { try { fn(); n++; console.log("  ok  " + label); } catch (e) { console.error("  FAIL " + label + " -> " + e.message); process.exitCode = 1; } };

// template interpolation
ok("interpolate basic + Cap", () => {
  assert.strictEqual(L.interpolate("{{a}} / {{A}}", { a: "res" }), "res / Res");
  assert.strictEqual(L.interpolate("x={{a}}", {}), "x=");
});

// a few representative transforms
ok("csvToJson", () => {
  const out = L.BUILTINS.csvToJson({ csv: "a,b\n1,x\n2,y", sep: ",", pretty: "1" });
  assert.deepStrictEqual(JSON.parse(out), [{ a: "1", b: "x" }, { a: "2", b: "y" }]);
});
ok("jsonToCsv", () => {
  assert.strictEqual(L.BUILTINS.jsonToCsv({ js: '[{"a":1,"b":"2"}]' }).replace(/\r?\n/g, "|"), "a,b|1,2");
});
ok("caseConvert", () => {
  assert.strictEqual(L.BUILTINS.caseConvert({ t: "myVarName", fmt: "PascalCase" }), "MyVarName");
  assert.strictEqual(L.BUILTINS.caseConvert({ t: "myVarName", fmt: "snake_case" }), "my_var_name");
});
ok("jsonFmt pretty/min", () => {
  assert.strictEqual(L.BUILTINS.jsonFmt({ js: '{"a":1}', mode: "min" }), '{"a":1}');
  assert.ok(L.BUILTINS.jsonFmt({ js: '{"a":1}', mode: "pretty" }).includes("\n"));
});
ok("htmlEscape", () => {
  assert.strictEqual(L.BUILTINS.htmlEscape({ t: '<a>&"' }), "&lt;a&gt;&amp;&quot;");
});
ok("replaceText", () => {
  assert.strictEqual(L.BUILTINS.replaceText({ t: "aa aa", find: "a", repl: "b" }), "bb bb");
});
ok("numFmt", () => {
  assert.strictEqual(L.BUILTINS.numFmt({ n: "1234567", dec: "0" }), "1,234,567");
});
ok("regexMatch", () => {
  const out = L.BUILTINS.regexMatch({ pat: "o+", flags: "g", txt: "foo boo" });
  assert.ok(out.includes("共 2") && out.includes("oo"));
});
ok("dateFmt", () => {
  assert.strictEqual(L.BUILTINS.dateFmt({ d: "2026-11-22", fmt: "YYYY/MM/DD" }), "2026/11/22");
});
ok("lineDiff", () => {
  const out = L.BUILTINS.lineDiff({ a: "x\ny", b: "x\nz" });
  assert.ok(out.includes("- y") && out.includes("+ z"));
});
ok("run() routes fn vs tpl", () => {
  assert.strictEqual(L.run({ fn: "reverseText", tpl: "" }, { t: "abc" }), "cba");
  assert.strictEqual(L.run({ fn: null, tpl: "hi {{n}}" }, { n: "JW" }), "hi JW");
});
ok("uuid shape", () => {
  assert.match(L.BUILTINS.genUuid({ cnt: "1", v8: "" }).trim(), /^[0-9a-f-]{36}$/);
});

console.log("\n  " + n + " logic tests passed." + (process.exitCode ? " (with failures)" : ""));
