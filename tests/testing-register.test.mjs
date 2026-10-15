// testing/register.mjs（知育アプリの node --test の読み込みのひな形）が、アプリの src を Node で読めるようにする
// 仕組みを 1 つずつ確かめる。ひな形が黙って壊れると、アプリのテストが「たまたま」読めているのか分からなくなる。
// 防ぎたい事故:
//   - 型だけの import（`import { Shape } from "./types"`）が残って「export が無い」で落ちる・JSX を読めない
//   - 拡張子なしの相対 import・JSON の import・画像と音声の require が解決できない
//   - react-native・expo を本物のまま読みにいく（Node では読めない）・差し替えの無い react-native-* を黙って読む
//   - 共有パッケージ（node_modules/@kerokero-1245/piyo-assets）の .ts を変換しない
//     （Node は node_modules の中の .ts の型を除去しない: ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING）
//   - 構文エラーのファイルを黙って壊れた JS にする
//
// 作り: 一時ディレクトリに偽のアプリ（src の .ts・.tsx・JSON・svg、偽の react/jsx-runtime、偽の共有パッケージ）を書き、
// 子プロセスの `node --import <偽アプリの tests/register.mjs>` で読ませて、結果を JSON で受け取る
// （フックは登録したプロセス全体に効くので、このテストのプロセスには登録しない）。
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = fileURLToPath(new URL("../", import.meta.url));
const TEMPLATE = new URL("../testing/register.mjs", import.meta.url).href;
// macOS の一時ディレクトリは symlink の先にある。Node は実体のパスで読むので、実体のパスで比べる
const APP = realpathSync(
  mkdtempSync(path.join(tmpdir(), "piyo-testing-register-")),
);
after(() => rmSync(APP, { recursive: true, force: true }));

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
put("src/json.ts", 'import data from "./data.json";\nexport { data };\n');
put("assets/piyo.svg", "<svg/>\n");
put(
  "src/art.ts",
  'export const piyo: unknown = require("../assets/piyo.svg");\n',
);
put("src/counter.ts", "let n = 0;\nexport const next = (): number => ++n;\n");
put("src/broken.ts", "export const x: number = ;\n");
put(
  "src/notAsset.ts",
  'export const load = (): unknown => require("node:fs");\n',
);
put(
  "src/native.ts",
  'import { Platform } from "react-native";\nimport { StatusBar } from "expo-status-bar";\nimport * as constants from "expo-constants";\n' +
    "export const os: string = Platform.OS;\nexport const statusBar: unknown = StatusBar;\nexport const constantsKeys: string[] = Object.keys(constants);\n",
);
put(
  "src/unstubbed.ts",
  'import web from "react-native-web";\nexport const value: unknown = web;\n',
);
put(
  "tests/stubs/expo-status-bar.ts",
  'export const StatusBar = (): string => "app stub";\n',
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
// 画像の require の値をアプリが決める版
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
    "expo-*": (name) => {
      const file = new URL("./stubs/" + name + ".ts", import.meta.url);
      if (!existsSync(fileURLToPath(file))) throw new Error("tests/stubs/" + name + ".ts がありません");
      return file;
    },
  },
});
`,
);

// 子プロセスで body（async の関数の中身。値を return する）を走らせ、戻り値か例外を受け取る
function run(body, register = REGISTER) {
  const entry = put(
    `tests/entry-${Math.random().toString(36).slice(2)}.mjs`,
    `const src = (rel) => new URL("../src/" + rel, import.meta.url).href;
