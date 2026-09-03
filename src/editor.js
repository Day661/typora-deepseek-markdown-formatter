export class EditorSelectionController {
  constructor() {
    this.savedRange = null;
    this.savedText = "";
    this.savedMarkdown = "";
    this.savedDocument = "";
    this.savedDocumentStart = -1;
    this.savedDocumentEnd = -1;
    this.savedLineEnding = "\n";
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
    this.captureDocumentContext();
    return true;
  }

  normalizeLineEndings(value) {
    return String(value || "").replace(/\r\n/g, "\n");
  }

  normalizeVisibleText(value) {
    return String(value || "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  isWholeDocumentSelection() {
    const writingArea = globalThis.document?.getElementById?.("write");
    const documentText = writingArea?.innerText ?? writingArea?.textContent ?? "";
    const selectedText = this.normalizeVisibleText(this.savedText);
    return !!selectedText && selectedText === this.normalizeVisibleText(documentText);
  }

  captureDocumentContext() {
    const typoraEditor = globalThis.File?.editor;
    if (typeof typoraEditor?.getMarkdown !== "function" || !this.savedMarkdown) return false;

    const rawDocument = String(typoraEditor.getMarkdown() || "");
    const documentMarkdown = this.normalizeLineEndings(rawDocument);
    const rawSelection = this.normalizeLineEndings(this.savedMarkdown);
    const candidates = [...new Set([rawSelection, rawSelection.trim()].filter(Boolean))];

    for (const candidate of candidates) {
      const start = documentMarkdown.indexOf(candidate);
      if (start < 0 || documentMarkdown.indexOf(candidate, start + candidate.length) >= 0) continue;
      this.savedDocument = documentMarkdown;
      this.savedDocumentStart = start;
      this.savedDocumentEnd = start + candidate.length;
      this.savedLineEnding = rawDocument.includes("\r\n") ? "\r\n" : "\n";
      return true;
    }

    // Typora 会在“复制为 Markdown”时重新对齐表格等语法，导致全选内容
    // 与 getMarkdown() 语义相同但字符串不同。此时由可见全文确认全选范围。
    if (this.isWholeDocumentSelection()) {
      this.savedDocument = documentMarkdown;
      this.savedDocumentStart = 0;
      this.savedDocumentEnd = documentMarkdown.length;
      this.savedLineEnding = rawDocument.includes("\r\n") ? "\r\n" : "\n";
      return true;
    }
    return false;
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
    if (
      !this.savedRange
      || !String(nextText || "").trim()
      || !this.savedDocument
      || this.savedDocumentStart < 0
      || this.savedDocumentEnd < 0
    ) return false;

    try {
      const typoraEditor = globalThis.File?.editor;
      const reloadContent = globalThis.File?.reloadContent;
      if (typeof typoraEditor?.getMarkdown !== "function" || typeof reloadContent !== "function") return false;

      // 请求期间若正文被人工修改，拒绝用旧快照覆盖新内容。
      const currentDocument = this.normalizeLineEndings(typoraEditor.getMarkdown());
      if (currentDocument !== this.savedDocument) return false;

      const replacement = this.normalizeLineEndings(nextText).trim();
      const nextDocument = (
        this.savedDocument.slice(0, this.savedDocumentStart)
        + replacement
        + this.savedDocument.slice(this.savedDocumentEnd)
      );
      const content = this.savedLineEnding === "\r\n"
        ? nextDocument.replace(/\n/g, "\r\n")
        : nextDocument;

      // insertText 会继承当前块上下文，跨块选区可能被整体包进引用块。
      // reloadContent 直接按完整 Markdown 重建 NodeMap，同时由 Typora
      // 注册整篇撤销记录并同步标题、大纲、表格与列表。
      reloadContent.call(globalThis.File, content, { delayRefresh: false });
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
    this.savedDocument = "";
    this.savedDocumentStart = -1;
    this.savedDocumentEnd = -1;
    this.savedLineEnding = "\n";
  }
}
