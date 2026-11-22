/* ============================================================
   JUST WORK · renderer UI — FUA Studio © 2026
   Three modes: just-working (default) / agent / urgent.
   Pure logic lives in logic.js (global JW). This file is DOM/UI only.
   ============================================================ */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const app = $("#app");

  const MODES = {
    "just-working": { label: "Just Working", hero: "今天，一件一件把它做完。", sub: "点一个模块，直接开干。给谁都好用。", file: "just-working", count: 55 },
    agent: { label: "Agent", hero: "脏活、累活、大活、难活，丢给 Agent。", sub: "40 个技术 skill，为 coding 场景而生。", file: "agent", count: 40 },
    urgent: { label: "Urgent", hero: "简单的事，不绕弯。", sub: "25 个轻量工具，更快，还省钱。", file: "urgent", count: 25 }
  };

  // select option catalog (keyed by io key)
  const SEL = {
    sep: [",", ";", { v: "\t", l: "制表符" }, "|"],
    u: [{ v: "ms", l: "毫秒" }, { v: "s", l: "秒" }, { v: "µs", l: "微秒" }],
    fmt: ["camelCase", "snake_case", "kebab-case", "PascalCase", "UPPER_SNAKE", "CONSTANT_CASE"],
    dir: ["正序", "逆序", "随机"],
    mode: [{ v: "pretty", l: "美化 (2 空格)" }, { v: "min", l: "压缩" }],
    lang: ["JavaScript", "TypeScript", "Python", "Go", "Rust"],
    type: [{ v: "email", l: "邮箱" }, { v: "url", l: "URL" }, { v: "phone_cn", l: "手机号" }, { v: "id_card", l: "身份证号" }, { v: "date_iso", l: "ISO 日期" }],
    ctype: ["feat", "fix", "docs", "refactor", "test", "chore", "perf", "style"],
    on: [{ v: "push", l: "push" }, { v: "pull_request", l: "PR" }, { v: "push, pull_request", l: "push + PR" }],
    method: ["get", "post", "put", "patch", "delete"],
    pat: [{ v: "strategy", l: "策略" }, { v: "observer", l: "观察者" }, { v: "factory", l: "工厂" }],
    stack: [{ v: "node", l: "Node" }, { v: "python", l: "Python" }, { v: "go", l: "Go" }, { v: "all", l: "通用" }]
  };

  const state = { mode: "just-working", data: {}, query: "", open: null, lastOut: "" };

  // ---------- helpers ----------
  const esc = (s) => String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.classList.remove("show"); setTimeout(() => { t.hidden = true; }, 220); }, 1800);
  }

  async function loadData(mode) {
    if (state.data[mode]) return state.data[mode];
    let list;
    try {
      if (window.jw) list = await window.jw.listSkills(mode);
      else {
        const r = await fetch(`../assets/skills/${mode}.json`, { cache: "no-store" });
        list = await r.json();
      }
      list = Array.isArray(list) ? list : [];
    } catch (e) {
      console.error("loadSkills failed", e);
      list = [];
    }
    state.data[mode] = list;
    return list;
  }

  // ---------- grid ----------
  function filtered(list) {
    const q = state.query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) => [s.name, s.desc, s.cat].join(" ").toLowerCase().includes(q));
  }

  function renderGrid() {
    const list = filtered(state.data[state.mode] || []);
    const grid = $("#grid");
    const empty = $("#empty");
    $("#countChip").textContent = `${list.length} / ${(state.data[state.mode] || []).length} skills`;
    grid.innerHTML = "";
    empty.hidden = list.length > 0;
    if (list.length === 0) { grid.hidden = true; return; }
    grid.hidden = false;

    if (state.query.trim()) { list.forEach((s) => grid.appendChild(tile(s))); return; }

    const cats = {};
    list.forEach((s) => { (cats[s.cat] = cats[s.cat] || []).push(s); });
    Object.entries(cats).forEach(([cat, items]) => {
      const head = document.createElement("div");
      head.className = "grid-cat";
      head.innerHTML = `<span>${esc(cat)}</span><b>${items.length}</b>`;
      grid.appendChild(head);
      items.forEach((s) => grid.appendChild(tile(s)));
    });
  }

  function tile(s) {
    const el = document.createElement("div");
    el.className = "tile";
    el.setAttribute("role", "listitem");
    el.tabIndex = 0;
    el.innerHTML =
      `<span class="tile-tag">${esc(s.cat)}</span>
       <div class="tile-ic">${esc(s.name.slice(0, 1))}</div>
       <div class="tile-tt">${esc(s.name)}</div>
       <div class="tile-ds">${esc(s.desc)}</div>`;
    el.addEventListener("click", () => openSkill(s));
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSkill(s); } });
    return el;
  }

  // ---------- mode ----------
  function setMode(mode, viaSwitch) {
    if (!MODES[mode]) return;
    state.mode = mode;
    app.setAttribute("data-mode", mode);
    $$(".mode-btn").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
    $("#brandMode").textContent = MODES[mode].label;
    $("#heroTitle").textContent = MODES[mode].hero;
    $("#heroSub").textContent = MODES[mode].sub;
    const sw = $("#urgSwitch");
    sw.hidden = !(mode === "agent" && !viaSwitch);
    sw.classList.toggle("on", mode === "urgent");
    loadData(mode).then(renderGrid);
    closeDrawer();
  }

  // ---------- drawer ----------
  function openSkill(s) {
    state.open = s;
    $("#drawerCat").textContent = s.cat;
    $("#drawerName").textContent = s.name;
    $("#drawerDesc").textContent = s.desc;
    buildForm(s);
    state.lastOut = "";
    $("#drawerOut").hidden = true;
    const d = $("#drawer");
    d.hidden = false;
    requestAnimationFrame(() => d.classList.add("open"));
  }

  function closeDrawer() {
    const d = $("#drawer");
    if (!d || d.hidden) return;
    d.classList.remove("open");
    setTimeout(() => { d.hidden = true; }, 280);
    state.open = null;
  }

  function buildForm(s) {
    const body = $("#drawerBody");
    body.innerHTML = "";
    if (!s.io || s.io.length === 0) {
      body.innerHTML = `<div class="note">这个模块不需要输入，直接点「生成」。它是一份检查清单 / 模板。</div>`;
      return;
    }
    s.io.forEach((f) => body.appendChild(field(f)));
  }

  function field(f) {
    const wrap = document.createElement("div");
    wrap.className = "field";
    if (f.t === "checkbox") {
      wrap.classList.add("f-check");
      const input = document.createElement("input");
      input.type = "checkbox"; input.checked = true;
      input.id = "f_" + f.k;
      const label = document.createElement("label");
      label.textContent = f.l; label.htmlFor = input.id;
      wrap.appendChild(input); wrap.appendChild(label);
      return wrap;
    }
    const label = document.createElement("label");
    label.innerHTML = `${esc(f.l)}${f.req ? '<span class="req">*</span>' : ""}`;
    label.htmlFor = "f_" + f.k;
    wrap.appendChild(label);

    let input;
    if (f.t === "area") { input = document.createElement("textarea"); input.rows = 4; }
    else if (f.t === "number") { input = document.createElement("input"); input.type = "number"; }
    else if (f.t === "select") {
      input = document.createElement("select");
      const opts = SEL[f.k] || ["选项 A", "选项 B"];
      opts.forEach((o) => {
        const opt = document.createElement("option");
        opt.value = typeof o === "string" ? o : o.v;
        opt.textContent = typeof o === "string" ? o : o.l;
        input.appendChild(opt);
      });
    } else {
      input = document.createElement("input"); input.type = "text";
      if (f.ph) input.placeholder = f.ph;
    }
    input.id = "f_" + f.k;
    wrap.appendChild(input);
    return wrap;
  }

  function collect(s) {
    const vals = {};
    (s.io || []).forEach((f) => {
      const el = document.getElementById("f_" + f.k);
      if (!el) { vals[f.k] = ""; return; }
      vals[f.k] = el.type === "checkbox" ? (el.checked ? "1" : "") : el.value;
    });
    return vals;
  }

  // ---------- run (delegates to shared logic) ----------
  function run() {
    const s = state.open;
    if (!s) return;
    const vals = collect(s);
    let out;
    try { out = JW.run(s, vals); }
    catch (e) { out = "出错了: " + e.message; console.error(e); }
    $("#outPre").textContent = out;
    const o = $("#drawerOut");
    o.hidden = false;
    o.scrollIntoView({ behavior: "smooth", block: "nearest" });
    state.lastOut = out;
  }

  // ---------- events ----------
  function wire() {
    $$(".mode-btn").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
    $("#searchInput").addEventListener("input", (e) => { state.query = e.target.value; renderGrid(); });
    $("#drawerClose").addEventListener("click", closeDrawer);
    $("#runBtn").addEventListener("click", run);
    $("#clearBtn").addEventListener("click", () => { if (state.open) buildForm(state.open); });
    $("#copyBtn").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(state.lastOut || ""); toast("已复制到剪贴板"); }
      catch { try { $("#outPre").select(); document.execCommand("copy"); toast("已复制"); } catch { toast("复制失败"); } }
    });
    $("#dlBtn").addEventListener("click", async () => {
      const s = state.open; if (!s || !state.lastOut) return;
      const def = `${s.name}.${s.ext || "txt"}`;
      if (window.jw) {
        const r = await window.jw.saveFile({ defaultName: def, content: state.lastOut, ext: s.ext || "txt" });
        if (r.ok) toast("已保存: " + String(r.path).split(/[\\/]/).pop());
        else toast("已取消保存");
      } else {
        const blob = new Blob([state.lastOut], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = def; a.click();
        URL.revokeObjectURL(a.href);
        toast("已下载 " + def);
      }
    });
    $("#urgSwitch").addEventListener("click", () => {
      const on = !$("#urgSwitch").classList.contains("on");
      setMode(on ? "urgent" : "agent", true);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("#drawer").hidden) closeDrawer();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); $("#searchInput").focus(); }
    });
  }

  // ---------- init ----------
  wire();
  setMode("just-working");
  document.addEventListener("DOMContentLoaded", () => {
    if (window.jw) window.jw.appInfo().then((i) => {
      if (i && i.version) $("#footVer").textContent = `© 2026 ${i.studio || "FUA Studio"} · JUST WORK v${i.version}`;
    });
  });
})();
