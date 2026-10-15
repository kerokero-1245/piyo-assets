// 知育アプリの `node --test` の読み込みのひな形。アプリの tests/register.mjs（`--import ./tests/register.mjs`）が
// これを読み、アプリ固有の差し替えだけを渡して register() を 1 回呼ぶ。
//
//   import { register } from "@kerokero-1245/piyo-assets/testing/register";
//   register({ root: new URL("../", import.meta.url) });
//
// アプリの src は Metro / Expo の書き方のままで、Node にはそのまま読ませられない。次をここで肩代わりする。
//   1. .ts / .tsx の変換 … アプリの devDependencies の typescript の transpileModule（jsx は react-jsx）。
//      `type` の付かない型だけの import は Node の型除去だと「export が無い」で落ちるので、変換で消す。
//      変換するのは node_modules の外のファイルと、共有パッケージ（node_modules/@kerokero-1245/piyo-assets）。
//      Node は node_modules の中の .ts の型を除去しない（ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING）ので、
//      .ts のまま配る共有パッケージはここで変換する。ほかのパッケージには触れない。
//   2. 拡張子なしの相対 import（"./maze"）… .ts・.tsx・index.ts・index.tsx を探して補う（ファイルを先に探す）。
//      `?fresh=1` のような問い合わせは残す（同じファイルを別のモジュールとして読み直すのに使う）。
//   3. JSON の import … import 属性（with { type: "json" }）無しで読む（CJS の require は Node の読み方のまま）。
//   4. 画像・音声の require("../assets/x.svg") … 構文木で見つけて、asset(info) の値に置き換える
//      （既定は素材ファイルの絶対パスの文字列で、ファイルが無ければ MODULE_NOT_FOUND で止める）。
//      素材ではない require と、素材を ESM の import で読んだものは、直し方の分かる形で落とす。
//   5. react-native・expo・expo-status-bar … testing/stubs/ の差し替え（アプリは stubs で名前ごとに上書き・追加できる）。
//      差し替えの無い react-native-*・expo-*（expo-av など）は、本物を黙って読まずに落とす。
// typescript はこのパッケージの依存に入れない。呼ぶ側（root）の node_modules から読む。
// フックは同じスレッドで動く同期版（module.registerHooks。Node 22.15 以上）。

import { readFileSync, statSync } from "node:fs";
import * as nodeModule from "node:module";
import path from "node:path";
import process from "node:process";
import { URL, fileURLToPath, pathToFileURL } from "node:url";

const SOURCE_RE = /\.tsx?$/;
const ASSET_RE =
  /\.(?:svg|png|jpe?g|gif|webp|ico|m4a|mp3|wav|ogg|mp4|webm|ttf|otf)$/i;
const SHARED_PACKAGE = "@kerokero-1245/piyo-assets/";
const NODE_MODULES = `${path.sep}node_modules${path.sep}`;
const ASSET_FN = "__piyoAssetsTestingAsset";

// ひな形の差し替え（完全一致）。アプリが stubs に同じ名前を渡せば、そちらが勝つ。
// expo-* は expo-status-bar だけ（StatusBar しか置いていない stub に、ほかの expo-* を黙って向けない）。
const DEFAULT_STUBS = new Map([
  ["react-native", new URL("./stubs/react-native.ts", import.meta.url).href],
  ["expo", new URL("./stubs/expo.ts", import.meta.url).href],
  ["expo-status-bar", new URL("./stubs/expo.ts", import.meta.url).href],
]);
// 差し替えが無ければ止める名前（本物は Node で読めない）
const NEEDS_STUB_RE = /^(react-native|expo)([-/])/;

let registered = false;

// asset を渡さないときの素材の値: ファイルの絶対パス。無ければ、元の require と同じく MODULE_NOT_FOUND で止める
// （綴り違いの素材をテストで見つけられるように）
function existingAsset({ specifier, file }) {
  if (!isFile(file)) {
    const error = new Error(
      `piyo-assets/testing: 素材 "${specifier}" が見つからない（${file}）`,
    );
    error.code = "MODULE_NOT_FOUND";
    throw error;
  }
  return file;
}

// root・stubs に文字列のパスを渡したときは process.cwd() から解決する（URL を渡すのが既定）
const toPath = (value) =>
  value instanceof URL || String(value).startsWith("file:")
    ? fileURLToPath(value)
    : path.resolve(String(value));

