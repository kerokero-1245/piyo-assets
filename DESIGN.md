# piyo-assets の作り方

## この repo での適用

規則の全文は [作り方の規則](https://github.com/kerokero-1245/kerokero-1245/blob/main/DESIGN.md) にあります。ここには、このリポジトリで違うことだけを書きます。

### 例外（規則と違うこと）

- **JavaScript のファイルがある**: `bgm/engine.js`・`bgm/songs.js`・`keys/keys.js` は JavaScript のまま。ぴよぴよランド（街）が素の HTML の `<script>` で読むので、TypeScript にしない。Expo のアプリ用に別に持つ `engine.ts`・`songs.ts` とは、曲データと音色・先読みの定数が同じで、入口の API が違う（`configureBgm` は `engine.ts` だけ、`createEngine`・`renderSong` は `engine.js` だけ。差は [bgm/README.md](bgm/README.md)）。`keys/keys.js` は `keys/index.ts` と同じ値を `window.PIYO_KEYS` に置く
- **テストは keys の一致と ui/ の純関数・入口だけ**: `tests/keys.test.mjs` が `keys/index.ts` と `keys/keys.js` の値の一致を、`tests/ui-*.test.mjs` が ui/ の純関数（長押しのタイマー・BigButton の size と色・ProgressStar の variant・tokens の検査）と `ui/index.ts` の入口を見て、CI で回る。`.tsx` の部品の描画と `bgm/` のエンジンのテストはここに無い（部品の見た目は使う側のアプリの撮影で見る。エンジンの検証は、描き出した音の数値を [bgm/analysis.md](bgm/analysis.md) に残してあり、ON/OFF の保存と配線のテストは使う側のアプリが持つ）

### 固有の約束（このリポジトリだけの不変条件）

- **`bgm/` の 4 ファイルは正本**: `engine.ts`・`songs.ts`（Expo のアプリ用）と `engine.js`・`songs.js`（街の静的 HTML 用）。街と 3 アプリ（おつかいめいろ・ぴよぴよさんすう・ぴよぴよことば）が使う。3 アプリは、写しを持つ形から移行済み（3 本とも `github:kerokero-1245/piyo-assets#v0.2.0` の git 依存で `bgm/` を読む）。API と配線は [bgm/README.md](bgm/README.md)
- **lint の指摘で 4 ファイルを書き換えない**: 指摘は `eslint-disable` の行を足さず、[eslint.config.mjs](eslint.config.mjs) で該当ファイルだけ設定を調整して扱う
- **`keys/` の保存キーの正本は `keys/index.ts`**（知育 3 本が import）。`keys/keys.js`（街の静的 HTML が `<script>` で読む。`window.PIYO_KEYS`）はその写し。街の燃料のキー `TOTAL_STARS`（`meiro.totalStars`・`sansu.totalStars`・`kotoba.totalStars`）の値の正本はここで、台帳の文書は [ぴよぴよランドの docs/WORLD.md §7](https://github.com/kerokero-1245/kerokero-1245.github.io/blob/main/docs/WORLD.md)。2 ファイルは同じ値を 2 回書いているので、一致は `tests/keys.test.mjs` が見る
- **`files` に指定するのは `bgm/` の 4 ファイル・`keys/` の 2 ファイル・`ui/`・`svg/`**: `README.md` と `package.json` は npm が必ず含める。`svg/` は ui/ の部品が `require("../svg/…")` で正本を読むので全部入れる（使う側の 2 重配布の注意は [README.md](README.md#exports-と-files)）。`voice/`・`reference/` は入れない。使う側に公開するパスは `exports` に書いたものだけで、消す・名前を変えるときは版を上げる
- **ui/ の部品は tokens を必須にする**: 部品が使う色・余白・角丸・文字の大きさは `ui/tokens.ts` の `PiyoUiTokens` で受け、既定値を持たない（Provider の外・値の欠けは型と実行時のエラーで止める）。キーの一覧 `PIYO_UI_TOKEN_KEYS` と型が同じ集合であることは `tsc` が見る
- **ui/ のロジックは `.ts` の純関数に、`.tsx` は薄く**: `node --test` は `.tsx`（JSX）を読めないので、テストしたいロジックは React に依存しない `.ts`（`longPress.ts`・`bigButtonStyle.ts`・`progressStarMark.ts`・`tokens.ts`）に置く。ファイル名は大文字小文字だけ違う組を作らない（macOS では並べられるが、`tsc` が TS1149 で止まり、Linux の CI と Metro では見つからない。`tests/ui-index.test.mjs` が見る）
- **`react`・`react-native` は `peerDependencies`（`*`）**: 型検査と lint のために devDependencies にも入れ、版は知育 3 本の lock が解決した版と同じ exact 版にする（3 本の版を上げたら、ここも揃える）
- **`private: true` のまま、`type` は付けない**: registry には公開せず、git の依存で入れる。`type` を付けないのは、`bgm/*.js`・`keys/keys.js` が `<script>` で読む classic script で、Node に ES モジュールと見なさせないため
- **版の付け方**: git のタグ `vX.Y.Z` で付け、`package.json` の `version` はタグと同じ番号にする。1.0 になるまでは、何かを足した・変えたら minor、文書だけなら patch を上げる。**タグは付け直さない**（使う側の `package-lock.json` に解決したコミットのハッシュが入るので、付け直すと食い違う）。直すときは次の版にする。使う側は `github:kerokero-1245/piyo-assets#vX.Y.Z` でタグを指して入れる

### 記録の例

- なし
