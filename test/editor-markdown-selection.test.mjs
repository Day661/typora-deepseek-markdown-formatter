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
  _CopyContentFlag: false,
  editor: {
    UserOp: {
      copyAsMarkdown(_editor, event) {
        // Typora 1.10.x 的 Windows 复制流程第一次只设置标记并提前返回，
        // 进入实际 copy 阶段后才会把 Markdown 写入 clipboardData。
        if (!globalThis.File._CopyContentFlag) {
          globalThis.File._CopyContentFlag = true;
          return;
        }
        event.clipboardData.setData("text/plain", "==高亮文字==和普通文字");
        event.preventDefault();
        globalThis.File._CopyContentFlag = false;
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

globalThis.File.editor.UserOp.copyAsMarkdown = () => {
  throw new Error("Typora copy failed");
};
const failedController = new EditorSelectionController();
assert.equal(failedController.captureSelection(), true);
assert.equal(
  failedController.getSavedMarkdown(),
  "",
  "读取 Markdown 失败时不得静默回退为会破坏格式的纯文本",
);

console.log("Typora Markdown selection capture checks passed.");