try {
  const value = await (async () => { ${body} })();
  process.stdout.write(JSON.stringify({ ok: true, value }));
} catch (error) {
  process.stdout.write(JSON.stringify({ ok: false, name: error?.name, code: error?.code, message: String(error?.message ?? error) }));
}
`,
  );
  const out = execFileSync(
    process.execPath,
    ["--import", pathToFileURL(register).href, entry],
    { cwd: APP, encoding: "utf8" },
  );
  return JSON.parse(out);
}

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

test("③ 拡張子なしの相対 import の補完: 同名のファイルとディレクトリならファイル、ディレクトリなら index.ts", () => {
  assert.deepEqual(
    run(
      'return [(await import(src("pick"))).from, (await import(src("lib"))).from];',
    ),
    { ok: true, value: ["file", "directory index"] },
  );
});

test("④ JSON の import を属性なしで読む", () => {
  assert.deepEqual(run('return (await import(src("json"))).data;'), {
    ok: true,
    value: { answer: 42 },
  });
});

test("⑤ 画像の require: 既定は素材ファイルの絶対パス、asset を渡せばその値", () => {
  assert.deepEqual(run('return (await import(src("art"))).piyo;'), {
    ok: true,
    value: path.join(APP, "assets", "piyo.svg"),
  });
  assert.deepEqual(
    run('return (await import(src("art"))).piyo;', REGISTER_ASSET),
    {
      ok: true,
      value: { specifier: "../assets/piyo.svg", place: "/assets/piyo.svg" },
    },
  );
});

test("⑥ 素材ではない require は、黙って通さずに落ちる", () => {
  const result = run('return (await import(src("notAsset"))).load();');
  assert.equal(result.ok, false);
  assert.match(result.message, /素材ではないので/);
});

test("⑦ 差し替え: react-native と expo-* はひな形の stub、アプリが渡した名前はアプリの stub", () => {
  assert.deepEqual(
    run(
      'const m = await import(src("native")); return [m.os, m.statusBar(), m.constantsKeys];',
    ),
    {
      ok: true,
      value: ["web", "app stub", ["StatusBar"]],
    },
  );
});

test("⑧ 差し替えを関数で渡すと、import の名前ごとにファイルを選べ、無ければ止められる", () => {
  assert.deepEqual(
    run(
      'return (await import("expo-status-bar")).StatusBar();',
      REGISTER_STUB_FN,
    ),
    { ok: true, value: "app stub" },
  );
  const missing = run('return await import("expo-av");', REGISTER_STUB_FN);
  assert.equal(missing.ok, false);
  assert.match(missing.message, /tests\/stubs\/expo-av\.ts がありません/);
});

test("⑨ 差し替えの無い react-native-* は、本物を読まずに分かる形で落ちる", () => {
  const result = run('return (await import(src("unstubbed"))).value;');
  assert.equal(result.ok, false);
  assert.match(result.message, /差し替えがありません/);
});

test("⑩ 共有パッケージ（node_modules/@kerokero-1245/piyo-assets）の .ts は変換し、ほかの node_modules の .ts は変換しない", () => {
  assert.deepEqual(
    run(
      'return (await import(new URL("../node_modules/@kerokero-1245/piyo-assets/shared.ts", import.meta.url).href)).shared({ sides: 4 });',
    ),
    { ok: true, value: "shared:4" },
  );
  const other = run(
    'return (await import(new URL("../node_modules/other-pkg/index.ts", import.meta.url).href)).other(1);',
  );
  assert.equal(other.ok, false);
  assert.equal(other.code, "ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING");
});

test("⑪ 問い合わせ（?n=1）が違えば別のモジュール、同じなら同じ実体", () => {
  assert.deepEqual(
    run(
      'const a = await import(src("counter?n=1")); const b = await import(src("counter?n=1")); const c = await import(src("counter?n=2")); return [a.next(), b.next(), c.next()];',
    ),
    { ok: true, value: [1, 2, 1] },
  );
});

test("⑫ 構文エラーのファイルは SyntaxError で止まり、ファイル名が出る", () => {
  const result = run('return (await import(src("broken"))).x;');
  assert.equal(result.ok, false);
  assert.equal(result.name, "SyntaxError");
  assert.match(result.message, /broken\.ts/);
});

test("⑬ ひな形を通すと、パッケージの STICKER_MARK は svg/hoshi.svg の画像の mark になる", () => {
  const sticker = pathToFileURL(
    path.join(REPO, "ui", "ProgressStarSticker.ts"),
  ).href;
  assert.deepEqual(
    run(`return (await import(${JSON.stringify(sticker)})).STICKER_MARK;`),
    {
      ok: true,
      value: { kind: "image", source: path.join(REPO, "svg", "hoshi.svg") },
    },
  );
});
