import {
  DEEPSEEK_API_URL,
  DEEPSEEK_MODEL,
  SYSTEM_PROMPT,
  USER_PROMPT_TEMPLATE,
} from "./config.js";

let activeController = null;

export function abortFormatting() {
  if (activeController) {
    activeController.abort();
    activeController = null;
  }
}

function stripOuterCodeFence(value) {
  const text = String(value || "").trim();
  const match = text.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i);
  return match ? match[1].trim() : text;
}

export async function formatMarkdown(selection, apiKey) {
  if (!String(apiKey || "").trim()) {
    throw new Error("尚未设置 DeepSeek API Key。请按 Ctrl+. 打开插件设置。 ");
  }

  activeController = new AbortController();
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${String(apiKey).trim()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        thinking: { type: "disabled" },
        stream: false,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: USER_PROMPT_TEMPLATE.replace("{selection}", selection),
          },
        ],
      }),
      signal: activeController.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      if (response.status === 401) {
        throw new Error("DeepSeek API Key 无效或已失效。 ");
      }
      if (response.status === 402) {
        throw new Error("DeepSeek 账户余额不足。 ");
      }
      if (response.status === 429) {
        throw new Error("DeepSeek 请求过于频繁，请稍后重试。 ");
      }
      throw new Error(`DeepSeek API ${response.status}: ${body.slice(0, 180)}`);
    }

    const payload = await response.json();
    const result = payload?.choices?.[0]?.message?.content;
    if (!String(result || "").trim()) {
      throw new Error("DeepSeek 没有返回可用内容。 ");
    }
    return stripOuterCodeFence(result);
  } finally {
    activeController = null;
  }
}
