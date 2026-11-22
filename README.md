<div align="center">

<img src="assets/logo/wordmark.svg" alt="JUST WORK — FUA Studio" width="460" />

<br/>

**JUST WORK** 是一个桌面工作助手：一个对话框 + 120 个技能。把要做的事说一句话，它给你一版能直接用的结果。

<br/>

<img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="version"/>
<img src="https://img.shields.io/badge/license-GPLv3-blue.svg" alt="license"/>
<img src="https://img.shields.io/badge/Electron-31-blueviolet.svg" alt="electron"/>
<img src="https://img.shields.io/badge/skills-120-orange.svg" alt="skills"/>

<br/>

<img src="https://img.shields.io/github/issues/FUA-Studio/JUST-WORK?style=flat" alt="issues"/>

</div>

---

## 下载

Windows x64，两个都是单文件 exe，不用解压：

- 安装包：`JUST-WORK-1.0.0-x64.exe`（双击安装）
- 便携版：`JUST-WORK-1.0.0-portable.exe`（双击直接跑，不写注册表）

到 [Releases](https://github.com/FUA-Studio/JUST-WORK/releases) 下载。

## 它怎么干活

就两条路，没有第三种：

1. **接了模型**：填了 Base URL + API Key，技能就转成提示词真的发给模型，模型回什么显示什么。
2. **没接模型**：用内置的本地模板 + 纯函数出结果，界面会标清楚「本地模板版」，不会假装是模型跑的。

模型接口走 OpenAI 兼容的 `/chat/completions`，在主进程发请求，绕开 CORS，Key 只存本机 `localStorage`，不上传、不进安装包。

## 三种模式

| 模式 | 干什么的 | 预置技能 |
|---|---|---|
| Just Working（默认） | 文档、PPT、邮件、报表、简历 | 55 |
| Agent | 算法、后端、数据库、DevOps、安全 | 40 |
| Urgent | 文本、编码、时间、随机、数据转换 | 25 |

Urgent 跟 Agent 用右上角开关互切。

## 配模型

右下角模型按钮 → 选一个或「添加模型」，填：

- 显示名称、提供商（DeepSeek / OpenAI / Anthropic / Google / 自定义）
- 模型 ID、Base URL、API Key

预置的几个只是模板，点进去照样要你填 Key 才真发请求。DeepSeek、OpenAI、Gemini 的兼容层、多数中转网关都能直接用；Anthropic 原生接口不是 OpenAI 格式，得走兼容网关。

## 加技能

- **导入 SKILL.md**：技能库右上角，一个 markdown 文件就是一个技能（frontmatter 的 name / description + 正文当任务说明）。
- **新建技能**：填名称、分类、模板，模板里 `{{input}}` 是你输入的原话、`{{date}}` 是今天。
- 导入的和新建的都存本机，能删。

## 自己跑

```
npm install
npm start        # 起应用
npm run dist:win # 出安装包 + 便携 exe
```

打包用 electron-builder。没装 git 的话，`scripts/upload.js` 走 GitHub API 推代码、`scripts/publish-release.js` 发 Release。

## 许可

GPL-3.0，见 [LICENSE](LICENSE)。
