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
//   - 1 つの部品を import しただけで、使わない部品の絵まで書き出される（Metro は import した module が
//     require する絵をすべて書き出す。まとめての入口 ui/index.ts から Confetti だけを読んでも ki.svg・hoshi.svg が
//     入り、ProgressStar.tsx が hoshi.svg を require していたときは、文字の ⭐ で出すアプリにも hoshi.svg が入った）
//   - 部品ごとの入口が欠ける・指す先が無い・files に入らない（使う側の import が解決できない）
//   - peerDependencies の react・react-native が optional でない（npm 7+ は peer を自動で入れるので、
//     静的サイトのランドが devDependencies で取り込んだら lock が 82→293 項目に膨らんだ）
// index.ts は .tsx を読み込むので Node では import できない。ソースからコメントを除いて export の文を読む。
//
// 見るもの:
//   ① ui/index.ts の export の名前の一覧
//   ② index.ts の from "./X" はすべて ui/ に大文字小文字まで同じ名前の .ts か .tsx がある
//   ③ ui/ のファイル名に、大文字小文字だけ違う組が無い（ui/ を列挙。0 件なら失敗）
//   ④ .ts の値の export は、その module から実際に読める（.tsx と、拡張子なしの相対 import を持つ .ts は
//      Node で読めないので除く。除いたものは名前の一覧 ① と tsc が見る）
//   ⑤ ui/ の require("../svg/…") は TownLink.tsx の ki.svg と ProgressStarSticker.ts の hoshi.svg だけで、
//      svg/ に同じ綴りで実在し、package.json の files に svg と ui がある
//   ⑥ exports の "./ui" は ui/index.ts で、svg/ は exports に出さない（部品が相対で読むだけ。公開 API にしない）
//   ⑦ ui/index.ts の export は `export { … } from "…"` の形だけ（`export *`・`export const` などは失敗）
//   ⑧ .tsx の既定値: Confetti の count 18、TOWN_URL "/"、TOWN_LINK_HEIGHT 44（ソースの文を読む）
//   ⑨ peerDependencies の全キーが peerDependenciesMeta で optional: true（キーは peerDependencies から列挙。0 件なら失敗）
//   ⑩ 部品ごとの入口: exports の "./ui/<名前>" は ui/<名前>.ts か .tsx を指して実在し、files の ui に含まれる。
//      ui/ の .tsx（部品）はすべて入口を持つ（入口も .tsx も package.json と ui/ から列挙。0 件なら失敗）
//   ⑪ まとめての入口の名前は、どれもいずれかの部品ごとの入口からも読める（入口を替えても名前が欠けない）
//   ⑫ 部品ごとの入口が（相対の import をたどって）require する絵は、TownLink の ki.svg と
//      ProgressStarSticker の hoshi.svg だけ（ProgressStar・Confetti などは絵を読まない）
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
    "EMOJI_MARK",
    "LONG_PRESS_MS",
    "PIYO_UI_TOKEN_KEYS",
    "PiyoUiProvider",
    "ProgressStar",
    "SHOW_TOWN",
    "STICKER_MARK",
    "TOWN_LINK_HEIGHT",
    "TOWN_URL",
    "TownLink",
    "type BigButtonSize",
    "type PiyoUiTokens",
    "type ProgressStarMark",
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

// ui/<file> が require("../svg/…") で読む絵の名前
const svgRequires = (file) =>
  [
    ...stripComments(read(`ui/${file}`)).matchAll(
      /require\("\.\.\/svg\/([^"]+)"\)/g,
    ),
  ].map((m) => m[1]);

