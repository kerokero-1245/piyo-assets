# piyo-assets の作り方

## この repo での適用

規則の全文は [作り方の規則](https://github.com/kerokero-1245/kerokero-1245/blob/main/DESIGN.md) にあります。ここには、このリポジトリで違うことだけを書きます。

### 例外（規則と違うこと）

- **JavaScript のファイルがある**: `bgm/engine.js`・`bgm/songs.js` は JavaScript のまま。ぴよぴよランド（街）が素の HTML の `<script>` で読むので、TypeScript にしない。Expo のアプリ用に別に持つ `engine.ts`・`songs.ts` とは、曲データと音色・先読みの定数が同じで、入口の API が違う（`configureBgm` は `engine.ts` だけ、`createEngine`・`renderSong` は `engine.js` だけ。差は [bgm/README.md](bgm/README.md)）
- **テストがない**: `tests/` がまだ無く、CI にもテストの段が無い（エンジンの検証は、描き出した音の数値を [bgm/analysis.md](bgm/analysis.md) に残してあり、ON/OFF の保存と配線のテストは使う側のアプリが持つ）

### 固有の約束（このリポジトリだけの不変条件）

- **`bgm/` の 4 ファイルは正本**: `engine.ts`・`songs.ts`（Expo のアプリ用）と `engine.js`・`songs.js`（街の静的 HTML 用）。街と 3 アプリ（おつかいめいろ・ぴよぴよさんすう・ぴよぴよことば）が使う。3 アプリは、写しを持つ形からこのパッケージを依存にする形へ移行中。API と配線は [bgm/README.md](bgm/README.md)
- **lint の指摘で 4 ファイルを書き換えない**: 指摘は `eslint-disable` の行を足さず、[eslint.config.mjs](eslint.config.mjs) で該当ファイルだけ設定を調整して扱う
- **`files` に指定するのは `bgm/` の 4 ファイル**: `README.md` と `package.json` は npm が必ず含めるので、配布物は計 6 ファイルになる。`svg/`・`voice/`・`reference/` は入れない。使う側に公開するパスは `exports` に書いたものだけで、消す・名前を変えるときは版を上げる
- **`private: true` のまま、`type` は付けない**: registry には公開せず、git の依存で入れる。`type` を付けないのは、`bgm/*.js` が `<script>` で読む classic script で、Node に ES モジュールと見なさせないため
- **版の付け方**: git のタグ `vX.Y.Z` で付け、`package.json` の `version` はタグと同じ番号にする。1.0 になるまでは、何かを足した・変えたら minor、文書だけなら patch を上げる。**タグは付け直さない**（使う側の `package-lock.json` に解決したコミットのハッシュが入るので、付け直すと食い違う）。直すときは次の版にする。使う側は `github:kerokero-1245/piyo-assets#vX.Y.Z` でタグを指して入れる

### 記録の例

- なし
