// ui/ の入口（ui/index.ts）と、パッケージとして配る形（package.json の exports・files）を確かめる。
// 防ぎたい事故:
//   - 入口から部品や定数が抜ける・増える（使う側の import が型エラーか undefined になる）
//   - ui/ に大文字小文字だけ違うファイル名の組がある（ProgressStar.tsx と progressStar.ts が並んで実際に起きた）。
//     大文字小文字を区別しない macOS では "./ProgressStar" が progressStar.ts に当たり、tsc が TS1149・TS1261 で止まる。
//     区別する Linux の CI では tsc が通ってしまい気付けないので、③ のテストで止める
//   - 入口に `export { … } from` 以外の export 文が紛れ込む（`export *` で中の関数が黙って公開 API に入る）
//   - 部品の既定値と街への行き先が変わる（Confetti の count 18・TOWN_URL "/"・TOWN_LINK_HEIGHT 44。.tsx にあり、
//     見た目の撮影では気付きにくい）
//   - 部品が require する svg/ の絵が、パッケージに入っていない（files に svg が無い・綴りが違う）
// index.ts は .tsx を読み込むので Node では import できない。ソースからコメントを除いて export の文を読む。
//
// 見るもの:
//   ① ui/index.ts の export の名前の一覧
//   ② index.ts の from "./X" はすべて ui/ に大文字小文字まで同じ名前の .ts か .tsx がある
//   ③ ui/ のファイル名に、大文字小文字だけ違う組が無い（ui/ を列挙。0 件なら失敗）
//   ④ .ts の値の export は、その module から実際に読める（.tsx と、拡張子なしの相対 import を持つ .ts は
//      Node で読めないので除く。除いたものは名前の一覧 ① と tsc が見る）
//   ⑤ ui/*.tsx の require("../svg/…") はすべて svg/ に同じ綴りで実在し、package.json の files に svg と ui がある
//   ⑥ exports の "./ui" は ui/index.ts で、svg/ は exports に出さない（部品が相対で読むだけ。公開 API にしない）
//   ⑦ ui/index.ts の export は `export { … } from "…"` の形だけ（`export *`・`export const` などは失敗）
//   ⑧ .tsx の既定値: Confetti の count 18、TOWN_URL "/"、TOWN_LINK_HEIGHT 44（ソースの文を読む）
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const uiDir = new URL("ui/", root);
const read = (rel) => readFileSync(new URL(rel, root), "utf8");
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// export { a, type B, default as C } from "./x"; の並びを [{ names, from }] にする
function readIndexExports() {
  const src = stripComments(read("ui/index.ts"));
  const out = [];
  for (const m of src.matchAll(/export\s*\{([^}]*)\}\s*from\s*"([^"]+)"/g)) {
    const names = m[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const isType = s.startsWith("type ");
        const body = isType ? s.slice(5).trim() : s;
        const parts = body.split(/\s+as\s+/);
        return {
          local: parts[0],
          name: parts[parts.length - 1],
          isType,
        };
      });
    out.push({ names, from: m[2] });
  }
  return out;
}

test("① ui/index.ts の export の一覧", () => {
  const names = readIndexExports()
    .flatMap((e) => e.names.map((n) => (n.isType ? `type ${n.name}` : n.name)))
    .sort();
  assert.deepEqual(names, [
    "BIG_BUTTON_DEFAULT_SIZE",
    "BigButton",
    "Confetti",
    "LONG_PRESS_MS",
    "PIYO_UI_TOKEN_KEYS",
    "PiyoUiProvider",
    "ProgressStar",
    "SHOW_TOWN",
    "TOWN_LINK_HEIGHT",
    "TOWN_URL",
    "TownLink",
    "type BigButtonSize",
    "type PiyoUiTokens",
    "type ProgressStarVariant",
    "type StarState",
    "useLongPress",
    "usePiyoUiTokens",
  ]);
});

const uiFiles = readdirSync(uiDir);

