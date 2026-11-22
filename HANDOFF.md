# JUST WORK 交接文档

> FUA Studio / FUA JUST Working · Electron 桌面应用
> 代码位置：`D:\JUST-WORK`（独立项目，与 `d:\FCD-build` 的旧 JUST_WORK 无关）

---

## 1. 这个产品现在到底是什么

一句话：**一个对话式外壳 + 两套执行引擎**。

| 执行引擎 | 触发条件 | 真实程度 |
|---|---|---|
| 模型执行 | 模型里填了 Base URL + API Key | 真的发 HTTP 请求，模型输出什么就显示什么 |
| 本地模板 | 没有 Key | 字符串模板 + 纯函数，不联网、不智能 |

没有第三种。界面上所有"生成"都来自这两条路径之一，不存在伪装的假结果。

---

## 2. 三种模式

| 模式 | 定位 | 预置技能 |
|---|---|---|
| Just Working（默认） | 日常办公：文档 / PPT / 邮件 / 报表 / 简历 | 55 |
| Agent | 技术：算法 / 后端 / 数据库 / DevOps / 安全 | 40 |
| Urgent | 轻量：文本 / 编码 / 时间 / 随机 / 数据转换 | 25 |

侧栏三个模式的名称常显（`<b>` 在任何宽度都不隐藏），切换只改 `#app[data-mode]` 上的 `--accent` 变量。
Urgent 通过右上角开关与 Agent 互切。

---

## 3. 模型：怎么才算真的接上

模型按钮 → 选一个 → 弹出配置框，填：

- **显示名称**：随便写，会出现在按钮和回复里
- **提供商**：DeepSeek / OpenAI / Anthropic / Google / 自定义
- **模型 ID**：如 `deepseek-chat`、`gpt-4o-mini`
- **Base URL**：如 `https://api.deepseek.com/v1`（留空会按提供商自动补默认值）
- **API Key**：存在本机 `localStorage`，不上传、不写进安装包

点「保存并选用」后会变成你自己的模型（菜单里标「已连接」）。
预置的 5 个模型只是模板，点它们会直接跳到这个配置框——**必须填 Key 才会真正发请求**。

请求路径：
`渲染层 callModel() → preload 暴露的 window.jw.chat → 主进程 ipcMain 'llm:chat' → https 请求 → 回传文本`

走主进程是刻意的：避开渲染层 CORS，也让 Key 不出现在页面网络面板里。

接口协议：**OpenAI 兼容**（`POST {base}/chat/completions`）。
DeepSeek、OpenAI、Gemini 的 OpenAI 兼容层、多数中转网关可直接用；
**Anthropic 原生接口不是这个格式**，需要兼容网关，否则会报 HTTP 4xx。

---

## 4. 对话与技能的判定

1. `matchSkill(text, list)` 给当前模式的技能打分：
   - 名称完全相同 +8；名称包含或反向包含 +6
   - 分类 / 描述包含 +2；分词命中名称 +3
   - 中文按二字词命中名称 +2（所以「帮我写周报」能命中「工作周报」）
   - 阈值 ≥2 才算命中
2. 命中且**有 Key** → 技能定义转成 system prompt，你的原话作为 user，真实调用模型
3. 命中且**没 Key** → 本地模板填空，界面会明确写「本地模板版」
4. 没命中且**有 Key** → 当普通对话，直接调模型回答（不需要套技能）
5. 没命中且**没 Key** → `directReply()` 按关键词（邮件 / 周报 / 总结 / 计划 / 通用）给一版结构草稿

### 技能转 prompt 的规则（`systemFor`）
- 内置技能：`你是「技能名」助手 + 任务描述 + 参考输出结构（tpl）`
- 导入的 SKILL.md：**正文原文**作为 system prompt，不做改动

---

## 5. 自己加技能

### 5.1 导入 SKILL.md（推荐）

技能库右上角「导入 SKILL.md」，选一个或多个 `.md` 文件。格式：