test("⑤ 部品が require する svg はパッケージに入る（svg/ に実在・files に svg と ui）", () => {
  const svgFiles = readdirSync(new URL("svg/", root));
  const sources = uiFiles.filter((f) => /\.tsx?$/.test(f));
  assert.ok(sources.length > 0, "ui/ に .ts・.tsx が無い");
  const byFile = {};
  for (const f of sources) {
    const names = svgRequires(f);
    if (names.length > 0) byFile[f] = names;
  }
  assert.deepEqual(byFile, {
    "ProgressStarSticker.ts": ["hoshi.svg"],
    "TownLink.tsx": ["ki.svg"],
  });
  const required = Object.values(byFile).flat();
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
      /export function Confetti\(\{\s*count = ([^,}\s]+)\s*\}/g,
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

test("⑨ peerDependencies の react・react-native は peerDependenciesMeta で optional（静的サイトが取り込むときに npm が入れない）", () => {
  const pkg = JSON.parse(read("package.json"));
  const peers = Object.keys(pkg.peerDependencies ?? {});
  assert.ok(peers.length > 0, "peerDependencies が 0 件");
  const meta = pkg.peerDependenciesMeta ?? {};
  const notOptional = peers.filter((key) => meta[key]?.optional !== true);
  assert.deepEqual(
    notOptional,
    [],
    "peerDependenciesMeta で optional: true になっていない peer がある",
  );
});

// 部品ごとの入口（exports の "./ui/<名前>"）を [{ key, target, file }] で列挙する
function partEntries() {
  const pkg = JSON.parse(read("package.json"));
  return Object.entries(pkg.exports)
    .filter(([key]) => key.startsWith("./ui/"))
    .map(([key, target]) => ({
      key,
      target,
      file: String(target).replace(/^\.\/ui\//, ""),
    }));
}

// ui/<file> が外へ出す名前（export function・const・interface・type、export { … }（from の有無を問わず））
function exportedNames(file) {
  const src = stripComments(read(`ui/${file}`));
  const names = new Set();
  for (const m of src.matchAll(
    /export\s+(?:async\s+)?(?:function|const|let|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g,
  )) {
    names.add(m[1]);
  }
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(",")) {
      const body = part.trim().replace(/^type\s+/, "");
      if (!body) continue;
      const pieces = body.split(/\s+as\s+/);
      names.add(pieces[pieces.length - 1]);
    }
  }
  return names;
}

test("⑩ 部品ごとの入口は ui/ の実在するファイルを指し、files の ui に含まれ、部品（.tsx）はすべて入口を持つ", () => {
  const entries = partEntries();
  assert.ok(entries.length > 0, "部品ごとの入口が 0 件");
  const pkg = JSON.parse(read("package.json"));
  assert.ok(pkg.files.includes("ui"), "files に ui が無い");
  for (const { key, target, file } of entries) {
    assert.match(
      String(target),
      /^\.\/ui\/[^/]+\.tsx?$/,
      `${key} の指す先 ${target} が ui/ の直下の .ts・.tsx ではない`,
    );
    assert.ok(uiFiles.includes(file), `${key} の指す先 ${target} が無い`);
    assert.equal(
      key,
      `./ui/${file.replace(/\.tsx?$/, "")}`,
      `${key} とファイル名 ${file} が違う`,
    );
  }
  const parts = uiFiles.filter((f) => f.endsWith(".tsx"));
  assert.ok(parts.length > 0, "ui/ に .tsx が無い");
  const targets = new Set(entries.map((e) => e.file));
  const missing = parts.filter((f) => !targets.has(f));
  assert.deepEqual(missing, [], "入口の無い部品がある");
});

test("⑪ まとめての入口の名前は、どれも部品ごとの入口のどれかから読める", () => {
  const fromEntries = new Set(
    partEntries().flatMap(({ file }) => [...exportedNames(file)]),
  );
  const barrel = readIndexExports().flatMap((e) => e.names.map((n) => n.name));
  assert.ok(barrel.length > 0, "まとめての入口の名前が 0 個");
  const missing = barrel.filter((name) => !fromEntries.has(name));
  assert.deepEqual(missing, [], "部品ごとの入口から読めない名前がある");
});

// ui/<file> から相対の import（import type は除く）をたどった先までに require される絵
function svgClosure(file, seen = new Set()) {
  if (seen.has(file)) return [];
  seen.add(file);
  const src = stripComments(read(`ui/${file}`));
  const out = [...svgRequires(file)];
  for (const m of src.matchAll(
    /(?:^|\n)\s*(import|export)\s+(type\s+)?[^;]*?from\s*"\.\/([^"]+)"/g,
  )) {
    if (m[2]) continue; // import type・export type は書き出しに入らない
    const next = uiFiles.find((f) => f === `${m[3]}.ts` || f === `${m[3]}.tsx`);
    assert.ok(next, `ui/${file} の "./${m[3]}" に当たるファイルが無い`);
    out.push(...svgClosure(next, seen));
  }
  return [...new Set(out)].sort();
}

test("⑫ 部品ごとの入口が読む絵は TownLink の ki.svg と ProgressStarSticker の hoshi.svg だけ", () => {
  const entries = partEntries();
  assert.ok(entries.length > 0, "部品ごとの入口が 0 件");
  const withSvg = {};
  for (const { key, file } of entries) {
    const svgs = svgClosure(file);
    if (svgs.length > 0) withSvg[key] = svgs;
  }
  assert.deepEqual(withSvg, {
    "./ui/ProgressStarSticker": ["hoshi.svg"],
    "./ui/TownLink": ["ki.svg"],
  });
  // まとめての入口は全部の絵を読む（互換のために残している既知の挙動）。たどる仕組みが働いていることの確認
  assert.deepEqual(svgClosure("index.ts"), ["hoshi.svg", "ki.svg"]);
});
