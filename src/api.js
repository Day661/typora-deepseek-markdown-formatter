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

const FORMAT_TOKEN_PATTERN = /⟦DSFMT\d{4,}⟧/g;

export function protectMarkdownFormatting(value) {
  let text = String(value || "");
  const tokens = [];
  const protect = (literal) => {
    const token = `⟦DSFMT${String(tokens.length).padStart(4, "0")}⟧`;
    tokens.push({ token, literal });
    return token;
  };

  const replace = (pattern, replacer = (match) => protect(match)) => {
    text = text.replace(pattern, replacer);
  };

  // 代码内容完全不交给模型修改。
  replace(/(^|\n)(```|~~~)[^\n]*\n[\s\S]*?\n\2(?=\n|$)/g);
  replace(/`+[^`\n]*`+/g);

  // 保留 Typora 产生的 HTML 富文本标签（颜色、字体、下划线等）。
  replace(/<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>/g);

  // 链接和图片只开放可见文字，目标地址及语法保持原样。
  replace(/(!?\[)([^\]\n]*)(\]\([^\n)]*\))/g, (_match, open, label, close) => (
    `${protect(open)}${label}${protect(close)}`
  ));
  replace(/(!?\[)([^\]\n]*)(\]\[[^\]\n]*\])/g, (_match, open, label, close) => (
    `${protect(open)}${label}${protect(close)}`
  ));

  // 锁定块级结构、表格边界、行内格式符、转义符及所有换行。
  replace(/^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*$/gm);
  replace(/^(\s{0,3}(?:#{1,6}\s+|>\s*|(?:[-+*]|\d+[.)])\s+(?:\[[ xX]\]\s+)?))/gm);
  replace(/\\[^\s]/g);
  replace(/\|/g);
  replace(/\*\*|__|==|~~|\*|_/g);
  replace(/ {2,}(?=\r?\n)/g);
  replace(/\r?\n/g);

  const tokenMap = new Map(tokens.map((item) => [item.token, item]));
  const orderedTokens = (text.match(FORMAT_TOKEN_PATTERN) || []).map((token) => tokenMap.get(token));
  return { text, tokens: orderedTokens };
}

export function restoreProtectedFormatting(value, tokens) {
  let text = String(value || "");
  const expected = (tokens || []).map(({ token }) => token);
  const actual = text.match(FORMAT_TOKEN_PATTERN) || [];
  if (expected.length !== actual.length || expected.some((token, index) => token !== actual[index])) {
    throw new Error("轻度清理未能完整保留原有格式，已停止覆盖原文。 ");
  }

  for (const { token, literal } of tokens || []) {
    text = text.replace(token, literal);
  }
  return text;
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
  const protectedSource = protectMarkdownFormatting(selection);
  const result = await transformText(
    protectedSource.text,
    apiKey,
    CLEANUP_SYSTEM_PROMPT,
    CLEANUP_USER_PROMPT_TEMPLATE,
  );
  const restored = restoreProtectedFormatting(result, protectedSource.tokens);
  return assertLightCleanup(selection, restored);
}
