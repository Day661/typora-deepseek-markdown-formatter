import {
  CLEANUP_SYSTEM_PROMPT,
  CLEANUP_USER_PROMPT_TEMPLATE,
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

function characterBigramSimilarity(left, right) {
  const a = Array.from(String(left || "").replace(/\s+/g, ""));
  const b = Array.from(String(right || "").replace(/\s+/g, ""));
  if (a.length < 2 || b.length < 2) return a.join("") === b.join("") ? 1 : 0;

  const counts = new Map();
  for (let index = 0; index < a.length - 1; index += 1) {
    const pair = `${a[index]}\u0000${a[index + 1]}`;
    counts.set(pair, (counts.get(pair) || 0) + 1);
  }

  let overlap = 0;
  for (let index = 0; index < b.length - 1; index += 1) {
    const pair = `${b[index]}\u0000${b[index + 1]}`;
    const available = counts.get(pair) || 0;
    if (available > 0) {
      overlap += 1;
      counts.set(pair, available - 1);
    }
  }
  return (2 * overlap) / ((a.length - 1) + (b.length - 1));
}

function editDistance(left, right) {
  const a = Array.from(String(left || ""));
  const b = Array.from(String(right || ""));
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let row = 1; row <= a.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= b.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length];
}

export function assertLightCleanup(source, result) {
  const before = String(source || "");
  const after = String(result || "");
  const maxDeletion = Math.max(12, Math.ceil(before.length * 0.15));
  const maxAddition = Math.max(6, Math.ceil(before.length * 0.05));
  const deleted = Math.max(0, before.length - after.length);
  const added = Math.max(0, after.length - before.length);
  const similarity = characterBigramSimilarity(before, after);
  const compactBefore = before.replace(/\s+/g, "");
  const compactAfter = after.replace(/\s+/g, "");
  const shortTextChangedTooMuch = Math.max(compactBefore.length, compactAfter.length) <= 40
    && editDistance(compactBefore, compactAfter) > Math.max(5, Math.ceil(compactBefore.length * 0.25));
  const longTextChangedTooMuch = Math.max(compactBefore.length, compactAfter.length) > 40
    && similarity < 0.78;

  if (!after.trim() || deleted > maxDeletion || added > maxAddition || shortTextChangedTooMuch || longTextChangedTooMuch) {
    throw new Error("轻度清理检测到改动可能过多，已停止覆盖原文。 ");
  }
  return after;
}

async function transformText(selection, apiKey, systemPrompt, userPromptTemplate) {
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
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: userPromptTemplate.replace("{selection}", selection),
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

export async function formatMarkdown(selection, apiKey) {
  const result = await transformText(selection, apiKey, SYSTEM_PROMPT, USER_PROMPT_TEMPLATE);
  const before = String(selection || "").replace(/\r\n/g, "\n").trim();
  const after = String(result || "").replace(/\r\n/g, "\n").trim();
  if (before === after) {
    throw new Error("DeepSeek 没有产生任何 Markdown 排版变化，原文保持不变。 ");
  }
  return result;
}

export async function cleanLightly(selection, apiKey) {
  const result = await transformText(
    selection,
    apiKey,
    CLEANUP_SYSTEM_PROMPT,
    CLEANUP_USER_PROMPT_TEMPLATE,
  );
  return assertLightCleanup(selection, result);
}
