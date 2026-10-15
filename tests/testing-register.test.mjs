// testing/register.mjs（知育アプリの node --test の読み込みのひな形）が、アプリの src を Node で読めるようにする
// 仕組みを 1 つずつ確かめる。ひな形が黙って壊れると、アプリのテストが「たまたま」読めているのか分からなくなる。
// 防ぎたい事故:
//   - 型だけの import（`import { Shape } from "./types"`）が残って「export が無い」で落ちる・JSX を読めない
//   - 拡張子なしの相対 import・JSON の import（CJS の require も）・画像と音声の require が解決できない
//   - 綴り違いの素材の require が、値を返して素通りする（元の 3 本は MODULE_NOT_FOUND で止まっていた）
//   - 素材を ESM の import で書いたときに、何を直せばよいか分からない例外で落ちる
//   - react-native・expo を本物のまま読みにいく（Node では読めない）・差し替えの無い react-native-*・expo-* を
//     黙って読む（StatusBar しか無い stub に向けると「export が無い」で落ち、何が足りないか分からない）
//   - 共有パッケージ（node_modules/@kerokero-1245/piyo-assets）の .ts を変換しない
//     （Node は node_modules の中の .ts の型を除去しない: ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING）
//   - 構文エラーのファイルを黙って壊れた JS にする・どの行か分からない
//   - 分岐の取り違え（拡張子の候補の順・`#` の落とし・JSON の import 属性・二重の登録・入れ子の node_modules の判定・
//     前方一致の長さの順・typescript を root から探す順）が、ほかのケースでは green のまま入る
//
// 作り: 一時ディレクトリに偽のアプリ（src の .ts・.tsx・JSON・svg、偽の react/jsx-runtime、偽の共有パッケージ）を書き、
// 子プロセスの `node --import <偽アプリの tests/register.mjs>` で読ませて、結果を JSON で受け取る
// （フックは登録したプロセス全体に効くので、このテストのプロセスには登録しない）。
// 同じ register で読む確認は 1 つの子プロセスにまとめる（runEach）。子プロセスは 60 秒で打ち切る。
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = fileURLToPath(new URL("../", import.meta.url));
const TEMPLATE = new URL("../testing/register.mjs", import.meta.url).href;
const STUB_RN = new URL("../testing/stubs/react-native.ts", import.meta.url)
  .href;
// macOS の一時ディレクトリは symlink の先にある。Node は実体のパスで読むので、実体のパスで比べる
const APP = realpathSync(
  mkdtempSync(path.join(tmpdir(), "piyo-testing-register-")),
);
// typescript の入っていない別のアプリ（root から探して見つからないときに、ひな形の場所から探す経路を見る）
const APP_NO_TS = realpathSync(
  mkdtempSync(path.join(tmpdir(), "piyo-testing-register-no-ts-")),
);
after(() => {
  rmSync(APP, { recursive: true, force: true });
  rmSync(APP_NO_TS, { recursive: true, force: true });
});
// このリポジトリの devDependencies の typescript（偽のアプリの typescript はこれを読んで印を付ける）
const REAL_TYPESCRIPT = createRequire(import.meta.url).resolve("typescript");