const toHref = (value) => pathToFileURL(toPath(value)).href;

function isFile(file) {
  try {
    return statSync(file).isFile();
  } catch {
    return false;
  }
}

// 変換してよいファイル: node_modules の外か、共有パッケージの中（入れ子の node_modules は見ない）
function transformable(file) {
  const at = file.lastIndexOf(NODE_MODULES);
  if (at === -1) return true;
  const inside = file
    .slice(at + NODE_MODULES.length)
    .split(path.sep)
    .join("/");
  return inside.startsWith(SHARED_PACKAGE);
}

/**
 * @param {{
 *   root?: string | URL,
 *   stubs?: Record<string, string | URL | ((specifier: string) => string | URL)>,
 *   asset?: (info: { specifier: string, file: string, root: string }) => unknown,
 * }} [options]
 *   root  … アプリのルート（typescript を探す起点・asset に渡す）。既定は process.cwd()
 *   stubs … 名前 → 差し替えのファイル。"expo-*" のように末尾が * の名前は前方一致（完全一致が先、長い前方一致が先）。
 *           値に関数を渡すと、import の名前を受けてファイルを返す（無ければ例外を投げて止められる）
 *   root・stubs の値は URL（new URL("../", import.meta.url)）で渡す。文字列のパスは process.cwd() から解決する
 *   asset … 画像・音声の require の値。既定は素材ファイルの絶対パスの文字列（ファイルが無ければ MODULE_NOT_FOUND）。
 *           asset を渡したときは、ファイルの実在は見ない
 */
