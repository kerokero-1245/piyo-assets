# piyo-assets の作り方

## この repo での適用

規則の全文は [作り方の規則](https://github.com/kerokero-1245/kerokero-1245/blob/main/DESIGN.md) にあります。ここには、このリポジトリで違うことだけを書きます。

### 例外（規則と違うこと）

- **JavaScript のファイルがある**: `bgm/engine.js`・`bgm/songs.js`・`keys/keys.js` は JavaScript のまま。ぴよぴよランド（街）が素の HTML の `<script>` で読むので、TypeScript にしない。Expo のアプリ用に別に持つ `engine.ts`・`songs.ts` とは、曲データと音色・先読みの定数が同じで、入口の API が違う（`configureBgm` は `engine.ts` だけ、`createEngine`・`renderSong` は `engine.js` だけ。差は [bgm/README.md](bgm/README.md)）。`keys/keys.js` は `keys/index.ts` と同じ値を `window.PIYO_KEYS` に置く
- **テストは keys の一致と ui/ の純関数・入口・フックの配線と testing/ の道具だけ**: `tests/keys.test.mjs` が `keys/index.ts` と `keys/keys.js` の値の一致を、`tests/ui-*.test.mjs` が ui/ の純関数（長押しのタイマー・BigButton の size と色・ProgressStar の mark・tokens の検査）と `ui/index.ts` と部品ごとの入口、`useLongPress`・`PiyoUiProvider`・`usePiyoUiTokens` の配線を、`tests/testing-*.test.mjs` が testing/ の読み込みのひな形（一時ディレクトリの偽のアプリを子プロセスで読ませる）と偽の localStorage・種つき乱数を見て、CI で回る。`.tsx` の部品の描画と `bgm/` のエンジンのテストはここに無い（部品の見た目は使う側のアプリの撮影で見る。エンジンの検証は、描き出した音の数値を [bgm/analysis.md](bgm/analysis.md) に残してあり、ON/OFF の保存と配線のテストは使う側のアプリが持つ）
- **フックの配線は react-test-renderer で描いて見る**: `react-test-renderer`（19.2.3。react と同じ exact 版）を devDependencies に入れている。React 19 で非推奨で、描くたびに非推奨の案内を `console.error` に出すので、テストではその 1 文だけを黙らせている。描くのはフックと Provider だけで、`.tsx` の部品は描かない
- **ui/ には react-hooks の lint も掛ける**: 規則の lint 設定に加えて、`ui/` の `.ts`・`.tsx` に `eslint-plugin-react-hooks`（7.1.1。知育 3 本が eslint-config-expo 経由で解決した版と同じ）の flat の `recommended` を掛ける。部品は元はアプリの中にあり、アプリの lint でこの規則に掛かっていたため。`react-hooks/refs` だけは知育 3 本と同じ理由で off（[eslint.config.mjs](eslint.config.mjs)）

### 固有の約束（このリポジトリだけの不変条件）

- **`bgm/` の 4 ファイルは正本**: `engine.ts`・`songs.ts`（Expo のアプリ用）と `engine.js`・`songs.js`（街の静的 HTML 用）。街と 3 アプリ（おつかいめいろ・ぴよぴよさんすう・ぴよぴよことば）が使う。3 アプリは、写しを持つ形から移行済み（3 本とも `github:kerokero-1245/piyo-assets#v0.2.0` の git 依存で `bgm/` を読む）。API と配線は [bgm/README.md](bgm/README.md)
- **lint の指摘で 4 ファイルを書き換えない**: 指摘は `eslint-disable` の行を足さず、[eslint.config.mjs](eslint.config.mjs) で該当ファイルだけ設定を調整して扱う
- **`keys/` の保存キーの正本は `keys/index.ts`**（知育 3 本が import）。`keys/keys.js`（街の静的 HTML が `<script>` で読む。`window.PIYO_KEYS`）はその写し。街の燃料のキー `TOTAL_STARS`（`meiro.totalStars`・`sansu.totalStars`・`kotoba.totalStars`）の値の正本はここで、台帳の文書は [ぴよぴよランドの docs/WORLD.md §7](https://github.com/kerokero-1245/kerokero-1245.github.io/blob/main/docs/WORLD.md)。2 ファイルは同じ値を 2 回書いているので、一致は `tests/keys.test.mjs` が見る
- **`files` に指定するのは `bgm/` の 4 ファイル・`keys/` の 2 ファイル・`ui/`・`svg/`・`testing/`**: `README.md` と `package.json` は npm が必ず含める。`svg/` は 78 個すべて入れると決めている（部品が読む 2 つだけを選ばない）。ui/ の部品はそのうち `ki.svg`・`hoshi.svg` を `require("../svg/…")` の相対で読む（使う側の 2 重配布の注意は [README.md](README.md#exports-と-files)）。`voice/`・`reference/` は入れない。使う側に公開するパスは `exports` に書いたものだけで（`svg/` は `exports` に無い）、消す・名前を変えるときは版を上げる
- **アプリは部品ごとの入口から import する（まとめての入口 `./ui` は互換のため残す）**: まとめての入口から 1 つの部品を読むと、Metro は使わない部品の絵まで書き出す。絵を読むのは `./ui/TownLink`（`ki.svg`）と `./ui/ProgressStarSticker`（`hoshi.svg`）だけにし、`ProgressStar` は⭐の出し方を `mark` で受けて絵を読まない。入口・ui/ の部品・入口ごとに読む絵の一致は `tests/ui-index.test.mjs` が見る
- **`testing/` は知育アプリの `node --test` の道具で、`typescript` を依存に入れない**: 読み込みのひな形 `testing/register.mjs` は呼ぶ側のアプリの `typescript` を使い、共有パッケージ自身の `.ts` も変換する。アプリの `tests/register.mjs` はひな形にアプリの差分（stub・素材の値）だけを渡す。偽の localStorage と種つき乱数は、3 本の使い方を満たす最小のものだけを置く（3 本の実装の和集合にしない。めいろだけが使う `cyclingRandom` などは入れない）
- **ui/ の部品は tokens を群ごとに必須にする**: 部品が使う色・余白・角丸・文字の大きさは `ui/tokenChecks.ts` の `PiyoUiTokens` で受け、既定値を持たない。全体の群（`PIYO_UI_TOKEN_KEYS`）は型で必須にし、`PiyoUiProvider` が実行時にも検査する。ProgressStar の群（進捗ドットの `colors.progressNow`・`colors.progressOff`。一覧は `PIYO_UI_PROGRESS_TOKEN_KEYS`）は型では省けて、ProgressStar を描くときに検査する（ProgressStar を使わないアプリは渡さない）。値の欠けは型と実行時のエラーで、Provider の外は実行時のエラーで止める（部品が Provider の内側にあるかは型で表せない）。2 つの一覧と型が同じ集合であることは `tsc` が見る。検査の関数と `PIYO_UI_PROGRESS_TOKEN_KEYS` は部品の内部用の `ui/tokenChecks.ts` に置き、入口 `./ui/tokens`（`ui/tokens.ts`）は Provider・フック・`PIYO_UI_TOKEN_KEYS`・型だけを出す（入口ごとの公開名がまとめての入口の公開名と同じ集合であることは `tests/ui-index.test.mjs` が見る）
- **ui/ のロジックは `.ts` の純関数に、`.tsx` は薄く**: `node --test` は `.tsx`（JSX）を読めないので、テストしたいロジックは React に依存しない `.ts`（`longPress.ts`・`bigButtonStyle.ts`・`progressStarMark.ts`・`tokenChecks.ts`）に置く。ファイル名は大文字小文字だけ違う組を作らない（`ProgressStar.tsx` と `progressStar.ts` が並んで起きた。大文字小文字を区別しない macOS では `./ProgressStar` が `progressStar.ts` に当たり、`tsc` が TS1149・TS1261 で止まる。区別する Linux の CI の `tsc` は通ってしまい気付けないので、`tests/ui-index.test.mjs` が見る）
- **`react`・`react-native` は `peerDependencies`（`*`）**: 型検査と lint のために devDependencies にも入れ、版は知育 3 本の lock が解決した版と同じ exact 版にする（3 本の版を上げたら、ここも揃える）。`peerDependenciesMeta` で optional にしている（静的サイトのランドが devDependencies で取り込むとき、npm 7+ が react・react-native を自動で入れないため）
- **`private: true` のまま、`type` は付けない**: registry には公開せず、git の依存で入れる。`type` を付けないのは、`bgm/*.js`・`keys/keys.js` が `<script>` で読む classic script で、Node に ES モジュールと見なさせないため
- **版の付け方**: git のタグ `vX.Y.Z` で付け、`package.json` の `version` はタグと同じ番号にする。1.0 になるまでは、何かを足した・変えたら minor、文書だけなら patch を上げる。**タグは付け直さない**（使う側の `package-lock.json` に解決したコミットのハッシュが入るので、付け直すと食い違う）。直すときは次の版にする。使う側は `github:kerokero-1245/piyo-assets#vX.Y.Z` でタグを指して入れる

### 記録の例

- なし
