export class EditorSelectionController {
  constructor() {
    this.savedRange = null;
    this.savedText = "";
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
    return true;
  }

  getSavedText() {
    return this.savedText || "";
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
  }
}
