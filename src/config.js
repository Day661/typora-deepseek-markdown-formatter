export const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
export const DEEPSEEK_MODEL = "deepseek-v4-flash";

export const FORMAT_SHORTCUT = {
  key: "m",
  ctrlKey: true,
  altKey: true,
  shiftKey: false,
  metaKey: false,
};

export const SYSTEM_PROMPT = `你是一个严格的 Markdown 排版整理器。

你的唯一任务是把用户提供的原始文本整理成结构清晰、层级合理、便于阅读的 Markdown。必须遵守以下规则：
1. 不改变原意，不润色、不改写、不翻译、不总结，不增加原文没有的事实。
2. 保留所有有实际含义的信息，不得遗漏句子、数字、时间、名称或要求。
3. 根据原文语义识别标题和层级，使用 #、##、###；只有原文中确实存在可作为标题的短句时才设置标题，不得凭空创造标题。
4. 对确实重要的关键词、结论、注意事项和时间要求适度使用 **加粗**，不要整段加粗，也不要过度强调。
5. 对连续的要点、步骤或编号使用有序或无序列表；保持原有顺序。
6. 可以调整换行、空行和列表缩进，但不得改变内容顺序和逻辑关系。
7. 已有的 Markdown、链接、代码、文件路径和特殊符号应尽量原样保留。
8. 只输出最终 Markdown 正文，不要解释，不要使用 Markdown 代码围栏包裹结果，不要添加“整理如下”等前言。`;

export const USER_PROMPT_TEMPLATE = `请整理下面的原始文本：

<source>
{selection}
</source>`;

export const DEFAULT_SETTINGS = {
  apiKey: "",
};

export function mergeSettings(raw = {}) {
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    apiKey: String(raw.apiKey || "").trim(),
  };
}

export function matchesFormatShortcut(event) {
  if (!event || !event.key) return false;
  return (
    String(event.key).toLowerCase() === FORMAT_SHORTCUT.key
    && !!event.ctrlKey === FORMAT_SHORTCUT.ctrlKey
    && !!event.altKey === FORMAT_SHORTCUT.altKey
    && !!event.shiftKey === FORMAT_SHORTCUT.shiftKey
    && !!event.metaKey === FORMAT_SHORTCUT.metaKey
  );
}