export function register(options = {}) {
  if (typeof nodeModule.registerHooks !== "function") {
    throw new Error(
      "piyo-assets/testing: module.registerHooks が無い。Node 22.15 以上で実行する",
    );
  }
  if (registered) {
    throw new Error("piyo-assets/testing: register() は 1 回だけ呼ぶ");
  }
  registered = true;

  const root = toPath(options.root ?? process.cwd());
  const asset = options.asset ?? existingAsset;
  const exact = new Map();
  const prefixes = [];
  for (const [name, target] of Object.entries(options.stubs ?? {})) {
    const href =
      typeof target === "function"
        ? (specifier) => toHref(target(specifier))
        : toHref(target);
    if (name.endsWith("*")) prefixes.push([name.slice(0, -1), href]);
    else exact.set(name, href);
  }
  prefixes.sort((a, b) => b[0].length - a[0].length);

  const hrefOf = (href, specifier) =>
    typeof href === "function" ? href(specifier) : href;

  function stubFor(specifier) {
    if (exact.has(specifier)) return hrefOf(exact.get(specifier), specifier);
    for (const [prefix, href] of prefixes) {
      if (specifier.startsWith(prefix)) return hrefOf(href, specifier);
    }
    return DEFAULT_STUBS.get(specifier) ?? null;
  }

  // typescript は最初の変換で読む（呼ぶ側の node_modules から。見つからなければこのファイルの場所から）
  let ts;
  function typescript() {
    if (ts) return ts;
    const from = [
      path.join(root, "package.json"),
      fileURLToPath(import.meta.url),
    ];
    for (const base of from) {
      try {
        ts = nodeModule.createRequire(base)("typescript");
        return ts;
      } catch {
        // 次の場所を探す
      }
    }
    throw new Error(
      `piyo-assets/testing: typescript が見つからない（${root} の devDependencies に入れる）`,
    );
  }

  // require("<素材>") → __piyoAssetsTestingAsset("<書いたとおり>", "<絶対パス>")
  const assetRequire = (tsc) => (context) => (sourceFile) => {
    const dir = path.dirname(sourceFile.fileName);
    const visit = (node) => {
      if (
        tsc.isCallExpression(node) &&
        tsc.isIdentifier(node.expression) &&
        node.expression.text === "require" &&
        node.arguments.length === 1 &&
        tsc.isStringLiteralLike(node.arguments[0]) &&
        ASSET_RE.test(node.arguments[0].text)
      ) {
        const specifier = node.arguments[0].text;
        return tsc.factory.createCallExpression(
          tsc.factory.createIdentifier(ASSET_FN),
          undefined,
          [
            tsc.factory.createStringLiteral(specifier),
            tsc.factory.createStringLiteral(path.resolve(dir, specifier)),
          ],
        );
      }
      return tsc.visitEachChild(node, visit, context);
    };
    return tsc.visitNode(sourceFile, visit);
  };

  // 同じファイルを ?query 違いで何度も読み直すので、変換の結果は覚えておく
  const transpiled = new Map();
  function transpile(file) {
    if (transpiled.has(file)) return transpiled.get(file);
    const tsc = typescript();
    const { outputText, diagnostics = [] } = tsc.transpileModule(
      readFileSync(file, "utf8"),
      {
        fileName: file,
        reportDiagnostics: true,
        compilerOptions: {
          module: tsc.ModuleKind.ESNext,
          target: tsc.ScriptTarget.ES2022,
          jsx: tsc.JsxEmit.ReactJSX,
          inlineSourceMap: true,
          inlineSources: true,
        },
        transformers: { before: [assetRequire(tsc)] },
      },
    );
    const errors = diagnostics.filter(
      (d) => d.category === tsc.DiagnosticCategory.Error,
    );
    if (errors.length > 0) {
      // 「src/x.ts(3,14): error TS1109: …」の形（root からの相対パス・行・桁・TS の番号）
      throw new SyntaxError(
        tsc
          .formatDiagnostics(errors, {
            getCanonicalFileName: (name) => name,
            getCurrentDirectory: () => root,
            getNewLine: () => "\n",
          })
          .trimEnd(),
      );
    }
    transpiled.set(file, outputText);
    return outputText;
  }

  globalThis[ASSET_FN] = (specifier, file) => asset({ specifier, file, root });
  // ESM には require が無い。素材の require は上で置き換えるので、ここに来るのは素材ではない require だけ
  globalThis.require ??= (id) => {
    throw new Error(
      `piyo-assets/testing: require(${JSON.stringify(id)}) は素材ではないので差し替えられません。` +
        "素材以外は import で書き、素材は文字列そのままの require で書く",
    );
  };

  // 失敗したテストのスタックを、変換後ではなく元の .ts の行番号で出す
  process.setSourceMapsEnabled(true);

  nodeModule.registerHooks({
    resolve(specifier, context, nextResolve) {
      const stub = stubFor(specifier);
      if (stub) return { url: stub, shortCircuit: true };
      const needsStub = NEEDS_STUB_RE.exec(specifier);
      if (needsStub) {
        const prefix = `${needsStub[1]}${needsStub[2]}*`;
        throw new Error(
          `piyo-assets/testing: "${specifier}" の差し替えがありません。` +
            `register({ stubs: { "${specifier}": … } }) で渡す（"${prefix}" で前方一致にもできる）`,
        );
      }
      if (
        /^(?:\.{1,2}\/|\/|file:)/.test(specifier) &&
        context.parentURL?.startsWith("file:")
      ) {
        const url = new URL(specifier, context.parentURL);
        const base = fileURLToPath(url);
        const found = [
          base,
          `${base}.ts`,
          `${base}.tsx`,
          path.join(base, "index.ts"),
          path.join(base, "index.tsx"),
        ].find(isFile);
        if (found) {
          return {
            url: pathToFileURL(found).href + url.search + url.hash,
            shortCircuit: true,
          };
        }
      }
      return nextResolve(specifier, context);
    },

    load(url, context, nextLoad) {
      if (!url.startsWith("file:")) return nextLoad(url, context);
      const file = fileURLToPath(url); // ?query は落ちる
      const required = context.conditions?.includes("require") === true;
      if (ASSET_RE.test(file) && !required) {
        const error = new Error(
          `piyo-assets/testing: 素材 ${file} を import で読んでいます。Metro と同じく require("…") で書く` +
            "（素材の値は register({ asset }) で決める）",
        );
        error.code = "ERR_UNKNOWN_FILE_EXTENSION";
        throw error;
      }
      if (!transformable(file)) return nextLoad(url, context);
      if (SOURCE_RE.test(file)) {
        return {
          format: "module",
          source: transpile(file),
          shortCircuit: true,
        };
      }
      // CJS の require（createRequire）は Node の読み方（module.exports = 値）のままにする
      if (
        file.endsWith(".json") &&
        !required &&
        context.importAttributes?.type !== "json"
      ) {
        const source = readFileSync(file, "utf8");
        JSON.parse(source); // 不正な JSON はここで落とす（変換後は Node が同じ JSON.parse で読む）
        return {
          format: "module",
          source: `export default JSON.parse(${JSON.stringify(source)});`,
          shortCircuit: true,
        };
      }
      return nextLoad(url, context);
    },
  });
}
