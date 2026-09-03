import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const beforeDocument = `# 主标题

> 版本信息

## 二级标题

| 名称 | 状态 |
| --- | --- |
| 示例 | 正常 |

- 列表一
- 列表二`;
const cleanedDocument = beforeDocument.replace("版本信息", "版本信息。");
const fakeRange = { id: "selected-range" };
let selectedMarkdown = beforeDocument;
let selectedText = beforeDocument;
let writeInnerText = beforeDocument;
let currentDocument = beforeDocument;
let insertedText = null;
let reloadCall = null;

const selection = {
  rangeCount: 1,
  isCollapsed: false,
  toString: () => selectedText,
  getRangeAt: () => ({ cloneRange: () => fakeRange }),
  removeAllRanges() {},
  addRange(range) { assert.equal(range, fakeRange); },
};

globalThis.window = { getSelection: () => selection };
globalThis.document = {
  getElementById: (id) => (id === "write" ? { innerText: writeInnerText, focus() {} } : null),
};
globalThis.File = {
  _CopyContentFlag: false,
  editor: {
    UserOp: {
      copyAsMarkdown(_editor, event) {
        event.clipboardData.setData("text/plain", selectedMarkdown);
      },
    },
    getMarkdown: () => currentDocument,
    insertText(value) { insertedText = value; },
  },
  reloadContent(value, options) {
    reloadCall = { value, options };
    currentDocument = value;
  },
};

const editorModuleUrl = process.argv[2]
  ? pathToFileURL(process.argv[2]).href
  : new URL("../src/editor.js", import.meta.url).href;
const { EditorSelectionController } = await import(editorModuleUrl);

const wholeDocumentController = new EditorSelectionController();
assert.equal(wholeDocumentController.captureSelection(), true);
assert.equal(wholeDocumentController.restoreAndReplace(cleanedDocument), true);
assert.equal(insertedText, null, "多块 Markdown 不得通过 insertText 在当前块上下文中写回");
assert.equal(reloadCall?.value, cleanedDocument, "整篇选区应通过完整 Markdown 文档重载写回");
assert.equal(reloadCall?.options?.delayRefresh, false);
assert.match(reloadCall.value, /^# 主标题/m);
assert.doesNotMatch(reloadCall.value, /^> # 主标题/m);

const partialBefore = "开头段落\n\n## 待清理\n\n正文\n\n结尾段落";
const partialSelection = "## 待清理\n\n正文";
const partialResult = "## 待清理\n\n正文。";
selectedMarkdown = partialSelection;
selectedText = partialSelection;
writeInnerText = partialBefore;
currentDocument = partialBefore;
reloadCall = null;

const partialController = new EditorSelectionController();
assert.equal(partialController.captureSelection(), true);
assert.equal(partialController.restoreAndReplace(partialResult), true);
assert.equal(
  reloadCall?.value,
  partialBefore.replace(partialSelection, partialResult),
  "局部选区只替换对应 Markdown，文档其余内容必须不变",
);

const serializedDocument = `# 主标题

| 名称 | 状态 |
| --- | --- |
| 示例 | 正常 |`;
const serializedSelection = `# 主标题

| 名称   | 状态 |
| ------ | ---- |
| 示例   | 正常 |`;
const visibleWholeDocument = "主标题\n名称 状态\n示例 正常";
selectedMarkdown = serializedSelection;
selectedText = visibleWholeDocument;
writeInnerText = visibleWholeDocument;
currentDocument = serializedDocument;
reloadCall = null;

const serializedWholeDocumentController = new EditorSelectionController();
assert.equal(serializedWholeDocumentController.captureSelection(), true);
assert.equal(
  serializedWholeDocumentController.restoreAndReplace(serializedSelection.replace("正常", "正常。")),
  true,
  "全选时即使 Typora 重新序列化表格，也应识别为整篇选区并完成写回",
);
assert.match(reloadCall?.value || "", /正常。/);

console.log("Typora structure-preserving reload checks passed.");
