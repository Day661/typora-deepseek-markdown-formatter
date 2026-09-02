export class EditorSelectionController {
  constructor() {
    this.savedRange = null;
    this.savedText = "";
    this.savedMarkdown = "";
  }

  isEditorTarget(node) {
    return !!(node && node.closest && (node.closest("#write") || node.closest(".CodeMirror")));
  }

  getSelectedText() {
    const selection = window.getSelection();
    return selection ? selection.toString() : "";
  }

  captureSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      this.clear();
      return false;
    }
    this.savedRange = selection.getRangeAt(0).cloneRange();
    this.savedText = selection.toString();
    this.savedMarkdown = this.captureSelectedMarkdown();
    return true;
  }

  captureSelectedMarkdown() {
    const typoraEditor = globalThis.File?.editor;
    const copyAsMarkdown = typoraEditor?.UserOp?.copyAsMarkdown;
    if (typeof copyAsMarkdown !== "function") return "";

    const clipboard = {};
    const copyEvent = {
      type: "copy",
      clipboardData: {
        setData(type, value) {
          clipboard[type] = String(value ?? "");
        },
      },
      preventDefault() {},
    };

    const previousCopyFlag = globalThis.File._CopyContentFlag;
    try {
      // Windows 版 Typora 的 copyAsMarkdown 是两阶段流程：没有标记时只会
      // 触发系统 copy 并提前返回。预置同名标记可直接进入实际写入阶段，
      // 从 fake clipboardData 取得 Markdown，同时不改动用户剪贴板。
      globalThis.File._CopyContentFlag = "copyAsMarkdown";
      copyAsMarkdown.call(typoraEditor.UserOp, typoraEditor, copyEvent);
      return clipboard["text/plain"] || "";
    } catch (_) {
      return "";
    } finally {
      globalThis.File._CopyContentFlag = previousCopyFlag;
    }
  }

  getSavedText() {
    return this.savedText || "";
  }

  getSavedMarkdown() {
    return this.savedMarkdown || "";
  }

  restoreAndReplace(nextText) {
    if (!this.savedRange || !String(nextText || "").trim()) return false;

    try {
      const typoraEditor = globalThis.File?.editor;
      if (!typoraEditor || typeof typoraEditor.insertText !== "function") return false;

      const editorElement = document.getElementById("write");
      if (editorElement) editorElement.focus();

      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(this.savedRange);

      // 必须经过 Typora 的编辑器接口写入，才能同步内部 NodeMap 与撤销栈。
      // 直接调用 document.execCommand 会在包含标题、列表等块结构时触发
      // Typora 1.10.x 的 "detect data lost" 保护错误。
      typoraEditor.insertText(String(nextText).trim());
      return true;
    } catch (_) {
      return false;
    } finally {
      this.clear();
    }
  }

  clear() {
    this.savedRange = null;
    this.savedText = "";
    this.savedMarkdown = "";
  }
}
