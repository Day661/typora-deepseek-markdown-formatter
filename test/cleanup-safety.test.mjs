import assert from "node:assert/strict";

import { assertLightCleanup, cleanLightly } from "../src/api.js";
import { matchesCleanupShortcut } from "../src/config.js";

assert.equal(matchesCleanupShortcut({ key: "l", ctrlKey: true, altKey: true }), true);
assert.equal(matchesCleanupShortcut({ key: "l", ctrlKey: true, altKey: false }), false);

const source = "嗯，我我觉得这个方案有点不太准确，但是整体方向没问题。";
const cleaned = "我觉得这个方案有点不太准确，但是整体方向没问题。";

assert.equal(assertLightCleanup(source, cleaned), cleaned);
assert.equal(assertLightCleanup("我觉的挺好。", "我觉得挺好。"), "我觉得挺好。");
assert.throws(
  () => assertLightCleanup(source, "该方案基本可行，但仍需进一步优化。"),
  /改动可能过多/,
);

let capturedBody;
globalThis.fetch = async (_url, init) => {
  capturedBody = JSON.parse(init.body);
  return {
    ok: true,
    async json() {
      return { choices: [{ message: { content: cleaned } }] };
    },
  };
};

assert.equal(await cleanLightly(source, "sk-test"), cleaned);
assert.match(capturedBody.messages[0].content, /保留作者本人的口语感/);
assert.match(capturedBody.messages[1].content, /轻度、轻度、轻度/);
assert.match(capturedBody.messages[1].content, /我我觉得/);

console.log("Light cleanup safety checks passed.");
