import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const scriptUrl = new URL("../scripts/keep-latest-release.ps1", import.meta.url);
const script = await readFile(scriptUrl, "utf8").catch(() => "");

assert.notEqual(script, "", "应提供只保留最新 Release 的发布清理脚本");
assert.match(script, /KeepTag/);
assert.match(script, /gh release view/);
assert.match(script, /gh release list/);
assert.match(script, /gh release delete/);
assert.match(script, /--cleanup-tag/);
assert.match(script, /保留版本不存在/);
assert.match(script, /清理后公开 Release 数量不是 1/);

console.log("Latest-only release retention script checks passed.");
