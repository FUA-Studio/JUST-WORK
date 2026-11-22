/* ============================================================
   JUST WORK · SKILL.md 解析（纯函数，无 DOM / 无网络）
   支持：
     ---
     name: 技能名
     description: 一句话说明
     ---
     正文（发给模型的任务说明）
   暴露为 globalThis.JWMD
   ============================================================ */
(() => {
  "use strict";

  function parseFrontmatter(raw) {
    const meta = {};
    const text = String(raw ?? "").replace(/^\uFEFF/, "");
    const m = text.match(/^\s*---\r?\n([\s\S]*?)\r?\n---\s*(\r?\n|$)/);
    if (!m) return { meta, body: text.trim() };
    let lastKey = "";
    m[1].split(/\r?\n/).forEach((line) => {
      if (!line.trim()) return;
      const kv = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
      if (kv) {
        const key = kv[1];
        let val = kv[2].trim();
        if (/^[|>][-+]?$/.test(val)) { meta[key] = ""; lastKey = key; return; }
        meta[key] = val.replace(/^["']|["']$/g, "");
        lastKey = key;
        return;
      }
      // YAML 块内容（| / > 的续行）
      if (lastKey && /^\s+/.test(line)) {
        meta[lastKey] = (meta[lastKey] ? meta[lastKey] + " " : "") + line.trim();
      }
    });
    return { meta, body: text.slice(m[0].length).trim() };
  }

  function parse(raw, fileName) {
    const { meta, body } = parseFrontmatter(raw);
    const base = String(fileName || "").replace(/\.(md|markdown|txt)$/i, "");
    const name = (meta.name || base || "未命名技能").trim();
    let desc = (meta.description || meta.desc || "").trim();
    if (!desc) {
      const h1 = body.match(/^#\s+(.+)$/m);
      desc = h1 ? h1[1].trim() : "从 SKILL.md 导入的技能";
    }
    return {
      name,
      desc,
      body: body || `# ${name}\n\n（这个 SKILL.md 没有正文）`,
      license: meta.license || "",
      tools: meta["allowed-tools"] || meta.allowedTools || ""
    };
  }

  const API = { parse, parseFrontmatter };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  if (typeof globalThis !== "undefined") globalThis.JWMD = API;
})();