test("② index.ts の import 先は大文字小文字まで同じ名前で ui/ にある", () => {
  const froms = readIndexExports().map((e) => e.from);
  assert.ok(froms.length > 0, "index.ts に export … from が無い");
  for (const from of froms) {
    const base = from.replace(/^\.\//, "");
    const hits = uiFiles.filter(
      (f) => f === `${base}.ts` || f === `${base}.tsx`,
    );
    assert.equal(
      hits.length,
      1,
      `${from} に当たるファイルが ${hits.length} 個`,
    );
  }
});

test("③ ui/ に大文字小文字だけ違うファイル名の組が無い", () => {
  assert.ok(uiFiles.length > 0, "ui/ が空");
  const stem = (f) => f.replace(/\.(tsx?)$/, "").toLowerCase();
  const seen = new Map();
  for (const f of uiFiles) {
    const key = stem(f);
    assert.ok(
      !seen.has(key),
      `${seen.get(key)} と ${f} が大文字小文字だけ違う`,
    );
    seen.set(key, f);
  }
});

test("④ .ts から出す値は、その module から実際に読める", async () => {
  let checked = 0;
  for (const { names, from } of readIndexExports()) {
    const file = `${from.replace(/^\.\//, "")}.ts`;
    if (!uiFiles.includes(file)) continue; // .tsx は Node で読めない
    if (/from\s*"\.\//.test(stripComments(read(`ui/${file}`)))) continue; // 拡張子なしの相対 import
    const mod = await import(new URL(file, uiDir));
    for (const n of names) {
      if (n.isType) continue;
      assert.ok(n.local in mod, `${file} に ${n.local} が無い`);
      checked++;
    }
  }
  assert.ok(checked > 0, "読めた値が 0 個");
});

test("⑤ 部品が require する svg はパッケージに入る（svg/ に実在・files に svg と ui）", () => {
  const svgFiles = readdirSync(new URL("svg/", root));
  const tsx = uiFiles.filter((f) => f.endsWith(".tsx"));
  assert.ok(tsx.length > 0, "ui/ に .tsx が無い");
  const required = [];
  for (const f of tsx) {
    const src = stripComments(read(`ui/${f}`));
    for (const m of src.matchAll(/require\("\.\.\/svg\/([^"]+)"\)/g)) {
      required.push(m[1]);
    }
  }
  assert.deepEqual(required.sort(), ["hoshi.svg", "ki.svg"]);
  for (const name of required) {
    assert.ok(
      svgFiles.includes(name),
      `svg/${name} が無い（綴りの違いも含む）`,
    );
  }
  const pkg = JSON.parse(read("package.json"));
  assert.ok(pkg.files.includes("svg"), "files に svg が無い");
  assert.ok(pkg.files.includes("ui"), "files に ui が無い");
});

test("⑥ exports の ./ui は ui/index.ts、svg/ は exports に無い", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.exports["./ui"], "./ui/index.ts");
  const svgKeys = Object.entries(pkg.exports).filter(
    ([key, target]) =>
      key.startsWith("./svg") || String(target).includes("svg"),
  );
  assert.deepEqual(svgKeys, [], "exports に svg がある");
});

test("⑦ ui/index.ts の export は export { … } from の形だけ", () => {
  const src = stripComments(read("ui/index.ts"));
  assert.ok(/export\s*\{/.test(src), "index.ts に export { … } from が無い");
  const rest = src.replace(/export\s*\{[^}]*\}\s*from\s*"[^"]+"\s*;?/g, "");
  assert.doesNotMatch(
    rest,
    /\bexport\b/,
    "export { … } from 以外の export 文がある",
  );
});

test('⑧ .tsx の既定値: Confetti の count 18・TOWN_URL "/"・TOWN_LINK_HEIGHT 44', () => {
  const pick = (file, re) => {
    const hits = [...stripComments(read(file)).matchAll(re)];
    assert.equal(hits.length, 1, `${file} に ${re} が ${hits.length} 個`);
    return hits[0][1];
  };
  assert.equal(
    pick(
      "ui/Confetti.tsx",
      /export default function Confetti\(\{\s*count = ([^,}\s]+)\s*\}/g,
    ),
    "18",
  );
  assert.equal(
    pick("ui/TownLink.tsx", /export const TOWN_URL = "([^"]*)"/g),
    "/",
  );
  assert.equal(
    pick("ui/TownLink.tsx", /export const TOWN_LINK_HEIGHT = ([^;\s]+);/g),
    "44",
  );
});
