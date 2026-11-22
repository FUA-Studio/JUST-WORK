# JUST WORK · 架构说明

## 运行模型

- **Electron**：主进程（`main.js`）负责窗口 / 文件系统 / IPC；渲染进程跑 `src/*`。
- **安全**：`contextIsolation: true`、`nodeIntegration: false`。渲染进程只能通过
  `preload.js` 暴露的 `window.jw` 白名单调用主进程能力（读 skill、存文件、取版本）。
  外部链接一律走 `shell.openExternal`，不在窗口内打开。
- **离线**：所有生成与变换在渲染端本地完成（`logic.js`），无任何网络调用。

## 分层

```
UI 层     renderer.js    DOM / 事件 / 三模式 / 开关 / 搜索 / 抽屉
逻辑层    logic.js       纯函数：模板插值 + 25 个内置变换 (BUILTINS)
数据层    assets/skills/*.json   120 个 skill (55/40/25)
主进程    main.js        窗口 + IPC (读数据 / 存文件 / 元信息)
```

`logic.js` 设计为**无 DOM、无网络**的纯模块，浏览器与 Node 通用：
- 浏览器中挂到 `globalThis.JW`
- Node 中 `module.exports`，供 `scripts/test-logic.js` 直接测试

这样核心逻辑可在 CI 里被单测，不必起 Electron。

## 模式

| 模式 | 数据文件 | 数量 | 说明 |
|---|---|---|---|
| just-working（默认） | `assets/skills/just-working.json` | 55 | 日常工作 |
| agent | `assets/skills/agent.json` | 40 | coding / 技术 |
| urgent | `assets/skills/urgent.json` | 25 | 轻量快省 |

UI 用 `#app[data-mode]` 切换主题主色（琥珀 / 紫 / 炽橙），
Agent 模式顶栏有开关一键切到 Urgent（「简单不绕弯、省钱」）。

## Skill 定义

见 `assets/skills/*.json`。核心字段：`io`（表单）、`tpl`（模板，`{{占位}}` 插值，
并自动派生 `Cap` 变体）、`fn`（内置变换名）、`out`（输出类型/扩展名）。

`fn` 命中 `logic.js` 的 `BUILTINS` 则执行变换；否则插值模板。
占位符若解析不到会填空串（不报错），保证生产稳。

## 校验链路（不要出问题）

1. `scripts/generate-skills.js`：由紧凑源生成 JSON，**断言 55/40/25**。
2. `scripts/verify-skills.js`：读 JSON 断言数量、id 唯一、占位符可解析、`fn` 在已知集合。
3. `scripts/test-logic.js`：Node 内跑 `logic.js` 的核心变换与插值（13 项）。
4. `node --check`：所有 JS 语法。
