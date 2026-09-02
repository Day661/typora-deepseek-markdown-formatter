import assert from "node:assert/strict";

class FakePlugin {}
class FakePluginSettings {}

globalThis.window = {
  [Symbol.for("typora-plugin-core@v2")]: {
    Plugin: FakePlugin,
    PluginSettings: FakePluginSettings,
    SettingTab: class {},
    Notice: class {},
  },
  setTimeout() {},
};

const makeElement = () => ({
  appendChild() {},
  remove() {},
  focus() {},
  classList: { add() {}, remove() {} },
});
globalThis.document = {
  querySelector: () => null,
  createElement: makeElement,
  getElementById: makeElement,
  body: { appendChild() {} },
};

let apiSource = "";
let inserted = "";
globalThis.fetch = async (_url, init) => {
  const body = JSON.parse(init.body);
  const userContent = body.messages[1].content;
  apiSource = userContent.match(/<source>\n([\s\S]*?)\n<\/source>/)?.[1] || "";
  const result = apiSource.includes("DSFMT")
    ? apiSource.replace("错别字", "正确文字")
    : "# 智能排版结果";
  return {
    ok: true,
    async json() {
      return { choices: [{ message: { content: result } }] };
    },
  };
};

const { default: FormatterPlugin } = await import("../src/plugin.js");
const plugin = new FormatterPlugin();
plugin.getSettings = () => ({ apiKey: "sk-test" });
plugin.selection = {
  getSavedText: () => "高亮错别字",
  getSavedMarkdown: () => "==高亮错别字==",
  restoreAndReplace(value) {
    inserted = value;
    return true;
  },
  clear() {},
};

await plugin.runTransform("cleanup");
assert.match(apiSource, /DSFMT/);
assert.equal(inserted, "==高亮正确文字==");

await plugin.runTransform("format");
assert.equal(apiSource, "高亮错别字");
assert.equal(inserted, "# 智能排版结果");

console.log("Cleanup/format source routing checks passed.");
