/* ============================================================
   JUST WORK · 渲染层（对话式界面）
   逻辑执行来自 logic.js（全局 JW），本文件只做 DOM / 交互
   ============================================================ */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const app = $("#app");
  const LOGO = "../assets/logo/logo.svg";

  const MODES = {
    "just-working": {
      label: "Just Working",
      eyebrow: "默认模式",
      title: "今天想先做点什么？",
      sub: "直接说一句，或者从下面挑一个技能。",
      ph: "描述你要完成的事，例如：帮我写一份下周的项目周报…"
    },
    agent: {
      label: "Agent",
      eyebrow: "技术模式",
      title: "把难活交给 Agent。",
      sub: "描述问题或贴一段报错，也可以从技能库挑工程技能。",
      ph: "描述需求、贴报错、或说明要重构的代码…"
    },
    urgent: {
      label: "Urgent",
      eyebrow: "快速模式",
      title: "简单的事，直接说。",
      sub: "轻量工具集合，输入即出结果，不绕弯。",
      ph: "要算的、要转的、要生成的，一句话说清…"
    }
  };

  const CAT_META = {
    文档: ["i-file", "#4a63d8"], 报表: ["i-chart", "#2b8a6b"],
    会议: ["i-users", "#c47d22"], 计划: ["i-target", "#6d4fd6"],
    简历: ["i-user", "#c1517f"], 办公: ["i-briefcase", "#3a72a8"],
    写作: ["i-pen", "#b5653d"], 邮件: ["i-mail", "#2b7fa6"],
    PPT: ["i-ppt", "#c25a34"],
    编码: ["i-code", "#4a63d8"], 工具: ["i-sliders", "#5b7286"],
    时间: ["i-clock", "#b3862a"], 数据: ["i-chart", "#2b8a6b"],
    数据转换: ["i-swap", "#2b8a6b"], 随机: ["i-spark", "#6d4fd6"],
    文本: ["i-type", "#54627a"],
    安全: ["i-shield", "#b84a42"], 测试: ["i-check", "#2b8a6b"],
    工程: ["i-cube", "#3a72a8"], 后端: ["i-server", "#4d5fc0"],
    架构: ["i-layers", "#6d4fd6"], 数据库: ["i-db", "#397f96"],
    算法: ["i-code", "#4a63d8"], DevOps: ["i-cloud", "#2b8a6b"]
  };
  const DEFAULT_META = ["i-file", "#5b7286"];
  const meta = (cat) => CAT_META[cat] || DEFAULT_META;

  const SEL = {
    sep: [",", ";", { v: "\t", l: "制表符" }, "|"],
    u: [{ v: "ms", l: "毫秒" }, { v: "s", l: "秒" }, { v: "µs", l: "微秒" }],
    fmt: ["camelCase", "snake_case", "kebab-case", "PascalCase", "UPPER_SNAKE", "CONSTANT_CASE"],
    dir: ["正序", "逆序", "随机"],
    mode: [{ v: "pretty", l: "美化（2 空格）" }, { v: "min", l: "压缩" }],
    lang: ["JavaScript", "TypeScript", "Python", "Go", "Rust"],
    type: [
      { v: "email", l: "邮箱" }, { v: "url", l: "URL" }, { v: "phone_cn", l: "手机号" },
      { v: "id_card", l: "身份证号" }, { v: "date_iso", l: "ISO 日期" }
    ],
    ctype: ["feat", "fix", "docs", "refactor", "test", "chore", "perf", "style"],
    on: [{ v: "push", l: "push" }, { v: "pull_request", l: "PR" }, { v: "push, pull_request", l: "push + PR" }],
    method: ["get", "post", "put", "patch", "delete"],
    pat: [{ v: "strategy", l: "策略" }, { v: "observer", l: "观察者" }, { v: "factory", l: "工厂" }],
    stack: [{ v: "node", l: "Node" }, { v: "python", l: "Python" }, { v: "go", l: "Go" }, { v: "all", l: "通用" }]
  };

  const BUILTIN_MODELS = [
    { id: "agnes-3-flash", name: "AGNES 3.0 Flash", tag: "推荐", provider: "agnes", model: "agnes-3.0-flash", base: "https://apihub.agnes-ai.cn/v1" },
    { id: "agnes-3-pro", name: "AGNES 3.0 Pro", tag: "", provider: "agnes", model: "agnes-3.0-pro", base: "https://apihub.agnes-ai.cn/v1" },
    { id: "agnes-25-flash", name: "AGNES 2.5 Flash", tag: "轻量", provider: "agnes", model: "agnes-2.5-flash", base: "https://apihub.agnes-ai.cn/v1" },
    { id: "agnes-25-pro", name: "AGNES 2.5 Pro", tag: "", provider: "agnes", model: "agnes-2.5-pro", base: "https://apihub.agnes-ai.cn/v1" }
  ];

  const state = {
    mode: "just-working",
    cat: "全部",
    data: {},
    libCat: "全部",
    libQuery: "",
    open: null,
    msgCount: 0,
    modelId: "agnes-3-flash",
    customModels: [],
    customSkills: [],
    importedSkills: []
  };

  /* ---------------- 基础工具 ---------------- */
  const esc = (s) => String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  const hexSoft = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0.09)`;
  };

  const store = {
    get(k, d) {
      try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }
      catch { return d; }
    },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };

  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    requestAnimationFrame(() => t.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => { t.hidden = true; }, 220);
    }, 1700);
  }

  async function loadData(mode) {
    if (state.data[mode]) return state.data[mode];
    let list = [];
    try {
      if (window.jw) list = await window.jw.listSkills(mode);
      else {
        const r = await fetch(`../assets/skills/${mode}.json`, { cache: "no-store" });
        list = await r.json();
      }
    } catch (e) { console.error("加载技能失败", e); }
    list = Array.isArray(list) ? list : [];
    // 自己添加 / 导入的技能跟在预置技能后面
    const mine = state.customSkills
      .concat(state.importedSkills)
      .filter((s) => s.mode === mode);
    state.data[mode] = list.concat(mine);
    return state.data[mode];
  }

  /* ---------------- 自定义技能 ---------------- */
  const SKILL_KEY = "jw.customSkills";
  const IMPORT_KEY = "jw.importedSkills";

  function loadCustomSkills() {
    state.customSkills = store.get(SKILL_KEY, []);
    state.importedSkills = store.get(IMPORT_KEY, []);
  }

  function persistSkills() {
    store.set(SKILL_KEY, state.customSkills);
    store.set(IMPORT_KEY, state.importedSkills);
  }

  function refreshSkills() {
    const total = (state.data[state.mode] || []).length;
    $("#tbPill").textContent = `${total} 个技能`;
    $("#libCount").textContent = total;
    renderQuick();
    renderLibCats();
    renderLibList();
  }

  function openSkillModal() {
    $("#sName").value = "";
    $("#sCat").value = "";
    $("#sDesc").value = "";
    $("#sTpl").value = "";
    $("#skillModal").hidden = false;
    setTimeout(() => $("#sName").focus(), 30);
  }
  const closeSkillModal = () => { $("#skillModal").hidden = true; };

  function saveSkill() {
    const name = $("#sName").value.trim();
    const tpl = $("#sTpl").value.trim();
    if (!name) { toast("请填写技能名称"); $("#sName").focus(); return; }
    if (!tpl) { toast("请填写内容模板"); $("#sTpl").focus(); return; }
    const sk = {
      id: "u-" + Date.now(),
      name,
      cat: $("#sCat").value.trim() || "我的技能",
      desc: $("#sDesc").value.trim() || "我自己添加的技能",
      io: [{ k: "input", l: "内容 / 原话", t: "area", ph: "模板里的 {{input}} 会替换成这里的内容", req: false }],
      tpl,
      fn: null,
      out: "md",
      ext: "md",
      mode: state.mode,
      custom: true
    };
    state.customSkills.push(sk);
    persistSkills();
    state.data[state.mode].push(sk);
    closeSkillModal();
    refreshSkills();
    toast("已添加技能：" + name);
  }

  /* 导入 SKILL.md（frontmatter 里的 name / description 作为技能名与说明，正文作为任务说明） */
  async function importSkillFiles(files) {
    const list = Array.from(files || []);
    if (!list.length) return;
    let ok = 0;
    for (const f of list) {
      try {
        const raw = await f.text();
        const p = globalThis.JWMD
          ? JWMD.parse(raw, f.name)
          : { name: f.name.replace(/\.md$/i, ""), desc: "", body: raw };
        const sk = {
          id: "md-" + Date.now() + "-" + ok,
          name: p.name,
          cat: "SKILL.md",
          desc: p.desc,
          io: [{ k: "input", l: "要处理的内容", t: "area", ph: "这段内容会连同 SKILL.md 里的说明一起交给模型", req: true }],
          tpl: "",
          script: p.body,
          fn: null,
          out: "md",
          ext: "md",
          mode: state.mode,
          imported: true
        };
        state.importedSkills.push(sk);
        if (state.data[state.mode]) state.data[state.mode].push(sk);
        ok++;
      } catch (e) { console.error("导入失败", f.name, e); }
    }
    persistSkills();
    refreshSkills();
    toast(ok ? `已导入 ${ok} 个 SKILL.md` : "导入失败");
  }

  function removeSkill(sk) {
    if (sk.imported) state.importedSkills = state.importedSkills.filter((x) => x.id !== sk.id);
    else state.customSkills = state.customSkills.filter((x) => x.id !== sk.id);
    persistSkills();
    state.data[sk.mode] = (state.data[sk.mode] || []).filter((x) => x.id !== sk.id);
    refreshSkills();
    toast("已删除技能：" + sk.name);
  }

  /* ---------------- 模型 ---------------- */
  const allModels = () => BUILTIN_MODELS.concat(state.customModels);
  const currentModel = () => allModels().find((m) => m.id === state.modelId) || BUILTIN_MODELS[0];

  function loadModels() {
    state.customModels = store.get("jw.customModels", []);
    const saved = store.get("jw.modelId", "agnes-3-flash");
    if (allModels().some((m) => m.id === saved)) state.modelId = saved;
  }

  function setModel(id) {
    state.modelId = id;
    store.set("jw.modelId", id);
    const m = currentModel();
    $("#modelLabel").textContent = m.name;
    $("#composerFoot").textContent = m.key
      ? `当前模型：${m.name} · 已配置接口，会真的调用模型`
      : `当前模型：${m.name} · 未配置 API Key，模型类技能不可用（Urgent 纯计算工具仍可用）`;
    renderModelMenu();
  }

  function renderModelMenu() {
    const box = $("#mmList");
    box.innerHTML = "";
    allModels().forEach((m) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mm-item" + (m.id === state.modelId ? " active" : "");
      const tag = m.key ? (m.tag || "已连接") : "未配 Key";
      b.innerHTML = `<span>${esc(m.name)}</span><small>${esc(tag)}</small>
        ${m.id === state.modelId ? '<svg class="mm-check" viewBox="0 0 24 24"><use href="#i-check"/></svg>' : ""}`;
      b.addEventListener("click", () => {
        closeModelMenu();
        if (!m.key) { openModelModal(m); return; }
        setModel(m.id);
      });
      box.appendChild(b);
    });
  }

  function openModelMenu() {
    renderModelMenu();
    $("#modelMenu").hidden = false;
  }
  const closeModelMenu = () => { $("#modelMenu").hidden = true; };

  function openModelModal(preset) {
    closeModelMenu();
    const p = preset || {};
    $("#mName").value = p.name || "";
    $("#mId").value = p.model || "";
    $("#mBase").value = p.base || "";
    $("#mKey").value = "";
    $("#mProvider").value = p.provider || "deepseek";
    $("#modelModal").hidden = false;
    setTimeout(() => (p.name ? $("#mKey") : $("#mName")).focus(), 30);
  }
  const closeModelModal = () => { $("#modelModal").hidden = true; };

  function saveModel() {
    const name = $("#mName").value.trim();
    if (!name) { toast("请填写显示名称"); $("#mName").focus(); return; }
    const provider = $("#mProvider").value;
    const tpl = BUILTIN_MODELS.find((x) => x.provider === provider) || {};
    const m = {
      id: "custom-" + Date.now(),
      name,
      tag: "自定义",
      provider,
      model: $("#mId").value.trim() || tpl.model || "",
      base: $("#mBase").value.trim() || tpl.base || "",
      key: $("#mKey").value.trim()
    };
    if (!m.key) { toast("请填写 API Key"); $("#mKey").focus(); return; }
    state.customModels.push(m);
    store.set("jw.customModels", state.customModels);
    setModel(m.id);
    closeModelModal();
    toast("已添加模型：" + name);
  }

  /* ---------------- 快捷技能 ---------------- */
  function pickQuick(list, n = 5) {
    const seen = new Set();
    const out = [];
    for (const s of list) {
      if (seen.has(s.cat)) continue;
      seen.add(s.cat);
      out.push(s);
      if (out.length >= n) break;
    }
    return out;
  }

  function renderQuick() {
    const box = $("#quick");
    box.innerHTML = "";
    pickQuick(state.data[state.mode] || []).forEach((s) => {
      const [ic] = meta(s.cat);
      const b = document.createElement("button");
      b.type = "button";
      b.className = "quick-chip";
      b.title = s.desc;
      b.innerHTML = `<svg viewBox="0 0 24 24"><use href="#${ic}"/></svg>${esc(s.name)}`;
      b.addEventListener("click", () => activateSkill(s));
      box.appendChild(b);
    });
  }

  /* ---------------- 对话 ---------------- */
  const thread = () => $("#thread");
  const scrollBottom = () => {
    const t = thread();
    requestAnimationFrame(() => { t.scrollTop = t.scrollHeight; });
  };

  function hideWelcome() {
    if (state.msgCount === 0) $("#welcome").hidden = true;
    state.msgCount++;
  }

  function userMessage(text) {
    hideWelcome();
    const wrap = document.createElement("div");
    wrap.className = "msg user";
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;
    wrap.appendChild(bubble);
    $("#msgs").appendChild(wrap);
    scrollBottom();
  }

  function aiMessage(text, extra) {
    hideWelcome();
    const wrap = document.createElement("div");
    wrap.className = "msg msg-ai";
    wrap.innerHTML =
      `<img class="av" src="${LOGO}" alt="">
       <div class="ai-body">
         <div class="ai-meta"><b>JUST WORK</b><span class="dot"></span><span>${esc(MODES[state.mode].label)}</span><span class="dot"></span><span>${esc(currentModel().name)}</span></div>
         <div class="ai-text"></div>
       </div>`;
    const body = wrap.querySelector(".ai-text");
    body.textContent = text || "";
    if (extra) body.appendChild(extra);
    $("#msgs").appendChild(wrap);
    scrollBottom();
    return wrap;
  }

  function typingMessage() {
    hideWelcome();
    const wrap = document.createElement("div");
    wrap.className = "msg msg-ai";
    wrap.innerHTML =
      `<img class="av" src="${LOGO}" alt="">
       <div class="ai-body">
         <div class="ai-meta"><b>JUST WORK</b><span class="dot"></span><span>${esc(currentModel().name)}</span></div>
         <div class="ai-text"><span class="typing"><i></i><i></i><i></i></span></div>
       </div>`;
    $("#msgs").appendChild(wrap);
    scrollBottom();
    return wrap;
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); toast("已复制"); }
    catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        toast("已复制");
      } catch { toast("复制失败"); }
    }
  }

  async function saveText(skill, text) {
    const name = `${skill.name}.${skill.ext || "txt"}`;
    if (window.jw) {
      const r = await window.jw.saveFile({ defaultName: name, content: text, ext: skill.ext || "txt" });
      toast(r.ok ? "已保存" : "已取消保存");
    } else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
      toast("已下载 " + name);
    }
  }

  function resultCard(skill, out) {
    const card = document.createElement("div");
    card.className = "result";
    card.innerHTML =
      `<div class="result-head">
         <span class="result-skill">${esc(skill.name)}</span>
         <span class="result-tag">${esc(skill.cat)}</span>
         <span class="result-acts">
           <button class="result-btn" data-act="copy" type="button"><svg viewBox="0 0 24 24"><use href="#i-copy"/></svg>复制</button>
           <button class="result-btn" data-act="save" type="button"><svg viewBox="0 0 24 24"><use href="#i-download"/></svg>保存</button>
         </span>
       </div>`;
    const pre = document.createElement("pre");
    pre.className = "result-pre";
    pre.textContent = out;
    card.appendChild(pre);
    card.querySelector('[data-act="copy"]').addEventListener("click", () => copyText(out));
    card.querySelector('[data-act="save"]').addEventListener("click", () => saveText(skill, out));
    return card;
  }

  /* ---------------- 技能执行 ---------------- */
  function runSkill(skill, vals) {
    try { return JW.run(skill, vals || {}); }
    catch (e) { console.error(e); return "生成失败：" + e.message; }
  }

  /* OpenAI 兼容接口调用（DeepSeek / OpenAI / Gemini 兼容层 / 自建网关） */
  async function callModel(model, system, user) {
    const base = String(model.base || "").replace(/\/+$/, "");
    if (!base) throw new Error("这个模型没有填 Base URL");
    const messages = [
      { role: "system", content: system },
      { role: "user", content: user }
    ];
    const modelId = model.model || model.id;

    // Electron：走主进程发请求，绕开 CORS
    if (window.jw && window.jw.chat) {
      const r = await window.jw.chat({ base, key: model.key, model: modelId, messages });
      if (!r || !r.ok) throw new Error((r && r.error) || "调用失败");
      return r.text;
    }

    // 浏览器预览：直接 fetch
    const url = /\/chat\/completions$/.test(base) ? base : base + "/chat/completions";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + model.key },
      body: JSON.stringify({ model: modelId, messages, temperature: 0.6 })
    });
    const raw = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}：${raw.slice(0, 180)}`);
    let j;
    try { j = JSON.parse(raw); } catch { return raw; }
    const msg = j.choices && j.choices[0] && j.choices[0].message;
    return (msg && msg.content) || raw.slice(0, 800);
  }

  function promptPreview(skill, input) {
    const box = document.createElement("div");
    box.className = "suggest";
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sugg";
    b.textContent = "看它会发什么给模型";
    const pre = document.createElement("pre");
    pre.className = "result-pre";
    pre.hidden = true;
    pre.textContent = `[system]\n${skill.script || ""}\n\n[user]\n${input}`;
    b.addEventListener("click", () => { pre.hidden = !pre.hidden; });
    box.appendChild(b);
    const wrap = document.createElement("div");
    wrap.append(box, pre);
    return wrap;
  }

  /* 导入的 SKILL.md 技能：配了模型就真的调用，没配就老实说清楚 */
  function runImported(skill, input) {
    if (currentModel().key) { callSkill(skill, input); return; }
    const box = document.createElement("div");
    box.appendChild(promptPreview(skill, input));
    aiMessage(
      `「${skill.name}」是 SKILL.md 技能，要有模型接口才能真正跑。点右下角模型 → 选一个 → 填 API Key，就会用它执行。`,
      box
    );
  }

  function activateSkill(skill) {
    if (skill.io && skill.io.length) { openDrawer(skill); return; }
    // 无输入字段的技能：配了模型才真跑，没配只提示，不吐模板冒充结果
    if (currentModel().key) { callSkill(skill, ""); return; }
    showModelNeeded(skill);
  }

  function matchSkill(text, list) {
    const q = text.trim().toLowerCase();
    if (!q) return null;
    let best = null;
    list.forEach((s) => {
      const name = s.name.toLowerCase();
      const desc = s.desc.toLowerCase();
      const cat = s.cat.toLowerCase();
      let score = 0;
      if (name === q) score += 8;
      else if (name.includes(q) || q.includes(name)) score += 6;
      if (cat.includes(q)) score += 2;
      if (desc.includes(q)) score += 2;
      // 逐词命中
      const tokens = q.split(/[\s,，。.!?、/]+/).filter((t) => t.length >= 2);
      tokens.forEach((t) => {
        if (name.includes(t)) score += 3;
        else if (desc.includes(t) || cat.includes(t)) score += 1;
      });
      // 中文按二字词命中（「帮我写周报」能命中「工作周报」）
      for (let i = 0; i < q.length - 1; i++) {
        const g = q.slice(i, i + 2);
        if (!/[\u4e00-\u9fa5a-z0-9]{2}/.test(g)) continue;
        if (name.includes(g)) score += 2;
        else if (desc.includes(g) || cat.includes(g)) score += 0.5;
      }
      if (!best || score > best.score) best = { skill: s, score };
    });
    return best && best.score >= 2 ? best.skill : null;
  }

  /* ---------------- 真实执行 ----------------
     配了 Base URL + API Key 才走模型；没配只提示配模型，不生成内容。 */
  const BASE_SYSTEM = "你是 JUST WORK 的助手。回答直接、具体、可执行，用中文，必要时用 Markdown 小标题和列表。不要反问，缺信息就按常见情况补全并注明假设。";

  function systemFor(skill) {
    if (skill.imported) return skill.script || "";
    return [
      `你是「${skill.name}」助手，分类：${skill.cat}。`,
      `任务：${skill.desc}`,
      "直接产出成品，不要说“好的我来帮你”这类开场白。",
      skill.tpl ? `参考输出结构（可以增删，但要点要齐）：\n${skill.tpl}` : ""
    ].filter(Boolean).join("\n\n");
  }

  function briefOf(skill, vals) {
    const lines = Object.entries(vals || {})
      .filter(([, v]) => String(v ?? "").trim() !== "")
      .map(([k, v]) => {
        const f = (skill.io || []).find((x) => x.k === k);
        return `- ${f ? f.l : k}：${v}`;
      });
    return lines.join("\n");
  }

  async function callSkill(skill, input) {
    const model = currentModel();
    const typing = typingMessage();
    try {
      const sys = skill ? systemFor(skill) : BASE_SYSTEM;
      const usr = skill ? `任务输入：\n${input}` : input;
      const out = await callModel(model, sys, usr);
      typing.remove();
      if (skill) {
        aiMessage(`「${skill.name}」· ${model.name}`,
          resultCard({ name: skill.name, cat: skill.cat, ext: "md" }, out));
      } else {
        aiMessage(out);
      }
    } catch (e) {
      typing.remove();
      aiMessage(`调用失败：${e.message}\n\n检查 Base URL、模型 ID 和 API Key；Anthropic 原生接口不是 OpenAI 兼容格式，需要走兼容网关。`);
    }
  }

  function respond(text) {
    const list = state.data[state.mode] || [];
    const skill = matchSkill(text, list);
    if (currentModel().key) { callSkill(skill, text); return; }
    // 没配模型：不生成任何内容。纯计算工具（Urgent）不用模型，直接开表单；
    // 其余一律提示去配模型，不拿模板 / 草稿冒充结果。
    if (skill && skill.fn) { openDrawer(skill); return; }
    showModelNeeded(skill);
  }

  /* 没配模型时唯一该说的：去配模型，不生成内容 */
  function showModelNeeded(skill) {
    const typing = typingMessage();
    setTimeout(() => {
      typing.remove();
      const head = skill ? `「${skill.name}」需要模型接口。` : "还没配置模型。";
      aiMessage(head + "点右下角模型按钮，填 Base URL + API Key（AGNES 用 https://apihub.agnes-ai.cn/v1）。没接模型我不会生成内容，也不会拿模板冒充结果。");
    }, 240);
  }

  /* ---------------- 抽屉 ---------------- */
  function openDrawer(skill) {
    state.open = skill;
    $("#drawerCat").textContent = skill.cat;
    $("#drawerName").textContent = skill.name;
    $("#drawerDesc").textContent = skill.desc;
    buildForm(skill);
    $("#scrim").hidden = false;
    const d = $("#drawer");
    d.hidden = false;
    requestAnimationFrame(() => d.classList.add("open"));
    setTimeout(() => {
      const first = d.querySelector(".drawer-body input, .drawer-body textarea, .drawer-body select");
      if (first) first.focus();
    }, 260);
  }

  function closeDrawer() {
    const d = $("#drawer");
    if (!d || d.hidden) return;
    d.classList.remove("open");
    hideScrimIfIdle();
    state.open = null;
    setTimeout(() => { d.hidden = true; }, 240);
  }

  function hideScrimIfIdle() {
    if ($("#drawer").hidden || !$("#drawer").classList.contains("open")) {
      if ($("#library").hidden) $("#scrim").hidden = true;
    }
  }

  function buildForm(skill) {
    const body = $("#drawerBody");
    body.innerHTML = "";
    if (!skill.io || skill.io.length === 0) {
      body.innerHTML = `<div class="note">这个模块不需要填写内容，点「生成结果」即可，会直接输出一份可用模板。</div>`;
      return;
    }
    skill.io.forEach((f) => body.appendChild(field(f)));
  }

  function field(f) {
    const wrap = document.createElement("div");
    wrap.className = "field";
    if (f.t === "checkbox") {
      wrap.classList.add("f-check");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = true;
      input.id = "f_" + f.k;
      const label = document.createElement("label");
      label.textContent = f.l;
      label.htmlFor = input.id;
      wrap.append(input, label);
      return wrap;
    }
    const label = document.createElement("label");
    label.innerHTML = `${esc(f.l)}${f.req ? '<span class="req">*</span>' : ""}`;
    label.htmlFor = "f_" + f.k;
    wrap.appendChild(label);

    let input;
    if (f.t === "area") {
      input = document.createElement("textarea");
      input.rows = 4;
    } else if (f.t === "number") {
      input = document.createElement("input");
      input.type = "number";
    } else if (f.t === "select") {
      input = document.createElement("select");
      (SEL[f.k] || ["选项 A", "选项 B"]).forEach((o) => {
        const opt = document.createElement("option");
        opt.value = typeof o === "string" ? o : o.v;
        opt.textContent = typeof o === "string" ? o : o.l;
        input.appendChild(opt);
      });
    } else {
      input = document.createElement("input");
      input.type = "text";
      if (f.ph) input.placeholder = f.ph;
    }
    input.id = "f_" + f.k;
    wrap.appendChild(input);
    return wrap;
  }

  function collect(skill) {
    const vals = {};
    (skill.io || []).forEach((f) => {
      const el = document.getElementById("f_" + f.k);
      if (!el) { vals[f.k] = ""; return; }
      vals[f.k] = el.type === "checkbox" ? (el.checked ? "1" : "") : el.value;
    });
    return vals;
  }

  function runFromDrawer() {
    const skill = state.open;
    if (!skill) return;
    const vals = collect(skill);
    closeDrawer();
    if (currentModel().key) { callSkill(skill, briefOf(skill, vals)); return; }
    if (skill.imported) { runImported(skill, vals.input || ""); return; }
    if (skill.fn) { // 纯计算工具（Urgent）不依赖模型，本地直接出结果
      const out = runSkill(skill, vals);
      aiMessage(`「${skill.name}」结果：`, resultCard(skill, out));
      return;
    }
    showModelNeeded(skill);
  }

  /* ---------------- 技能库 ---------------- */
  function openLibrary() {
    $("#scrim").hidden = false;
    $("#library").hidden = false;
    state.libQuery = "";
    state.libCat = "全部";
    $("#libSearch").value = "";
    renderLibCats();
    renderLibList();
    setTimeout(() => $("#libSearch").focus(), 30);
  }

  function closeLibrary() {
    $("#library").hidden = true;
    hideScrimIfIdle();
    if ($("#drawer").hidden) $("#scrim").hidden = true;
  }

  function renderLibCats() {
    const list = state.data[state.mode] || [];
    const counts = {};
    list.forEach((s) => { counts[s.cat] = (counts[s.cat] || 0) + 1; });
    const box = $("#libCats");
    box.innerHTML = "";
    const mk = (name, n) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "lib-chip" + (state.libCat === name ? " active" : "");
      b.textContent = n == null ? name : `${name} ${n}`;
      b.addEventListener("click", () => { state.libCat = name; renderLibCats(); renderLibList(); });
      return b;
    };
    box.appendChild(mk("全部", list.length));
    Object.entries(counts).forEach(([c, n]) => box.appendChild(mk(c, n)));
  }

  function renderLibList() {
    const list = state.data[state.mode] || [];
    const q = state.libQuery.trim().toLowerCase();
    const rows = list.filter((s) => {
      if (state.libCat !== "全部" && s.cat !== state.libCat) return false;
      if (!q) return true;
      return [s.name, s.desc, s.cat].join(" ").toLowerCase().includes(q);
    });
    const box = $("#libList");
    box.innerHTML = "";
    if (!rows.length) {
      box.innerHTML = `<div class="lib-empty">没有找到匹配的技能</div>`;
      return;
    }
    rows.forEach((s) => {
      const [ic, color] = meta(s.cat);
      const item = document.createElement("div");
      item.className = "lib-item";
      const b = document.createElement("button");
      b.type = "button";
      const own = s.custom || s.imported;
      b.className = "lib-row" + (own ? " has-del" : "");
      const tag = s.imported ? '<span class="lib-tag">SKILL.md</span>' : (s.custom ? '<span class="lib-tag">自定义</span>' : "");
      b.innerHTML =
        `<span class="lib-row-ic" style="--cat:${color};--cat-soft:${hexSoft(color)}"><svg viewBox="0 0 24 24"><use href="#${ic}"/></svg></span>
         <span class="lib-row-tx"><b>${esc(s.name)}${tag}</b><span>${esc(s.desc)}</span></span>
         <span class="lib-row-cat">${esc(s.cat)}</span>`;
      b.addEventListener("click", () => { closeLibrary(); activateSkill(s); });
      item.appendChild(b);
      if (own) {
        const del = document.createElement("button");
        del.type = "button";
        del.className = "lib-del";
        del.title = "删除这个技能";
        del.setAttribute("aria-label", "删除技能");
        del.innerHTML = '<svg viewBox="0 0 24 24"><use href="#i-close"/></svg>';
        del.addEventListener("click", (e) => { e.stopPropagation(); removeSkill(s); });
        item.appendChild(del);
      }
      box.appendChild(item);
    });
  }

  /* ---------------- 模式 ---------------- */
  function setMode(mode) {
    if (!MODES[mode]) return;
    state.mode = mode;
    state.msgCount = 0;
    app.setAttribute("data-mode", mode);

    $$(".mode-item").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
    $("#pageTitle").textContent = MODES[mode].label;
    $("#heroEyebrow").textContent = MODES[mode].eyebrow;
    $("#heroTitle").textContent = MODES[mode].title;
    $("#heroSub").textContent = MODES[mode].sub;
    $("#prompt").placeholder = MODES[mode].ph;
    $("#welcome").hidden = false;
    $("#msgs").innerHTML = "";

    const sw = $("#urgSwitch");
    if (mode === "just-working") sw.hidden = true;
    else {
      sw.hidden = false;
      sw.classList.toggle("on", mode === "urgent");
    }

    closeDrawer();
    closeLibrary();
    loadData(mode).then(() => refreshSkills());
  }

  /* ---------------- 输入 ---------------- */
  function autosize() {
    const ta = $("#prompt");
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 168) + "px";
    $("#sendBtn").disabled = ta.value.trim() === "";
  }

  function submitPrompt(e) {
    if (e) e.preventDefault();
    const ta = $("#prompt");
    const text = ta.value.trim();
    if (!text) return;
    userMessage(text);
    ta.value = "";
    autosize();
    if ($("#modelMenu").hidden === false) closeModelMenu();
    respond(text);
  }

  function newChat() {
    $("#msgs").innerHTML = "";
    state.msgCount = 0;
    $("#welcome").hidden = false;
    $("#prompt").value = "";
    autosize();
    $("#prompt").focus();
    toast("已新建对话");
  }

  /* ---------------- 事件 ---------------- */
  function wire() {
    $$(".mode-item").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));

    $("#composer").addEventListener("submit", submitPrompt);
    $("#prompt").addEventListener("input", autosize);
    $("#prompt").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        submitPrompt();
      }
    });

    $("#skillPicker").addEventListener("click", openLibrary);
    $("#libraryBtn").addEventListener("click", openLibrary);
    $("#libSearch").addEventListener("input", (e) => { state.libQuery = e.target.value; renderLibList(); });
    $("#libClose").addEventListener("click", closeLibrary);
    $("#libAdd").addEventListener("click", openSkillModal);
    $("#libImport").addEventListener("click", () => $("#skillFile").click());
    $("#skillFile").addEventListener("change", (e) => {
      importSkillFiles(e.target.files);
      e.target.value = "";
    });

    $("#skClose").addEventListener("click", closeSkillModal);
    $("#skCancel").addEventListener("click", closeSkillModal);
    $("#skSave").addEventListener("click", saveSkill);
    $("#skillModal").addEventListener("click", (e) => { if (e.target.id === "skillModal") closeSkillModal(); });

    $("#modelBtn").addEventListener("click", (e) => {
      e.stopPropagation();
      if ($("#modelMenu").hidden) openModelMenu();
      else closeModelMenu();
    });
    $("#mmAdd").addEventListener("click", openModelModal);
    $("#modalClose").addEventListener("click", closeModelModal);
    $("#modalCancel").addEventListener("click", closeModelModal);
    $("#modalSave").addEventListener("click", saveModel);
    $("#modelModal").addEventListener("click", (e) => { if (e.target.id === "modelModal") closeModelModal(); });

    $("#newChatBtn").addEventListener("click", newChat);
    $("#urgSwitch").addEventListener("click", () => setMode(state.mode === "urgent" ? "agent" : "urgent"));

    $("#drawerClose").addEventListener("click", closeDrawer);
    $("#runBtn").addEventListener("click", runFromDrawer);
    $("#clearBtn").addEventListener("click", () => { if (state.open) buildForm(state.open); });
    $("#drawerBody").addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); runFromDrawer(); }
    });

    $("#scrim").addEventListener("click", () => {
      if (!$("#library").hidden) closeLibrary();
      if (!$("#drawer").hidden) closeDrawer();
    });

    document.addEventListener("click", (e) => {
      if (!$("#modelMenu").hidden && !$("#modelMenu").contains(e.target) && !$("#modelBtn").contains(e.target)) {
        closeModelMenu();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (!$("#skillModal").hidden) return closeSkillModal();
        if (!$("#modelModal").hidden) return closeModelModal();
        if (!$("#modelMenu").hidden) return closeModelMenu();
        if (!$("#library").hidden) return closeLibrary();
        if (!$("#drawer").hidden) return closeDrawer();
      }
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openLibrary();
      }
      if (mod && e.key.toLowerCase() === "n") {
        e.preventDefault();
        newChat();
      }
    });
  }

  /* ---------------- 启动 ---------------- */
  wire();
  loadModels();
  loadCustomSkills();
  setModel(state.modelId);
  setMode("just-working");
  autosize();

  if (window.jw && window.jw.appInfo) {
    window.jw.appInfo().then((i) => {
      if (i && i.version) $("#footVer").textContent = "v" + i.version;
    }).catch(() => {});
  }
})();
