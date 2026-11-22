// JUST WORK · Urgent mode — 25 lightweight, instant, "no detour" utilities.
// Each entry: { id, n, c, d, io, tpl, out, lang, fn }
//   io: array of [key, label, type]  (text|area|number|select|checkbox)
//   fn: optional built-in transform key handled in renderer.js
// Count MUST equal 25 (asserted in scripts/generate-skills.js).

module.exports = [
  { id: "u-csv-json", n: "CSV → JSON", c: "数据转换", d: "粘贴 CSV，秒变 JSON。", io: [["csv", "CSV 内容", "area"], ["sep", "分隔符", "text"], ["pretty", "缩进美化", "checkbox"]], fn: "csvToJson", out: "json" },
  { id: "u-json-csv", n: "JSON → CSV", c: "数据转换", d: "JSON 数组转 CSV，方便导入表格。", io: [["js", "JSON 数组", "area"]], fn: "jsonToCsv", out: "txt" },
  { id: "u-base64-e", n: "Base64 编码", c: "编码", d: "文本 → Base64。", io: [["t", "文本", "text"]], fn: "b64Encode", out: "txt" },
  { id: "u-base64-d", n: "Base64 解码", c: "编码", d: "Base64 → 文本。", io: [["t", "Base64", "text"]], fn: "b64Decode", out: "txt" },
  { id: "u-url-e", n: "URL 编码", c: "编码", d: "把参数安全地转成 URL。", io: [["t", "文本", "text"]], fn: "urlEncode", out: "txt" },
  { id: "u-url-d", n: "URL 解码", c: "编码", d: "把 URL 参数还原成文本。", io: [["t", "URL 编码串", "text"]], fn: "urlDecode", out: "txt" },
  { id: "u-ts-now", n: "当前时间戳", c: "时间", d: "看一眼现在的时间戳。", io: [["u", "单位", "select"]], fn: "tsNow", out: "txt" },
  { id: "u-epoch", n: "时间戳 → 日期", c: "时间", d: "把时间戳还原成人能懂的日期。", io: [["ts", "时间戳", "number"]], fn: "epochToDate", out: "txt" },
  { id: "u-uuid", n: "UUID 生成", c: "随机", d: "一次生成一批 UUID。", io: [["cnt", "数量", "number"], ["v8", "版本 8 (随机)", "checkbox"]], fn: "genUuid", out: "txt" },
  { id: "u-pass", n: "随机密码", c: "随机", d: "强密码，一步到位。", io: [["len", "长度", "number"], ["upper", "大写字母", "checkbox"], ["digit", "数字", "checkbox"], ["sym", "符号", "checkbox"]], fn: "genPass", out: "txt" },
  { id: "u-case", n: "命名格式转换", c: "文本", d: "camel / snake / kebab / Pascal，随意切。", io: [["t", "标识符", "text"], ["fmt", "目标格式", "select"]], fn: "caseConvert", out: "txt" },
  { id: "u-count", n: "字数统计", c: "文本", d: "行数、字数、字符数，一目了然。", io: [["t", "文本", "area"]], fn: "textStats", out: "txt" },
  { id: "u-dedup", n: "去重去空行", c: "文本", d: "一行一行挑干净。", io: [["t", "文本", "area"], ["dedup", "去重", "checkbox"], ["trim", "去空行", "checkbox"]], fn: "dedupLines", out: "txt" },
  { id: "u-sort", n: "行排序", c: "文本", d: "正序 / 逆序 / 随机。", io: [["t", "文本", "area"], ["dir", "方向", "select"]], fn: "sortLines", out: "txt" },
  { id: "u-rev", n: "文本反转", c: "文本", d: "整段倒过来。", io: [["t", "文本", "area"]], fn: "reverseText", out: "txt" },
  { id: "u-json-fmt", n: "JSON 格式化", c: "数据转换", d: "压缩 / 美化，读得清。", io: [["js", "JSON", "area"], ["mode", "操作", "select"]], fn: "jsonFmt", out: "json" },
  { id: "u-regex", n: "正则提取", c: "工具", d: "把匹配到的内容全捞出来。", io: [["pat", "正则", "text"], ["flags", "标志", "text"], ["txt", "目标文本", "area"]], fn: "regexMatch", out: "txt" },
  { id: "u-esc", n: "HTML 转义", c: "工具", d: "防注入，安全渲染。", io: [["t", "HTML 片段", "area"]], fn: "htmlEscape", out: "txt" },
  { id: "u-replace", n: "查找替换", c: "文本", d: "批量替换，不用开编辑器。", io: [["t", "文本", "area"], ["find", "查找", "text"], ["repl", "替换为", "text"]], fn: "replaceText", out: "txt" },
  { id: "u-trim", n: "行首尾去空格", c: "文本", d: "把每行的空格清干净。", io: [["t", "文本", "area"]], fn: "trimLines", out: "txt" },
  { id: "u-squeeze", n: "压缩空行", c: "文本", d: "多个空行并成一个。", io: [["t", "文本", "area"]], fn: "squeeze", out: "txt" },
  { id: "u-num", n: "数字千分位", c: "数据", d: "1234567 → 1,234,567。", io: [["n", "数字", "number"], ["dec", "小数位", "number"]], fn: "numFmt", out: "txt" },
  { id: "u-date", n: "日期格式化", c: "时间", d: "ISO 转成你要的样式。", io: [["d", "ISO 日期", "text"], ["fmt", "格式", "text"]], fn: "dateFmt", out: "txt" },
  { id: "u-draw", n: "随机抽取", c: "随机", d: "从名单里随机抽人，公平透明。", io: [["t", "名单 (每行一个)", "area"], ["k", "抽取数量", "number"]], fn: "randomPick", out: "txt" },
  { id: "u-diff", n: "文本对比", c: "工具", d: "两段文本，哪行不一样一眼看到。", io: [["a", "文本 A", "area"], ["b", "文本 B", "area"]], fn: "lineDiff", out: "txt" }
];
