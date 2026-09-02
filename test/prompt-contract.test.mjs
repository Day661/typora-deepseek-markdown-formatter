import assert from "node:assert/strict";

import {
  CLEANUP_SYSTEM_PROMPT,
  CLEANUP_USER_PROMPT_TEMPLATE,
  SYSTEM_PROMPT,
  USER_PROMPT_TEMPLATE,
} from "../src/config.js";

const requiredRules = [
  "不可改写的数据",
  "每项事实必须恰好保留一次",
  "不得重复前文或填充空缺内容",
  "不得改名、缩写、扩写",
  "禁止根据段落含义创造",
  "句子内部",
  "禁止拆成多个项目符号",
  "视为占位符",
  "禁止推测、补全",
  "采用中等格式密度",
  "符合以下条件时必须执行",
  "第一非空行",
  "独立成行且作为章节标签",
  "行首为连续编号",
  "同一行开头的短标签",
  "至少有 3 个同类对象",
  "重复出现至少 2 个相同属性",
  "如果原文先列出带编号的对象名称",
  "原文缺失的字段保持空白单元格",
  "不得为了表格简洁而概括、缩写或润色",
];

for (const rule of requiredRules) {
  assert.ok(SYSTEM_PROMPT.includes(rule), `缺少关键约束：${rule}`);
}

const userPrompt = USER_PROMPT_TEMPLATE.replace(
  "{selection}",
  "标题：\n\n地点：地板，角落，阳台\n\n1\n2\n3",
);

assert.ok(userPrompt.includes("中等结构化、内容零改写"));
assert.ok(userPrompt.includes("优先使用 Markdown 表格"));
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
  "紧邻上下文能唯一确定",
  "只补最短必要文字",
  "中文本来就自然省略主语的句子不得强行补全",
  "提纲占位、空白编号和待补内容绝对不得补写",
];

for (const rule of requiredCleanupRules) {
  assert.ok(CLEANUP_SYSTEM_PROMPT.includes(rule), `缺少轻度清理约束：${rule}`);
}

assert.ok(CLEANUP_USER_PROMPT_TEMPLATE.includes("轻度、轻度、轻度"));
assert.ok(CLEANUP_USER_PROMPT_TEMPLATE.includes("口语感、个人感受和表达习惯"));
assert.ok(CLEANUP_USER_PROMPT_TEMPLATE.includes("补最短的遗漏成分"));
assert.equal((CLEANUP_USER_PROMPT_TEMPLATE.match(/\{selection\}/g) || []).length, 1);

console.log("Prompt contract checks passed.");
