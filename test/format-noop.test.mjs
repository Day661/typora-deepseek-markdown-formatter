import assert from "node:assert/strict";

import { formatMarkdown } from "../src/api.js";

const source = "文章标题：\n\n脚本：\n\n这里是正文。";

globalThis.fetch = async () => ({
  ok: true,
  async json() {
    return { choices: [{ message: { content: source } }] };
  },
});

await assert.rejects(
  () => formatMarkdown(source, "sk-test"),
  /没有产生任何 Markdown 排版变化/,
);

console.log("No-op formatting regression check passed.");
