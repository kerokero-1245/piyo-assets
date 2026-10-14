// piyo-assets の lint 設定（eslint 10 の flat config）。素の設定で、JS・TS に @eslint/js の recommended、
// TS にはさらに typescript-eslint の recommended を重ねる（型情報は使わないので tsconfig は要らない）。
// ui/ の部品とフックには eslint-plugin-react-hooks の recommended も掛ける（下）。
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default defineConfig([
  // ビルドの出力先は無いので、無視するのは node_modules だけ。
  globalIgnores(["node_modules/"]),

  // ui/ の部品は .tsx（JSX）。.ts と同じ設定で見る（JSX は typescript-eslint のパーサが .tsx で読む）。
  { files: ["**/*.{js,mjs,ts,tsx}"], extends: [js.configs.recommended] },
  { files: ["**/*.{ts,tsx}"], extends: [tseslint.configs.recommended] },

  // ui/ の部品は、元は各アプリの中にあり、アプリの lint（eslint-config-expo）で react-hooks の規則に掛かっていた。
  // アプリの lint は node_modules を見ないので、ここで同じ規則を掛ける（版はアプリが解決した 7.1.1 と同じ）。
  {
    files: ["ui/**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat.recommended],
    rules: {
      // react-hooks/refs は、プラグインの README が "React Compiler rules" に分類している規則で、
      // ここも React Compiler は使わない（変換は使う側の Metro）。一方、Animated.Value を
      // useRef(new Animated.Value(..)).current で作る RN の定番の形（Confetti・ProgressStar）と、
      // 一度だけ作る物を ref に持って描画の中で読む形（useLongPress）を「描画中に ref を読む」と見なす。
      // 知育 3 本（ぴよぴよさんすうの eslint.config.mjs）と同じ理由で off にする。
      "react-hooks/refs": "off",
    },
  },

  // bgm/*.js と keys/keys.js は街の静的 HTML が <script> で読む（ブラウザで動く）。
  // ランドが <script> で読む classic script なので、module として検査しない（export が通らないようにする）。
  {
    files: ["bgm/**/*.js", "keys/**/*.js"],
    languageOptions: { sourceType: "script", globals: globals.browser },
  },
  // 設定ファイルとテストは Node で動く。
  {
    files: ["eslint.config.mjs", "tests/**/*.mjs"],
    languageOptions: { globals: globals.node },
  },

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
