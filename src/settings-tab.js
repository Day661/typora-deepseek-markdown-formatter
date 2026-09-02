const { SettingTab, Notice } = window[Symbol.for("typora-plugin-core@v2")];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export class DeepSeekMarkdownSettingTab extends SettingTab {
  constructor(plugin) {
    super();
    this.plugin = plugin;
  }

  get name() {
    return "DeepSeek Markdown 智能排版";
  }

  onload() {
    this.render();
  }

  render() {
    const settings = this.plugin.getSettings();
    const container = this.containerEl || this.contentEl || this.tabContentEl;
    if (container.empty) container.empty();
    else container.innerHTML = "";

    container.innerHTML = `
      <h2>DeepSeek Markdown 智能排版</h2>
      <div class="deepseek-md-setting-grid">
        <div>
          <label for="deepseek-md-api-key">DeepSeek API Key</label>
          <input id="deepseek-md-api-key" type="password" autocomplete="off" value="${escapeHtml(settings.apiKey)}" placeholder="sk-..." />
        </div>
        <div class="deepseek-md-setting-note">
          固定使用 DeepSeek 官方接口和 deepseek-v4-flash 非思考模式。Key 保存在本机的社区插件配置中，只会随排版请求发送给 DeepSeek。
        </div>
        <div class="deepseek-md-setting-note">
          中等结构化排版：选中文字后按 Ctrl+Alt+M，明确的多对象比较内容会优先使用表格。轻度清理：按 Ctrl+Alt+L，清理极确定的小问题、轻微顺句，并只在上下文唯一明确时补最短遗漏成分。两项功能也都可从右键菜单使用；结果会直接覆盖选区，不满意可立即按 Ctrl+Z 撤销。
        </div>
        <div><button class="deepseek-md-button" id="deepseek-md-save">保存</button></div>
      </div>
    `;

    container.querySelector("#deepseek-md-save").addEventListener("click", () => {
      const apiKey = container.querySelector("#deepseek-md-api-key").value.trim();
      this.plugin.saveSettings({ apiKey });
      new Notice(apiKey ? "DeepSeek API Key 已保存。" : "API Key 已清空。 ");
    });
  }
}
