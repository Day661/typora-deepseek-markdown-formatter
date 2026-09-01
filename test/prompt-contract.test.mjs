import assert from "node:assert/strict";

import {
  SYSTEM_PROMPT,
  USER_PROMPT_TEMPLATE,
} from "../src/config.js";

const requiredRules = [
  "不可改写的数据",
  "每段内容必须恰好保留一次",
  "不得复制前文来填充后文",
  "不得改名、缩写、扩写",
  "禁止根据段落含义创造",
  "句子内部",
  "禁止拆成多个项目符号",
  "视为占位符",
  "禁止推测、补全",
  "选择不添加格式",
];

for (const rule of requiredRules) {
  assert.ok(SYSTEM_PROMPT.includes(rule), `缺少关键约束：${rule}`);
}

const userPrompt = USER_PROMPT_TEMPLATE.replace(
  "{selection}",
  "标题：\n\n地点：地板，角落，阳台\n\n1\n2\n3",
);

assert.ok(userPrompt.includes("最小干预、原文零改写"));
assert.ok(userPrompt.includes("<source>"));
assert.ok(userPrompt.includes("地点：地板，角落，阳台"));
assert.ok(userPrompt.includes("\n1\n2\n3\n"));
assert.equal((USER_PROMPT_TEMPLATE.match(/\{selection\}/g) || []).length, 1);

console.log("Prompt contract checks passed.");
