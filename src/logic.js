/* ============================================================
   JUST WORK · core logic (pure, no DOM / no network).
   Works in the Electron renderer and in plain Node (for tests).
   Exposed as globalThis.JW.
   ============================================================ */
(() => {
  "use strict";
  const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const splitLines = (t) => String(t ?? "").split(/\r?\n/);

  const BUILTINS = {
    csvToJson(v) {
      const sep = v.sep || ",";
      const rows = splitLines(v.csv).filter((r) => r.trim() !== "");
      if (rows.length < 2) return "需要至少 2 行（表头 + 数据）。";
      const head = rows[0].split(sep).map((h) => h.trim());
      const arr = rows.slice(1).map((r) => {
        const cells = r.split(sep);
        const o = {};
        head.forEach((h, i) => { o[h] = (cells[i] ?? "").trim(); });
        return o;
      });
      return v.pretty ? JSON.stringify(arr, null, 2) : JSON.stringify(arr);
    },
    jsonToCsv(v) {
      const arr = JSON.parse(v.js);
      if (!Array.isArray(arr) || !arr.length) return "需要一个非空 JSON 数组。";
      const head = Object.keys(arr[0]);
      const line = (o) => head.map((h) => String(o[h] ?? "").replace(/"/g, '""')).join(",");
      return [head.join(","), ...arr.map(line)].join("\n");
    },
    b64Encode(v) { return b64safe(String(v.t ?? "")); },
    b64Decode(v) { return b64unsafe(String(v.t ?? "").trim()); },
    urlEncode(v) { return encodeURIComponent(String(v.t ?? "")); },
    urlDecode(v) { return decodeURIComponent(String(v.t ?? "")); },
    tsNow(v) {
      const now = Date.now();
      const val = v.u === "s" ? Math.floor(now / 1000) : v.u === "µs" ? now * 1000 : now;
      return "当前 (" + (v.u || "ms") + "):\n" + val + "\n人类可读: " + new Date(now).toISOString();
    },
    epochToDate(v) {
      let n = Number(v.ts);
      if (!Number.isFinite(n)) return "请输入有效时间戳。";
      if (n <= 1e12) n = n * 1000;
      const d = new Date(n);
      return "时间戳: " + v.ts + "\n本地: " + d.toISOString() + "\nISO: " + d.toISOString();
    },
    genUuid(v) {
      const n = Math.max(1, Math.min(1000, Number(v.cnt) || 1));
      const out = [];
      for (let i = 0; i < n; i++) out.push(v.v8 === "" ? uuidV4() : uuidV1ish());
      return out.join("\n");
    },
    genPass(v) {
      const len = Math.max(4, Math.min(128, Number(v.len) || 16));
      const sets = [];
      if (v.upper === "1") sets.push("ABCDEFGHJKLMNPQRSTUVWXYZ");
      sets.push("abcdefghijkmnpqrstuvwxyz");
      if (v.digit === "1") sets.push("0123456789");
      if (v.sym === "1") sets.push("!@#$%^&*_-+=?");
      const pool = sets.join();
      return randomString(pool, len);
    },
    caseConvert(v) {
      const words = String(v.t ?? "").match(/[A-Z]?[a-z0-9]+|[A-Z]+/g) || [];
      const M = v.fmt || "camelCase";
      return {
        camelCase: words.map((x, i) => (i ? cap(x) : x.toLowerCase())).join(""),
        snake_case: words.join("_").toLowerCase(),
        "kebab-case": words.join("-").toLowerCase(),
        PascalCase: words.map(cap).join(""),
        UPPER_SNAKE: words.join("_").toUpperCase(),
        CONSTANT_CASE: words.join("_").toUpperCase()
      }[M] || words.join(" ");
    },
    textStats(v) {
      const t = String(v.t ?? "");
      const lines = t ? splitLines(t).length : 0;
      const cjk = (t.match(/[\u4e00-\u9fa5]/g) || []).length;
      const words = t.replace(/[\u4e00-\u9fa5]/g, " ").split(/\s+/).filter(Boolean).length;
      return "行数: " + lines + "\n字符数: " + t.length + "\n中文字数: " + cjk + "\n单词数: " + words;
    },
    dedupLines(v) {
      let lines = splitLines(v.t);
      if (v.trim === "1") lines = lines.filter((l) => l.trim() !== "");
      if (v.dedup === "1") lines = [...new Set(lines.map((l) => l.trim()))];
      return lines.join("\n");
    },
    sortLines(v) {
      const a = splitLines(v.t).filter((l) => l.trim() !== "");
      const dir = v.dir || "正序";
      if (dir === "逆序") a.sort((x, y) => y.localeCompare(x, "zh"));
      else if (dir === "随机") for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      else a.sort((x, y) => x.localeCompare(y, "zh"));
      return a.join("\n");
    },
    reverseText(v) { return String(v.t ?? "").split("").reverse().join(""); },
    jsonFmt(v) {
      let obj;
      try { obj = JSON.parse(v.js); } catch (e) { return "JSON 解析失败: " + e.message; }
      return v.mode === "min" ? JSON.stringify(obj) : JSON.stringify(obj, null, 2);
    },
    regexMatch(v) {
      let re;
      try { re = new RegExp(v.pat, v.flags || "gi"); } catch (e) { return "正则无效: " + e.message; }
      const out = [];
      let m;
      while ((m = re.exec(String(v.txt ?? ""))) !== null) { out.push(m.index + ": " + m[0]); if (m[0] === "" && !re.global) break; }
      return out.length ? "共 " + out.length + " 处匹配:\n" + out.join("\n") : "没有匹配到。";
    },
    htmlEscape(v) {
      return String(v.t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    },
    replaceText(v) { return String(v.t ?? "").split(v.find).join(v.repl ?? ""); },
    trimLines(v) { return splitLines(v.t).map((l) => l.trim()).join("\n"); },
    squeeze(v) { return String(v.t ?? "").replace(/\n{3,}/g, "\n\n"); },
    numFmt(v) {
      const n = Number(v.n);
      if (!Number.isFinite(n)) return "请输入数字。";
      return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: Number(v.dec) || 0 });
    },
    dateFmt(v) {
      const d = new Date(v.d);
      if (isNaN(d)) return "无法解析日期。";
      const p = (x) => String(x).padStart(2, "0");
      let f = v.fmt || "YYYY-MM-DD";
      f = f.replace(/YYYY/g, d.getFullYear())
        .replace(/MM/g, p(d.getMonth() + 1)).replace(/DD/g, p(d.getDate()))
        .replace(/HH/g, p(d.getHours())).replace(/mm/g, p(d.getMinutes())).replace(/ss/g, p(d.getSeconds()));
      return f;
    },
    randomPick(v) {
      const items = splitLines(v.t).filter((l) => l.trim() !== "");
      const k = Math.max(1, Math.min(items.length, Number(v.k) || 1));
      const pool = [...items];
      const picked = [];
      for (let i = 0; i < k; i++) { const j = Math.floor(Math.random() * pool.length); picked.push(pool.splice(j, 1)[0]); }
      return "抽中 " + picked.length + " 个:\n" + picked.join("\n");
    },
    lineDiff(v) {
      const A = splitLines(v.a), B = splitLines(v.b);
      const out = [];
      const n = Math.max(A.length, B.length);
      for (let i = 0; i < n; i++) {
        const x = A[i], y = B[i];
        if (x === y) out.push("  " + (x ?? ""));
        else out.push("- " + (x ?? "(无)") + "   ->   + " + (y ?? "(无)"));
      }
      return out.join("\n");
    }
  };

  // base64 that is safe for any UTF-8 text (browser + Node)
  function b64safe(s) {
    if (typeof btoa === "function") return btoa(unescape(encodeURIComponent(s)));
    return Buffer.from(s, "utf8").toString("base64");
  }
  function b64unsafe(s) {
    if (typeof atob === "function") return decodeURIComponent(escape(atob(s)));
    return Buffer.from(s, "base64").toString("utf8");
  }
  function randomString(pool, len) {
    const out = [];
    for (let i = 0; i < len; i++) {
      const buf = new Uint32Array(1);
      (typeof crypto !== "undefined" && crypto.getRandomValues) ? crypto.getRandomValues(buf) : (buf[0] = Math.floor(Math.random() * 0xffffffff));
      out.push(pool[buf[0] % pool.length]);
    }
    return out.join("");
  }
  function uuidV4() {
    const b = new Uint8Array(16);
    (typeof crypto !== "undefined" && crypto.getRandomValues) ? crypto.getRandomValues(b) : b.fill(Math.floor(Math.random() * 256));
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
    return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
  }
  function uuidV1ish() { // time-ordered, for "v8" (randomness label) — still unique enough
    const t = (Date.now() - 0x1b21dd813804000) / 10000;
    return "v8-" + Math.floor(t).toString(16) + "-" + uuidV4().slice(4);
  }

  function interpolate(tpl, vals) {
    const map = {};
    Object.entries(vals).forEach(([k, v]) => { map[k] = v; map[cap(k)] = cap(String(v)); });
    return String(tpl ?? "").replace(/\{\{\s*([\w]+)\s*\}\}/g, (m, key) => (map[key] !== undefined ? map[key] : ""));
  }

  function run(skill, vals) {
    if (skill.fn && BUILTINS[skill.fn]) return BUILTINS[skill.fn](vals);
    const v = Object.assign({}, vals || {});
    // {{date}} 始终可用：没填就取今天（模板字段里的显式 date 优先）
    if (!String(v.date ?? "").trim()) {
      const d = new Date();
      const p = (x) => String(x).padStart(2, "0");
      v.date = d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
    }
    return interpolate(skill.tpl, v);
  }

  const API = { BUILTINS, interpolate, run, cap, splitLines };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  if (typeof globalThis !== "undefined") globalThis.JW = API;
})();
