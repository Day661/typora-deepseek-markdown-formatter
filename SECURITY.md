# Security

## API Key

DeepSeek API Key 由 Typora Community Plugin 的设置系统保存在用户本机。请不要把包含真实 Key 的配置文件、截图或日志提交到 GitHub。

插件只向以下固定地址发送请求：

`https://api.deepseek.com/chat/completions`

请求内容仅包含用户主动选中的文本、内置 Markdown 排版指令以及模型参数。

## Reporting

如果发现安全问题，请通过 GitHub Security Advisory 私下报告，不要在公开 Issue 中粘贴 API Key 或敏感文本。
