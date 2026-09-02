import assert from "node:assert/strict";

const fakeRange = { id: "selected-range" };
const selection = {
  rangeCount: 1,
  isCollapsed: false,
  toString: () => "高亮文字和普通文字",
  getRangeAt: () => ({ cloneRange: () => fakeRange }),
};

globalThis.window = { getSelection: () => selection };
globalThis.File = {
  editor: {
    UserOp: {
      copyAsMarkdown(_editor, event) {
        event.clipboardData.setData("text/plain", "==高亮文字==和普通文字");
        event.preventDefault();
      },
    },
  },
};

const { EditorSelectionController } = await import("../src/editor.js");
const controller = new EditorSelectionController();

assert.equal(controller.captureSelection(), true);
assert.equal(controller.getSavedText(), "高亮文字和普通文字");
assert.equal(controller.getSavedMarkdown(), "==高亮文字==和普通文字");

controller.clear();
assert.equal(controller.getSavedMarkdown(), "");

console.log("Typora Markdown selection capture checks passed.");
