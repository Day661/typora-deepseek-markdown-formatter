# DeepSeek Markdown 智能排版（Typora）

这是一个面向 Windows Typora 的单功能社区插件：选中已有文本后调用 DeepSeek，把内容整理为合适的 Markdown 标题、加粗和列表，并直接覆盖原选区。

Minimal DeepSeek-powered Markdown formatter for Typora: select text, press one shortcut, and replace the selection with structured Markdown.

项目主页：<https://github.com/Day661/typora-deepseek-markdown-formatter>

## 功能

- 固定使用 DeepSeek 官方 API，不需要 OpenAI API Key。
- 只保留 Markdown 排版，不包含 OCR、图片识别、问答或自定义 Prompt。
- 快捷键：`Ctrl+Alt+M`。
- 独立轻度清理：`Ctrl+Alt+L`，处理极确定的小问题并轻微顺句，同时保留自然口语和个人感受。
- 也可以选中文字后右键选择“DeepSeek Markdown 智能排版”。
- 生成完成后自动覆盖选区，不弹出预览窗口。
- 覆盖作为一次编辑写入 Typora，完成后可立即按 `Ctrl+Z` 恢复原文。
- 固定使用 `deepseek-v4-flash`，并关闭思考模式以提高速度。
- 内置“最小干预”排版规则：不改写原文、不创造标题、不拆分句内枚举、不补全占位符。

## 前置条件

- Windows 10/11。
- Typora 1.5.0 或更高版本。
- Typora Community Plugin 2.7.1 或更高版本。
- 有余额的 DeepSeek API Key。

## 安装

推荐从 [Releases](https://github.com/Day661/typora-deepseek-markdown-formatter/releases) 下载最新的插件压缩包。

### 第一次安装社区插件框架

1. 关闭 Typora。
2. 从 [Typora Community Plugin Releases](https://github.com/typora-community-plugin/typora-community-plugin/releases) 下载 `typora-community-plugin.zip`。
3. 解压后运行其中的 `install-windows.ps1`。
4. 重新打开 Typora，按 `Ctrl+.`；如果能看到 Community Plugins 设置，说明框架安装成功。

社区框架安装程序会修改 Typora 的 `resources/window.html`，安装前应备份该文件。Typora 升级后如果插件入口消失，需要重新运行框架安装脚本。

### 安装本插件

1. 关闭 Typora。
2. 解压本插件压缩包。
3. 将整个 `typora-markdown-formatter-deepseek` 文件夹复制到：

   `C:\Users\你的用户名\.typora\community-plugins\plugins\`

   最终应存在：

   `C:\Users\你的用户名\.typora\community-plugins\plugins\typora-markdown-formatter-deepseek\manifest.json`

4. 重新打开 Typora，按 `Ctrl+.` → `Community Plugins` / `已安装插件`。
5. 启用“DeepSeek Markdown 智能排版”。
6. 打开该插件设置，只填写 DeepSeek API Key，然后保存。

## 使用

1. 在 Typora 中选中需要整理的原文。
2. 按 `Ctrl+Alt+M`，或者右键选择“DeepSeek Markdown 智能排版”。
3. 等待提示“排版完成”。结果会直接覆盖原选区。
4. 如果不满意，立即按一次 `Ctrl+Z` 恢复原文。

如需轻度清理而不改变 Markdown 结构，选中文字后按 `Ctrl+Alt+L`，或从右键菜单选择“DeepSeek 轻度清理”。它会清理极确定的错字、填充音和口误重复，并只在原意完全明确时轻微顺句。“呢、啊、那个、就是”等可能有语气或语义作用的词，以及“我觉得、有点、其实、可能”等主观表达，默认保留；拿不准时不动。

建议第一次只选中一小段测试，确认效果和撤销行为符合预期后再处理长文本。

## 卸载与回滚

1. 可以先在 `Ctrl+.` → 已安装插件中禁用本插件。
2. 如需彻底卸载，在关闭 Typora 后删除：

   `C:\Users\你的用户名\.typora\community-plugins\plugins\typora-markdown-formatter-deepseek`

仅删除本插件不会影响 Typora 文档，也不会卸载社区插件框架。

## 隐私说明

- DeepSeek API Key 由 Typora Community Plugin 的设置系统保存在本机。
- 被选中的文字会发送到 `https://api.deepseek.com/chat/completions` 完成排版。
- 插件不会读取或发送未选中的文档内容。
- 插件不会读取 Codex、ChatGPT 或其他软件的登录凭据。

## 开源来源

本插件由 [Day661](https://github.com/Day661) 发布，基于 MIT 许可项目 [KokuYu-sysu/typora-gpt-edit](https://github.com/KokuYu-sysu/typora-gpt-edit) 的选区处理思路精简改造，参考提交 `868141e77f7f66227b73bc438d7511fddd30ddec`，并保留原项目许可证声明。

## 更新记录

- 1.1.0：增加独立的轻度清理功能与改动幅度安全阈值，原有保守排版功能不变。
- 1.0.2：改为保守排版模式，严格保留原文，只添加必要的标题、少量加粗和空行；禁止创造小标题、拆分句内枚举或补写占位内容。
- 1.0.1：改用 `File.editor.insertText` 写回选区，修复 Typora 1.10.x 在插入标题、列表等块级 Markdown 后触发 `detect data lost` 的错误，并保留原生撤销记录。
- 1.0.0：首个精简版本。