function put(rel, text) {
  const file = path.join(APP, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
  return file;
}

// ── 偽のアプリ ──────────────────────────────────────────────
put("package.json", '{ "name": "fake-app", "private": true }\n');
put("src/types.ts", "export interface Shape { sides: number }\n");
put(
  "src/shape.ts",
  // `type` の付かない型だけの import（Node の型除去だけでは「export が無い」で落ちる）
  'import { Shape } from "./types";\nexport const sides = (s: Shape): number => s.sides;\n',
);
put("src/view.tsx", 'export const element = <span id="hello">ぴよ</span>;\n');
put("src/pick.ts", 'export const from: string = "file";\n');
put("src/pick/index.ts", 'export const from: string = "directory";\n');
put("src/lib/index.ts", 'export const from: string = "directory index";\n');
put("src/data.json", '{ "answer": 42 }\n');
put("src/proto.json", '{ "__proto__": { "x": 1 }, "a": 2 }\n');
put("src/json.ts", 'import data from "./data.json";\nexport { data };\n');
put("assets/piyo.svg", "<svg/>\n");
put(
  "src/art.ts",
  'export const piyo: unknown = require("../assets/piyo.svg");\n',
);
put(
  "src/missingArt.ts",
  // 綴り違い（piyo.svg を piy.svg と書いた）
  'export const piyo: unknown = require("../assets/piy.svg");\n',
);
put(
  "src/importArt.ts",
  'import piyo from "../assets/piyo.svg";\nexport { piyo };\n',
);
put("src/both.ts", 'export const from: string = "ts";\n');
put("src/both.tsx", 'export const from: string = "tsx";\n');
put("src/comp/index.tsx", 'export const from: string = "index.tsx";\n');
put("src/counter.ts", "let n = 0;\nexport const next = (): number => ++n;\n");
put("src/broken.ts", "export const x: number = ;\n");
put(
  "src/notAsset.ts",
  'export const load = (): unknown => require("node:fs");\n',
);
put(
  "src/native.ts",
  'import { Platform } from "react-native";\nimport { StatusBar } from "expo-status-bar";\nimport * as expo from "expo";\n' +
    "export const os: string = Platform.OS;\nexport const statusBar: unknown = StatusBar;\nexport const expoKeys: string[] = Object.keys(expo);\n",
);
put(
  "src/unstubbed.ts",
  'import web from "react-native-web";\nexport const value: unknown = web;\n',
);
put(
  "src/unstubbedExpo.ts",
  'import { Audio } from "expo-av";\nexport const value: unknown = Audio;\n',
);
put(
  "tests/stubs/expo-status-bar.ts",
  'export const StatusBar = (): string => "app stub";\n',
);
// アプリの stub が、ひな形の stub を export * で取り込んで名前を足す形
put(
  "tests/stubs/react-native.ts",
  `export * from ${JSON.stringify(STUB_RN)};\nexport const Linking = { openURL: (url: string): string => url };\n`,
);
// 偽の react/jsx-runtime（JSX の変換先。本物の react は入れない）
put(
  "node_modules/react/package.json",
  '{ "name": "react", "version": "0.0.0", "exports": { "./jsx-runtime": "./jsx-runtime.js" } }\n',
);
put(
  "node_modules/react/jsx-runtime.js",
  "exports.jsx = (type, props) => ({ type, props });\nexports.jsxs = exports.jsx;\n",
);
// 偽の共有パッケージ（.ts のまま配られる）と、比べるための別のパッケージ
put(
  "node_modules/@kerokero-1245/piyo-assets/shared.ts",
  'import { Shape } from "./types";\nexport const shared = (s: Shape): string => `shared:${s.sides}`;\n',
);
put(
  "node_modules/@kerokero-1245/piyo-assets/types.ts",
  "export interface Shape { sides: number }\n",
);
put(
  "node_modules/other-pkg/index.ts",
  "export const other = (n: number): number => n;\n",
);
// 入れ子の node_modules: 共有パッケージの下の別パッケージは変換しない・別パッケージの下の共有パッケージは変換する
put(
  "node_modules/@kerokero-1245/piyo-assets/node_modules/inner/index.ts",
  "export const inner = (n: number): number => n;\n",
);
put(
  "node_modules/other-pkg/node_modules/@kerokero-1245/piyo-assets/nested.ts",
  "export const nested = (n: number): string => `nested:${n}`;\n",
);
// 偽のアプリの typescript（本物を読み、読まれたことを印にする。root から探す経路を通ったかを見る）
put(
  "node_modules/typescript/package.json",
  '{ "name": "typescript", "version": "0.0.0", "main": "index.js" }\n',
);
put(
  "node_modules/typescript/index.js",
  `globalThis.__piyoAppTypescript = true;\nmodule.exports = require(${JSON.stringify(REAL_TYPESCRIPT)});\n`,
);
put("tests/prefix/expo-any.ts", 'export const which: string = "expo-*";\n');
put("tests/prefix/expo-av.ts", 'export const which: string = "expo-av*";\n');
writeFileSync(
  path.join(APP_NO_TS, "package.json"),
  '{ "name": "no-ts-app", "private": true }\n',
);

// アプリの tests/register.mjs（ひな形を読み、アプリ固有の差し替えだけを足す）
const REGISTER = put(
  "tests/register.mjs",
  `import { register } from ${JSON.stringify(TEMPLATE)};
register({
  root: new URL("../", import.meta.url),
  stubs: { "expo-status-bar": new URL("./stubs/expo-status-bar.ts", import.meta.url) },
});
`,
);
// 画像の require の値をアプリが決める版（差し替えは渡さない = ひな形の既定の stub だけ）
const REGISTER_ASSET = put(
  "tests/register-asset.mjs",
  `import path from "node:path";
import { register } from ${JSON.stringify(TEMPLATE)};
register({
  root: new URL("../", import.meta.url),
  asset: ({ specifier, file, root }) => ({ specifier, place: "/" + path.relative(root, file) }),
});
`,
);

// 差し替えを関数で決める版（名前ごとのファイルが無ければ止める）
const REGISTER_STUB_FN = put(
  "tests/register-stub-fn.mjs",
  `import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { register } from ${JSON.stringify(TEMPLATE)};
register({
  root: new URL("../", import.meta.url),
  stubs: {
    "react-native": new URL("./stubs/react-native.ts", import.meta.url),
    "expo-*": (name) => {
      const file = new URL("./stubs/" + name + ".ts", import.meta.url);
      if (!existsSync(fileURLToPath(file))) throw new Error("tests/stubs/" + name + ".ts がありません");
      return file;
    },
  },
});
`,
);

// 前方一致の名前を 2 つ渡す版（短い "expo-*" を先に書く。長い "expo-av*" が勝つ）
const REGISTER_PREFIX = put(
  "tests/register-prefix.mjs",
  `import { register } from ${JSON.stringify(TEMPLATE)};
register({
  root: new URL("../", import.meta.url),
  stubs: {
    "expo-*": new URL("./prefix/expo-any.ts", import.meta.url),
    "expo-av*": new URL("./prefix/expo-av.ts", import.meta.url),
  },
});
`,
);

// root に typescript の無い版（ひな形の場所の typescript を使う）
const REGISTER_NO_TS = put(
  "tests/register-no-ts.mjs",
  `import { register } from ${JSON.stringify(TEMPLATE)};
register({ root: ${JSON.stringify(pathToFileURL(APP_NO_TS + path.sep).href)} });
`,
);

// 子プロセスで bodies（async の関数の中身。値を return する）を順に走らせ、それぞれの戻り値か例外を受け取る
function runEach(bodies, register = REGISTER) {
  const entry = put(
    `tests/entry-${Math.random().toString(36).slice(2)}.mjs`,
    `const src = (rel) => new URL("../src/" + rel, import.meta.url).href;
const results = [];
${bodies
  .map(
    (body) => `try {
  const value = await (async () => { ${body} })();
  results.push({ ok: true, value });
} catch (error) {
  results.push({ ok: false, name: error?.name, code: error?.code, message: String(error?.message ?? error) });
}`,
  )
  .join("\n")}
process.stdout.write(JSON.stringify(results));
`,
  );
  const out = execFileSync(
    process.execPath,
    ["--import", pathToFileURL(register).href, entry],
    { cwd: APP, encoding: "utf8", timeout: 60_000 },
  );
  return JSON.parse(out);
}

const run = (body, register) => runEach([body], register)[0];

test("① .ts の変換: `type` の付かない型だけの import が消えて読める", () => {
  assert.deepEqual(
    run('return (await import(src("shape"))).sides({ sides: 3 });'),
    { ok: true, value: 3 },
  );
});

test("② .tsx の変換: JSX を react/jsx-runtime の呼び出しにする（react-jsx）", () => {
  assert.deepEqual(run('return (await import(src("view.tsx"))).element;'), {
    ok: true,
    value: { type: "span", props: { id: "hello", children: "ぴよ" } },
  });
});

test("③ 拡張子なしの相対 import の補完: 同名のファイルとディレクトリならファイル、.ts と .tsx なら .ts、ディレクトリなら index.ts か index.tsx", () => {
  assert.deepEqual(
    run(
      'return Promise.all(["pick", "lib", "both", "comp"].map(async (name) => (await import(src(name))).from));',
    ),
    { ok: true, value: ["file", "directory index", "ts", "index.tsx"] },
  );
});

// 属性つきの JSON の import は、ひな形が変換せず Node の読み方（format "json"）のまま通す。
// 値だけでは変換したかどうかが見分けられないので、ひな形の後に登録したフックで、ひな形が返した format を見る
const ATTRIBUTE_JSON = `const { registerHooks } = await import("node:module");
const formats = [];
registerHooks({
  load(url, context, next) {
    const result = next(url, context);
    if (url.includes("data.json?attribute")) formats.push(result.format);
    return result;
  },
});
const m = await import(src("data.json?attribute"), { with: { type: "json" } });
return [m.default, formats];`;

test("④ JSON の import を属性なしで読む。属性つきの import は Node の読み方のまま、CJS の require（createRequire）も読める", () => {
  assert.deepEqual(
    runEach([
      'return (await import(src("json"))).data;',
      ATTRIBUTE_JSON,
      'const { createRequire } = await import("node:module"); return createRequire(src("json.ts"))("./data.json");',
    ]),
    [
      { ok: true, value: { answer: 42 } },
      { ok: true, value: [{ answer: 42 }, ["json"]] },
      { ok: true, value: { answer: 42 } },
    ],
  );
});

test("④' JSON の __proto__ キーは自身のプロパティとして読む（プロトタイプに設定しない。Node の JSON.parse と同じ）", () => {
  assert.deepEqual(
    run(
      'const m = await import(src("proto.json")); return [Object.hasOwn(m.default, "__proto__"), Object.getPrototypeOf(m.default) === Object.prototype, m.default.a];',
    ),
    { ok: true, value: [true, true, 2] },
  );
});

test("⑤ 画像の require: 既定は素材ファイルの絶対パス（無い素材は MODULE_NOT_FOUND）、asset を渡せばその値（実在は見ない）", () => {
  const [found, missing] = runEach([
    'return (await import(src("art"))).piyo;',
    'return (await import(src("missingArt"))).piyo;',
  ]);
  assert.deepEqual(found, {
    ok: true,
    value: path.join(APP, "assets", "piyo.svg"),
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.code, "MODULE_NOT_FOUND");
  assert.match(missing.message, /\.\.\/assets\/piy\.svg/);
  assert.deepEqual(
    runEach(
      [
        'return (await import(src("art"))).piyo;',
        'return (await import(src("missingArt"))).piyo;',
      ],
      REGISTER_ASSET,
    ),
    [
      {
        ok: true,
        value: { specifier: "../assets/piyo.svg", place: "/assets/piyo.svg" },
      },
      {
        ok: true,
        value: { specifier: "../assets/piy.svg", place: "/assets/piy.svg" },
      },
    ],
  );
});

test("⑥ 素材ではない require は、黙って通さずに落ちる", () => {
  const result = run('return (await import(src("notAsset"))).load();');
  assert.equal(result.ok, false);
  assert.match(result.message, /素材ではないので/);
});

test("⑦ 差し替え: react-native・expo・expo-status-bar はひな形の stub、アプリが渡した名前はアプリの stub、ほかの expo-* は止まる", () => {
  const native =
    'const m = await import(src("native")); return [m.os, m.statusBar(), m.expoKeys];';
  assert.deepEqual(runEach([native, 'return await import("expo-av");']), [
    { ok: true, value: ["web", "app stub", ["StatusBar"]] },
    {
      ok: false,
      name: "Error",
      message:
        'piyo-assets/testing: "expo-av" の差し替えがありません。register({ stubs: { "expo-av": … } }) で渡す（"expo-*" で前方一致にもできる）',
    },
  ]);
  // アプリが何も渡さなければ expo-status-bar もひな形の stub（StatusBar は何も描かない）
  const [defaults, unstubbed] = runEach(
    [
      'const m = await import(src("native")); return [m.os, m.statusBar(), m.expoKeys];',
      'return (await import(src("unstubbedExpo"))).value;',
    ],
    REGISTER_ASSET,
  );
  assert.deepEqual(defaults, { ok: true, value: ["web", null, ["StatusBar"]] });
  assert.equal(unstubbed.ok, false);
  assert.match(unstubbed.message, /"expo-av" の差し替えがありません/);
});

test("⑧ 差し替えを関数で渡すと、import の名前ごとにファイルを選べ、無ければ止められる。アプリの stub はひな形の stub を export * で取り込める", () => {
  const [statusBar, missing, rn] = runEach(
    [
      'return (await import("expo-status-bar")).StatusBar();',
      'return await import("expo-av");',
      'const m = await import("react-native"); return [m.Platform.OS, m.Linking.openURL("/"), typeof m.View, m.StyleSheet.create({ a: 1 })];',
    ],
    REGISTER_STUB_FN,
  );
  assert.deepEqual(statusBar, { ok: true, value: "app stub" });
  assert.equal(missing.ok, false);
  assert.match(missing.message, /tests\/stubs\/expo-av\.ts がありません/);
  assert.deepEqual(rn, { ok: true, value: ["web", "/", "function", { a: 1 }] });
});

test("⑨ 差し替えの無い react-native-* は、本物を読まずに分かる形で落ちる", () => {
  const result = run('return (await import(src("unstubbed"))).value;');
  assert.equal(result.ok, false);
  assert.match(result.message, /差し替えがありません/);
});

test("⑩ 共有パッケージ（node_modules/@kerokero-1245/piyo-assets）の .ts は変換し、ほかの node_modules の .ts は変換しない（入れ子は一番内側の node_modules で決める）", () => {
  const nm = (rel) =>
    `return (await import(new URL("../node_modules/${rel}", import.meta.url).href))`;
  const [shared, other, inner, nested] = runEach([
    `${nm("@kerokero-1245/piyo-assets/shared.ts")}.shared({ sides: 4 });`,
    `${nm("other-pkg/index.ts")}.other(1);`,
    `${nm("@kerokero-1245/piyo-assets/node_modules/inner/index.ts")}.inner(1);`,
    `${nm("other-pkg/node_modules/@kerokero-1245/piyo-assets/nested.ts")}.nested(5);`,
  ]);
  assert.deepEqual(shared, { ok: true, value: "shared:4" });
  assert.equal(other.ok, false);
  assert.equal(other.code, "ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING");
  assert.equal(inner.ok, false, "共有パッケージの下の別パッケージは変換しない");
  assert.equal(inner.code, "ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING");
  assert.deepEqual(
    nested,
    { ok: true, value: "nested:5" },
    "別パッケージの下の共有パッケージは変換する",
  );
});

test("⑪ 問い合わせ（?n=1）・`#` が違えば別のモジュール、同じなら同じ実体", () => {
  assert.deepEqual(
    runEach([
      'const a = await import(src("counter?n=1")); const b = await import(src("counter?n=1")); const c = await import(src("counter?n=2")); return [a.next(), b.next(), c.next()];',
      'const a = await import(src("counter#a")); const b = await import(src("counter#a")); const c = await import(src("counter#b")); return [a.next(), b.next(), c.next()];',
    ]),
    [
      { ok: true, value: [1, 2, 1] },
      { ok: true, value: [1, 2, 1] },
    ],
  );
});

test("⑫ 構文エラーのファイルは SyntaxError で止まり、ファイル名・行・桁・TS の番号が出る", () => {
  const result = run('return (await import(src("broken"))).x;');
  assert.equal(result.ok, false);
  assert.equal(result.name, "SyntaxError");
  assert.match(result.message, /src\/broken\.ts\(1,26\): error TS1109: /);
});

test("⑬ ひな形を通すと、パッケージの STICKER_MARK は svg/hoshi.svg の画像の mark になる", () => {
  const sticker = pathToFileURL(
    path.join(REPO, "ui", "ProgressStarSticker.ts"),
  ).href;
  assert.deepEqual(
    run(
      `const { STICKER_MARK } = await import(${JSON.stringify(sticker)}); return [STICKER_MARK, Object.isFrozen(STICKER_MARK)];`,
    ),
    {
      ok: true,
      value: [
        { kind: "image", source: path.join(REPO, "svg", "hoshi.svg") },
        true,
      ],
    },
  );
});

test("⑭ 素材を ESM の import で読むと、require に書き換える案内つきで止まる", () => {
  const result = run('return (await import(src("importArt"))).piyo;');
  assert.equal(result.ok, false);
  assert.equal(result.code, "ERR_UNKNOWN_FILE_EXTENSION");
  assert.match(result.message, /assets\/piyo\.svg/);
  assert.match(result.message, /require\("…"\) で書く/);
});

test("⑮ register() は 1 回だけ（2 回目は例外）", () => {
  const result = run(
    `const { register } = await import(${JSON.stringify(TEMPLATE)}); register(); return "registered twice";`,
  );
  assert.equal(result.ok, false);
  assert.match(result.message, /register\(\) は 1 回だけ呼ぶ/);
});

test("⑯ 前方一致の差し替えは、書いた順ではなく長い名前が先（expo-av* が expo-* に勝つ）", () => {
  assert.deepEqual(
    runEach(
      [
        'return (await import("expo-av")).which;',
        'return (await import("expo-haptics")).which;',
      ],
      REGISTER_PREFIX,
    ),
    [
      { ok: true, value: "expo-av*" },
      { ok: true, value: "expo-*" },
    ],
  );
});

test("⑰ typescript は root（アプリ）の node_modules から探し、無ければひな形の場所から探す", () => {
  assert.deepEqual(
    run(
      'const m = await import(src("shape")); return [m.sides({ sides: 5 }), globalThis.__piyoAppTypescript === true];',
    ),
    { ok: true, value: [5, true] },
  );
  assert.deepEqual(
    run(
      'const m = await import(src("shape")); return [m.sides({ sides: 6 }), globalThis.__piyoAppTypescript === true];',
      REGISTER_NO_TS,
    ),
    { ok: true, value: [6, false] },
  );
});
