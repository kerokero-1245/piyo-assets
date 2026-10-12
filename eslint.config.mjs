// piyo-assets の lint 設定（eslint 10 の flat config）。素の設定で、JS・TS に @eslint/js の recommended、
// TS にはさらに typescript-eslint の recommended を重ねる（型情報は使わないので tsconfig は要らない）。
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  // ビルドの出力先は無いので、無視するのは node_modules だけ。
  globalIgnores(["node_modules/"]),

  { files: ["**/*.{js,mjs,ts}"], extends: [js.configs.recommended] },
  { files: ["**/*.ts"], extends: [tseslint.configs.recommended] },

  // bgm/*.js は街の静的 HTML が <script> で読む（ブラウザで動く）。
  // ランドが <script> で読む classic script なので、module として検査しない（export が通らないようにする）。
  {
    files: ["bgm/**/*.js"],
    languageOptions: { sourceType: "script", globals: globals.browser },
  },
  // 設定ファイルは Node で動く。
  { files: ["eslint.config.mjs"], languageOptions: { globals: globals.node } },

  // bgm/ の engine.ts・songs.ts・engine.js・songs.js は、街とアプリ 3 本が共有するエンジンと曲データ（正本）。
  // 中身を変えない方針なので、指摘は eslint-disable の行を足さず、ここで該当ファイルだけ設定を調整して扱う。
  {
    // 末尾の `module.exports = ...` は、Node の require でも読めるようにする出口（`typeof module` で守ってある）。
    // <script> で読むときは module が無いので、読み取り専用のグローバルとして宣言する。
    files: ["bgm/engine.js", "bgm/songs.js"],
    languageOptions: { globals: { module: "readonly" } },
  },
  {
    // engine.js の try/catch は、Web Audio や document の呼び出しが失敗しても落とさず握りつぶす作り
    // （ファイル先頭の「クラッシュ厳禁」）。空の catch と、使わない例外変数 `catch (e)` をこのファイルだけ許す。
    files: ["bgm/engine.js"],
    rules: {
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-unused-vars": ["error", { caughtErrors: "none" }],
    },
  },
]);
