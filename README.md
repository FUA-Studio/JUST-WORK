<div align="center">

<img src="assets/logo/wordmark.svg" alt="JUST WORK — FUA Studio" width="340" />

<br/>

**FUA JUST Working** · 简称 **JUST WORK**<br/>
一个界面**简约大气**的桌面工作助手 —— 把事一件一件做完。

<br/>

**Just Working** · **Agent** · **Urgent** 三模式 · 共 **120** 个 skill · 本地运行 · 无需联网

<br/>

<sub>由 <b>FUA Studio</b> 开发 · 与 NWA / AFAHA 无关</sub>

</div>

---

## 这是什么

JUST WORK 是一个**桌面端**（Electron）智能工作助手，不是网页。它把常见工作场景拆成一个个「模块」，
你从界面上点一下就进入对应工作，填入信息，一键生成结构化产出（文档 / 代码 / 清单 / 数据），
可以复制或保存。

设计原则：**简约**（整洁、不乱、层级清楚）+ **大气**（留白舒展、配色高级、排版有分量）。

## 三种模式

| 模式 | 定位 | Skill 数 | 适配人群 |
|---|---|---|---|
| **Just Working**（默认） | 界面简洁明了，日常工作 / PPT / Word / 报表 / 简历 | **55** | 没有技术基础也能轻松上手 |
| **Agent** | 什么任务都支持：脏活、累活、大任务、难任务；界面为 coding 场景优化 | **40** | 技术 / 工程 |
| **Urgent** | 通过 Agent 的开关一键切换；速度快、简单任务不绕弯、省钱 | **25** | 日常轻量 |

- **Just Working**：默认模式。打开即是一个模块网格，点一个模块即可开始工作，
  覆盖文档、PPT、报表、邮件、会议、计划、简历、写作等 55 个高频场景。
- **Agent**：面向 coding 与技术工作，界面按工程场景组织，内置 40 个技术 skill
  （脚手架、算法模板、工程/安全清单、DevOps 等）。
- **Urgent**：从 Agent 用开关切到「快 & 省」状态，25 个轻量万能工具
  （格式转换、编码、正则、随机、统计、Diff……），即点即得，不绕弯。

## 快速开始

```bash
npm install     # 安装 electron 等依赖
npm start       # 启动桌面应用
```

### 打包分发

```bash
npm run dist    # 用 electron-builder 打安装包
npm run icon    # 重新生成 512x512 应用图标（零依赖，Node 内置 zlib）
```

### 开发与校验

```bash
npm run generate-skills   # 由 scripts/skills/*.js 生成 assets/skills/*.json 并断言数量
npm run verify-skills     # 校验 JSON：数量 / 唯一 id / 占位符可解析 / fn 已知
npm test / node scripts/test-logic.js   # 在 Node 里跑核心逻辑测试
```

## 目录结构

```
JUST-WORK/
├─ main.js               # Electron 主进程
├─ preload.js            # 安全桥 (contextIsolation)
├─ src/
│  ├─ index.html         # 界面结构
│  ├─ styles.css         # 浅色 · 简约大气主题
│  ├─ logic.js           # 纯逻辑：生成器 + 内置变换 (浏览器/Node 通用)
│  └─ renderer.js        # UI 层：三模式 / 开关 / 搜索 / 抽屉
├─ assets/
│  ├─ logo/              # logo.svg / wordmark.svg / icon.png
│  └─ skills/            # just-working.json(55) / agent.json(40) / urgent.json(25)
├─ scripts/
│  ├─ skills/            # skill 数据源 (紧凑写法)
│  ├─ generate-skills.js # 生成 + 数量断言
│  ├─ verify-skills.js   # 生产级校验
│  ├─ test-logic.js      # 核心逻辑冒烟测试
│  ├─ make-icon.js       # 零依赖 PNG 图标生成
│  └─ check-icon.js      # 图标内容校验
└─ docs/                # 架构与 skill 说明
```

## Skill 系统（数据驱动）

每个 skill 是一段 **数据**（`assets/skills/*.json`），字段：

```jsonc
{
  "id": "u-csv-json",
  "name": "CSV → JSON",
  "cat": "数据转换",
  "desc": "粘贴 CSV，秒变 JSON。",
  "io":  [{ "k": "csv", "l": "CSV 内容", "t": "area" }],   // 输入表单
  "tpl": "...{{key}}...",                                     // 模板 (占位符插值)
  "fn":  "csvToJson",                                          // 或内置变换函数
  "out": "json"
}
```

运行规则：`fn` 存在则走 **内置变换**（`logic.js` 的 `BUILTINS`），否则走 **模板插值**。
全部在本地完成，无网络依赖。新增 skill 只需改 `scripts/skills/*.js` 再跑
`npm run generate-skills`，数量断言保证 55 / 40 / 25 精确。

## 快捷键

- `Esc` 关闭当前模块抽屉
- `Ctrl/⌘ + K` 聚焦搜索

## 许可

MIT © 2026 FUA Studio。
