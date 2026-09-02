const PROTECTED_FORMAT_ORDER = [
  "加粗",
  "斜体",
  "高亮",
  "字体颜色",
  "字体样式",
  "下划线",
  "删除线",
  "链接",
  "代码",
  "标题",
  "列表",
  "表格",
  "引用",
  "图片",
];

function hasHtmlTag(html, names) {
  return new RegExp(`<\\/?(?:${names})\\b`, "i").test(html);
}

export function findProtectedFormattingInHtml(value) {
  const html = String(value || "");
  const found = new Set();

  if (hasHtmlTag(html, "strong|b")) found.add("加粗");
  if (hasHtmlTag(html, "em|i")) found.add("斜体");
  if (hasHtmlTag(html, "mark")) found.add("高亮");
  if (hasHtmlTag(html, "font")) found.add("字体样式");
  if (/<font\b[^>]*\bcolor\s*=/i.test(html)) found.add("字体颜色");
  if (hasHtmlTag(html, "u")) found.add("下划线");
  if (hasHtmlTag(html, "del|s|strike")) found.add("删除线");
  if (hasHtmlTag(html, "a")) found.add("链接");
  if (hasHtmlTag(html, "code|pre")) found.add("代码");
  if (hasHtmlTag(html, "h[1-6]")) found.add("标题");
  if (hasHtmlTag(html, "ul|ol|li")) found.add("列表");
  if (hasHtmlTag(html, "table|thead|tbody|tfoot|tr|th|td")) found.add("表格");
  if (hasHtmlTag(html, "blockquote")) found.add("引用");
  if (hasHtmlTag(html, "img")) found.add("图片");

  const stylePattern = /\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  for (const match of html.matchAll(stylePattern)) {
    const style = match[1] || match[2] || match[3] || "";
    if (/(^|;)\s*background(?:-color)?\s*:/i.test(style)) found.add("高亮");
    if (/(^|;)\s*color\s*:/i.test(style)) found.add("字体颜色");
    if (/(^|;)\s*font-weight\s*:\s*(?:bold|[6-9]00)/i.test(style)) found.add("加粗");
    if (/(^|;)\s*font-style\s*:\s*italic/i.test(style)) found.add("斜体");
    if (/(^|;)\s*text-decoration[^:]*:\s*[^;]*underline/i.test(style)) found.add("下划线");
    if (/(^|;)\s*font-(?:family|size)\s*:/i.test(style)) found.add("字体样式");
  }

  return PROTECTED_FORMAT_ORDER.filter((name) => found.has(name));
}

function boundaryElementMarkup(node) {
  const snippets = [];
  let element = node?.nodeType === 1 ? node : node?.parentElement;
  while (element && !element.matches?.("#write, .CodeMirror")) {
    const tag = String(element.tagName || "").toLowerCase();
    const style = element.getAttribute?.("style") || "";
    const color = element.getAttribute?.("color") || "";
    if (tag) snippets.push(`<${tag} style="${style}" color="${color}">`);
    element = element.parentElement;
  }
  return snippets.join("");
}

function findProtectedFormattingInRange(range) {
  const snippets = [
    boundaryElementMarkup(range?.startContainer),
    boundaryElementMarkup(range?.endContainer),
  ];

  try {
    if (range?.cloneContents && typeof document?.createElement === "function") {
      const wrapper = document.createElement("div");
      wrapper.appendChild(range.cloneContents());
      snippets.push(wrapper.innerHTML || "");
    }
  } catch (_) {
    // 检测失败时不阻塞普通文本处理；写回仍由 Typora 原生接口完成。
  }

  return findProtectedFormattingInHtml(snippets.join(""));
}

export class EditorSelectionController {
  constructor() {
    this.savedRange = null;
    this.savedText = "";
    this.savedProtectedFormatting = [];
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
    this.savedProtectedFormatting = findProtectedFormattingInRange(this.savedRange);
    return true;
  }

  getSavedText() {
    return this.savedText || "";
  }

  getSavedProtectedFormatting() {
    return [...this.savedProtectedFormatting];
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
    this.savedProtectedFormatting = [];
  }
}
