import assert from "node:assert/strict";

const editorModule = await import("../src/editor.js");
const detect = editorModule.findProtectedFormattingInHtml;

assert.equal(typeof detect, "function", "应导出已有格式检测函数");
assert.deepEqual(detect?.("<p>普通文本</p>"), []);
assert.deepEqual(detect?.("<strong>重点</strong>"), ["加粗"]);
assert.deepEqual(detect?.("<mark>高亮</mark><span style=\"color:#f00\">红字</span>"), ["高亮", "字体颜色"]);
assert.deepEqual(detect?.("<font color=\"#f00\">红字</font>"), ["字体颜色", "字体样式"]);
assert.deepEqual(detect?.("<h2>标题</h2><ol><li>项目</li></ol><table><tr><td>值</td></tr></table>"), ["标题", "列表", "表格"]);

console.log("Existing formatting protection checks passed.");
