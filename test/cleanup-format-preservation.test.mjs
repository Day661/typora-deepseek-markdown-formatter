import assert from "node:assert/strict";

import {
  protectMarkdownFormatting,
  restoreProtectedFormatting,
} from "../src/api.js";

const original = `# 标题\n\n这是**错别字**、==高亮文字==和<span style="color: red">红色文字</span>。\n\n- 第一项\n- 第二项`;
const protectedValue = protectMarkdownFormatting(original);

assert.ok(protectedValue.tokens.length > 0);
assert.ok(!protectedValue.text.includes("**"));
assert.ok(!protectedValue.text.includes("=="));
assert.ok(!protectedValue.text.includes("color: red"));
assert.ok(!protectedValue.text.includes("\n"));

const cleaned = protectedValue.text.replace("错别字", "正确文字");
assert.equal(
  restoreProtectedFormatting(cleaned, protectedValue.tokens),
  original.replace("错别字", "正确文字"),
);

assert.throws(
  () => restoreProtectedFormatting(cleaned.replace(protectedValue.tokens[0].token, ""), protectedValue.tokens),
  /未能完整保留原有格式/,
);

const firstToken = protectedValue.tokens[0].token;
const secondToken = protectedValue.tokens[1].token;
const reordered = cleaned
  .replace(firstToken, "⟦DSFMT_SWAP⟧")
  .replace(secondToken, firstToken)
  .replace("⟦DSFMT_SWAP⟧", secondToken);
assert.throws(
  () => restoreProtectedFormatting(reordered, protectedValue.tokens),
  /未能完整保留原有格式/,
);

console.log("Light cleanup format preservation checks passed.");