```markdown
---
name: 周报助手
description: 把零散记录整理成周报
---

正文写清楚：角色、要做什么、输出格式、注意事项。
模型会把这段正文当作任务说明。
```

- `name` 缺省用文件名，`description` 缺省取正文第一个 `# 标题`
- 导入后分类显示为 `SKILL.md`，列表带「SKILL.md」标记，悬停右侧可删除
- 数据存在 `localStorage` 的 `jw.importedSkills`
- 没配 Key 时点它，会提示需要接口，并可展开「看它会发什么给模型」核对完整 prompt

### 5.2 手工新建模板技能

「新建技能」填名称 / 分类 / 描述 / 内容模板，模板里可以用：

- `{{input}}` → 你在对话框里输入的原话
- `{{date}}` → 今天日期

存到 `jw.customSkills`，同样可删除。这类技能即使有 Key 也会走模型（正文模板只作为结构参考）。

### 5.3 预置技能

`assets/skills/{just-working,agent,urgent}.json`，结构：

```json
{
  "id": "j-weekly", "name": "工作周报", "cat": "文档",
  "desc": "本周做了什么、结果、下周计划，三段式。",
  "io": [{ "k": "name", "l": "姓名 / 团队", "t": "text", "req": true }],
  "tpl": "# 周报 · {{name}}\n\n## 本周完成\n",
  "fn": null, "out": "md", "ext": "md", "mode": "just-working"
}
```

`io[].t`：`text | area | number | select | checkbox`；`fn` 命中 `BUILTINS` 时优先执行纯函数（见 `src/logic.js`）。

---

## 6. 文件职责

| 文件 | 作用 |
|---|---|
| `main.js` | 窗口、IPC：`skills:list` / `file:save` / `app:info` / `llm:chat` |
| `preload.js` | contextBridge 暴露 `window.jw`（含 `chat`） |
| `src/index.html` | 结构 + 内联 SVG 图标 + CSP |
| `src/styles.css` | 全部样式与设计 token |
| `src/renderer.js` | DOM 与交互：模式、对话、技能库、抽屉、模型、导入 |
| `src/logic.js` | 纯函数：`JW.run(skill, vals)`、`BUILTINS`、`interpolate` |
| `src/skillsmd.js` | SKILL.md 解析：frontmatter → `{name, desc, body}` |
| `assets/skills/*.json` | 三个模式的预置技能 |

CSP：`default-src 'self'; …; connect-src https: http:`（允许调模型接口）。

---

## 7. 运行

```powershell
cd D:\JUST-WORK
npm install
npm start
npm run dist:win   # 出 exe，旧的 dist 必须重打包才是新界面
```

无 node_modules 时可用本地静态服务预览界面（模型调用会退化为浏览器 fetch，可能被 CORS 拦）：

```powershell
python -m http.server 8777 --bind 127.0.0.1 --directory D:\JUST-WORK
# 打开 http://127.0.0.1:8777/src/index.html
```

---

## 8. 已验证 / 未验证

已验证（浏览器实测）：
- 三模式名称常显；欢迎语 + 5 个快捷技能 + 底部输入框
- 模型下拉 5 项、添加模型表单、保存后带「已连接」标记的逻辑
- 技能库顶部「导入 SKILL.md」「新建技能」布局正常
- 输入「帮我写周报」命中「工作周报」并出草稿
- `skillsmd.js` 解析 frontmatter 通过 Node 单测

未验证（环境限制）：
- Electron 实机窗口（本机无 node_modules）
- 真实模型回包（需要用户填 Key）
- 多文件 / 文件夹批量导入 SKILL.md（目前只支持多选文件，不支持整个目录）

---

## 9. 下一步建议

1. 设计 token 已集中在 `styles.css` 顶部变量，改主题只动那一块
2. 流式输出：把 `llm:chat` 改成 SSE 逐块回传
3. 技能编辑：自定义技能目前只能删，不能改
4. 目录导入：`webkitdirectory` 读取整个 skills 文件夹
5. 会话持久化：目前刷新即清空
