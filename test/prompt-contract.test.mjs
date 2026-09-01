import assert from "node:assert/strict";

import {
  CLEANUP_SYSTEM_PROMPT,
  CLEANUP_USER_PROMPT_TEMPLATE,
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
  "符合以下条件时必须执行",
  "第一非空行",
  "独立成行且作为章节标签",
  "行首为连续编号",
  "同一行开头的短标签",
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

const requiredCleanupRules = [
  "极度克制",
  "置信度极高",
  "孤立的口头停顿词",
  "句尾语气词",
  "完整保留作者本人的口语感、情绪、犹豫和表达习惯",
  "一处很小的语序、搭配或连接调整",
  "不得改成标准书面语",
  "我觉得、有点、其实、可能、好像、比较、然后、但是、所以",
  "不得把鲜活的个人表达改成中性陈述",
  "宁可漏改，也不要多改",
  "禁止大范围润色、重写",
  "已有 Markdown 标记",
];

for (const rule of requiredCleanupRules) {
  assert.ok(CLEANUP_SYSTEM_PROMPT.includes(rule), `缺少轻度清理约束：${rule}`);
}

assert.ok(CLEANUP_USER_PROMPT_TEMPLATE.includes("轻度、轻度、轻度"));
assert.ok(CLEANUP_USER_PROMPT_TEMPLATE.includes("口语感、个人感受和表达习惯"));
assert.equal((CLEANUP_USER_PROMPT_TEMPLATE.match(/\{selection\}/g) || []).length, 1);

console.log("Prompt contract checks passed.");
