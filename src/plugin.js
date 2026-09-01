const { Plugin, PluginSettings } = window[Symbol.for("typora-plugin-core@v2")];

import { abortFormatting, formatMarkdown } from "./api.js";
import { DEFAULT_SETTINGS, matchesFormatShortcut, mergeSettings } from "./config.js";
import { EditorSelectionController } from "./editor.js";
import { DeepSeekMarkdownSettingTab } from "./settings-tab.js";
import {
  closeContextMenu,
  ensureStyles,
  hideToast,
  openContextMenu,
  removeStyles,
  showToast,
} from "./ui.js";

export default class DeepSeekMarkdownFormatterPlugin extends Plugin {
  constructor() {
    super(...arguments);
    this.selection = new EditorSelectionController();
    this.busy = false;
    this.bypassNextContextMenu = false;
    this.handleContextMenu = this.handleContextMenu.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  async onload() {
    this.registerSettings(new PluginSettings(this.app, this.manifest, { version: 1 }));
    this.settings.setDefault(DEFAULT_SETTINGS);
    this.registerSettingTab(new DeepSeekMarkdownSettingTab(this));
    ensureStyles();
    document.addEventListener("contextmenu", this.handleContextMenu, true);
    document.addEventListener("keydown", this.handleKeyDown, true);
  }

  onunload() {
    document.removeEventListener("contextmenu", this.handleContextMenu, true);
    document.removeEventListener("keydown", this.handleKeyDown, true);
    abortFormatting();
    closeContextMenu();
    hideToast();
    removeStyles();
  }

  getSettings() {
    return mergeSettings({ apiKey: this.settings.get("apiKey") });
  }

  saveSettings(patch) {
    const next = mergeSettings({ ...this.getSettings(), ...patch });
    this.settings.set("apiKey", next.apiKey);
  }

  handleKeyDown(event) {
    if (!this.selection.isEditorTarget(event.target) || !matchesFormatShortcut(event)) return;
    event.preventDefault();
    event.stopPropagation();
    if (!this.selection.captureSelection()) {
      showToast("请先选中需要排版的文字。", "error");
      return;
    }
    this.runFormatter();
  }

  handleContextMenu(event) {
    if (this.bypassNextContextMenu) {
      this.bypassNextContextMenu = false;
      return;
    }
    if (!this.selection.isEditorTarget(event.target)) return;
    if (!this.selection.getSelectedText().trim()) return;

    this.selection.captureSelection();
    const nativeEvent = {
      clientX: event.clientX,
      clientY: event.clientY,
      screenX: event.screenX,
      screenY: event.screenY,
      ctrlKey: !!event.ctrlKey,
      shiftKey: !!event.shiftKey,
      altKey: !!event.altKey,
      metaKey: !!event.metaKey,
      target: event.target,
    };

    event.preventDefault();
    event.stopImmediatePropagation();
    openContextMenu({
      x: event.clientX,
      y: event.clientY,
      items: [
        {
          label: "DeepSeek Markdown 智能排版",
          description: "立即排版并直接覆盖选中的原文",
          value: "format",
        },
        {
          label: "打开 Typora 原右键菜单",
          value: "native",
        },
      ],
      onSelect: (value) => {
        if (value === "format") this.runFormatter();
        if (value === "native") this.openNativeContextMenu(nativeEvent);
      },
    });
  }

  openNativeContextMenu(info) {
    const target = info.target || document.elementFromPoint(info.clientX, info.clientY);
    if (!target) return;
    this.bypassNextContextMenu = true;
    target.dispatchEvent(new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      composed: true,
      button: 2,
      buttons: 2,
      clientX: info.clientX,
      clientY: info.clientY,
      screenX: info.screenX,
      screenY: info.screenY,
      ctrlKey: info.ctrlKey,
      shiftKey: info.shiftKey,
      altKey: info.altKey,
      metaKey: info.metaKey,
    }));
    window.setTimeout(() => { this.bypassNextContextMenu = false; }, 0);
  }

  async runFormatter() {
    if (this.busy) {
      showToast("正在排版，请稍候。", "info");
      return;
    }

    const source = this.selection.getSavedText();
    if (!source.trim()) {
      showToast("请先选中需要排版的文字。", "error");
      return;
    }

    const { apiKey } = this.getSettings();
    if (!apiKey) {
      showToast("请按 Ctrl+. 打开插件设置并填写 DeepSeek API Key。", "error", 5000);
      return;
    }

    this.busy = true;
    showToast("DeepSeek 正在整理 Markdown…", "info", 0);
    try {
      const result = await formatMarkdown(source, apiKey);
      const replaced = this.selection.restoreAndReplace(result);
      if (!replaced) throw new Error("无法恢复原选区；请重新选择文字后再试。 ");
      showToast("排版完成；不满意可立即按 Ctrl+Z 撤销。", "success", 5000);
    } catch (error) {
      this.selection.clear();
      const message = error?.name === "AbortError"
        ? "排版已取消。"
        : (error?.message || "排版失败。 ");
      showToast(message, error?.name === "AbortError" ? "info" : "error", 6000);
    } finally {
      this.busy = false;
    }
  }
}
