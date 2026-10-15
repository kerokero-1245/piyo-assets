# piyo-assets

ぴよぴよランド共通のSVG素材ライブラリ（シールポップ画風）。

4つの姉妹サイト — **街（ぴよぴよランド）／おつかいめいろ／ぴよぴよさんすう／ぴよぴよことば** — が共有する、絵文字を置き換えるためのオリジナルSVGモチーフ集です。全 **78 モチーフ**。一覧と使用アプリ対応は [INDEX.md](./INDEX.md) を参照。

作り方の規則と、この repo で違うこと: [DESIGN.md](DESIGN.md#この-repo-での適用)

```
piyo-assets/
├── svg/            78個の <id>.svg（本体）
├── voice/          共有音声クリップ 14個（VOICEVOX:ずんだもん）＋ voice/INDEX.md
├── bgm/            オルゴール風BGMの共有エンジン（engine.ts / engine.js）と4曲（songs.ts / songs.js）・試聴 preview/ ＋ bgm/README.md
├── keys/           保存キーの定数（keys/index.ts = 知育アプリ用 / keys/keys.js = 街の静的HTML用）
├── ui/             知育アプリで同じ役割の部品（Confetti・TownLink・BigButton・ProgressStar・useLongPress）と tokens
├── testing/        知育アプリの node --test の道具（読み込みのひな形 register.mjs・stubs/・偽の localStorage・種つき乱数）
├── tests/          node --test のテスト（keys の一致・ui/ の純関数と入口・フックの配線・testing/ の道具）
├── INDEX.md        id / ラベル / 使用アプリ / 用途の一覧表
├── README.md       このファイル
├── DESIGN.md       作り方の規則との違い・この repo 固有の約束
└── reference/      画風の見本（style-samples.html）・contact sheet・審査スクショ
    └── kenney-comparison/  Kenney素材の採否審査記録（結論: 全モチーフ自作・採用0）
```

## 画風 — 「シールポップ」

LINEスタンプ／ステッカー風。**太い白フチで型抜き（die-cut）し、濃いこげ茶で輪郭を締め、はっきりビビッドな配色**で小さくてもよく目立たせる。4〜5歳が一目で「なにか」を認識でき、かわいいと感じることを最優先する。

- **白フチ（die-cut underlay）**：各SVGの先頭に、全形状を `fill/stroke #ffffff` `stroke-width="15" stroke-linejoin/linecap="round"` でまとめた下地グループを置き、輪郭の外側に太い白縁を焼き込む。ステッカーらしい浮き出しを出す。
- **こげ茶アウトライン**：主要形状の輪郭は `stroke="#3d2a1c"`（約 `stroke-width` 3〜3.4）。瞳など最暗部のみ `#2a1e16`。
- **ビビッド配色**：くすませず、はっきりした原色寄り。ベタ塗り＋軽い内側シェーディング＋白ハイライトで立体感。
- **かわいさの記号**：キャラ・野菜・果物は**大きな瞳（白ハイライト2点）とピンクの頬**を基本にする。ぴよの表情は喜び／落ち着き／眠りの3種のみ（恐怖・怒りは出さない＝WORLD.md準拠）。
- **共通ジオメトリ**：全モチーフ `viewBox="0 0 200 200"`、主対象は中央・余白バランス一定。48pxまで縮めても判読できる太さで描く。

見本は [`reference/style-samples.html`](./reference/style-samples.html) の「シールポップ」節（ぴよ・ばなな・いぬ・いえ）が正典。

## 技術規約

- **単一ファイル・自己完結**：1モチーフ = 1つの `.svg`。外部参照・外部フォント・ラスタ埋め込みなし。
- **`viewBox="0 0 200 200"` 固定**。`width/height` は付けず、使う側で拡縮する（全モチーフ共通スケール）。
- **フィルタ不使用**：`filter` / `feGaussianBlur` / `drop-shadow` は使わない。影・白フチはパスで表現（レンダラ差異とパフォーマンスのため）。白フチは上記の die-cut underlay で焼き込む。
- **アクセシビリティ**：`role="img"` ＋ ひらがな/カタカナの `aria-label`（例 `aria-label="ぴよ"`）。
- **色の型抜きは clipPath でローカル完結**。`id` はファイル内で重複しても実害が出にくい命名だが、複数を同一DOMにインライン展開する場合はビルド側で名前空間化することを推奨。
- **命名**：`<id>.svg`。`id` はローマ字（ことばの語は `words.ts` の `id` と一致、例 `ninjin`, `kyuukyuusha`）。ぴよの表情は `piyo` / `piyo-yorokobi` / `piyo-nemui`。

### 使い方

インライン展開（推奨。CSS で色や演出を足せる）:

```html
<span class="piyo" style="width:96px" v-html="/* svg/piyo.svg の中身 */"></span>
```

または `<img>` / CSS 背景として:

```html
<img src="svg/piyo.svg" alt="ぴよ" width="96" height="96" />
```

いずれも `viewBox` があるため任意サイズに拡縮できる。48px 相当のUIアイコンから 200px 超のヒーロー表示まで同一ファイルで賄う。

## 対応アプリ

| 略  | アプリ                                                              | 役割                                               |
| --- | ------------------------------------------------------------------- | -------------------------------------------------- |
| 街  | [ぴよぴよランド](https://kerokero-1245.github.io/)                  | 街（ランチャー）。段階発展の飾り・ぴよ・施設・背景 |
| 迷  | [おつかいめいろ](https://kerokero-1245.github.io/otsukai-meiro/)    | ゴールプール・アバター・障害物                     |
| 数  | [ぴよぴよさんすう](https://kerokero-1245.github.io/piyopiyo-sansu/) | かず当ての題材キャラ                               |
| 言  | [ぴよぴよことば](https://kerokero-1245.github.io/piyopiyo-kotoba/)  | 語彙40語の絵札                                     |

各アプリでの1件ごとの用途は [INDEX.md](./INDEX.md)。

## 部品（ui/）

知育 3 本（おつかいめいろ・ぴよぴよさんすう・ぴよぴよことば）で同じ役割の部品を 1 つずつ置いている。全部 TypeScript のソースのまま配り、使う側の Metro が変換する。

| 部品                        | 中身                                                                                                                        | アプリごとの差の受け方                                                                                                                                                                                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Confetti`                  | 祝福の紙吹雪（枠の実測幅に収め、降り終えた小片は取り除く）                                                                  | `count?`（既定 18）。小片の色は tokens の `confetti`（順に使い回す）                                                                                                                                                                                                     |
| `TownLink`                  | 「まちへ もどる」— 街（`/`）へ帰るリンク。web だけで出す。絵は `svg/ki.svg`                                                 | 枠と押下の色は tokens の `townBorder`・`townPressed`。`TOWN_URL`・`SHOW_TOWN`・`TOWN_LINK_HEIGHT` も出す                                                                                                                                                                 |
| `BigButton`                 | 絵文字＋ひらがなの大きなボタン                                                                                              | `size?: "small" \| "big" \| "huge"`（既定 `"big"`。`small` はおとなモード用で高さ 64・文字 `font.body`・1 行）。白いボタンの押下色は tokens の `cardButtonPressed`                                                                                                       |
| `ProgressStar`              | 進捗ドット 1 つぶん。クリアで⭐に変わってポップする                                                                         | `mark`（必須）で⭐の出し方を受ける: 文字の ⭐ は `EMOJI_MARK`（入口 `./ui/ProgressStar`）、`svg/hoshi.svg` の画像 24×24 は `STICKER_MARK`（入口 `./ui/ProgressStarSticker`）。ドットの色は tokens の `progressNow`・`progressOff`（ProgressStar を使うアプリだけが渡す） |
| `useLongPress(onFire, ms?)` | 長押しで 1 回だけ発火（既定 3 秒。親ゲートの ⚙️）。`{ onPressIn, onPressOut }` を返し、アンマウントで残りのタイマーを止める | `ms`（有限で 1 以上の数。それ以外は既定の 3 秒）                                                                                                                                                                                                                         |

### tokens の渡し方

部品は各アプリの theme を import できないので、部品が使う値だけを型 `PiyoUiTokens` にまとめ、アプリの根で 1 回だけ渡す。既定値は無い。値を 1 つでも渡し忘れると型エラーと実行時のエラーで、`PiyoUiProvider` の外で部品を使うと実行時のエラーで止まる（別のアプリの色で黙って出ないようにするため。Provider の内側かどうかは型では表せない）。

必須は群ごと。進捗ドットの 2 色 `progressNow`・`progressOff` は ProgressStar の群で、ProgressStar を使うアプリだけが渡す（型では省ける）。渡さずに ProgressStar を描くと、その時点で実行時のエラーになる。それ以外は全体の群で、どのアプリも渡す。

下の例は **ぴよぴよことば** の theme の名前で書いている。アプリごとの名前は例の下の対応表のとおり。

```tsx
import {
  PiyoUiProvider,
  type PiyoUiTokens,
} from "@kerokero-1245/piyo-assets/ui/tokens";
import { colors, font, radius, space } from "./src/theme";

// モジュールの定数にして、描画のたびに作り直さない（作り直すと、部品が style を毎回作り直す。confetti の配列まで作り直すと、紙吹雪の配置も変わる）
const UI_TOKENS: PiyoUiTokens = {
  colors: {
    surface: colors.surface,
    text: colors.text,
    white: colors.white,
    townBorder: colors.itemBorder,
    townPressed: colors.itemPressed,
    buttonPressed: colors.buttonPressed,
    cardButtonPressed: "#F0EADD",
    progressNow: colors.progressNow,
    progressOff: colors.progressOff,
    confetti: colors.confetti,
  },
  font,
  space,
  radius,
};

export default function App() {
  return <PiyoUiProvider tokens={UI_TOKENS}>{/* … */}</PiyoUiProvider>;
}
```

tokens のキーと、3 本の theme のどの値を渡すかの対応:

| tokens のキー                                                                              | おつかいめいろ                                | ぴよぴよさんすう       | ぴよぴよことば       |
| ------------------------------------------------------------------------------------------ | --------------------------------------------- | ---------------------- | -------------------- |
| `townBorder`                                                                               | `colors.tileBorder`                           | `colors.stageBorder`   | `colors.itemBorder`  |
| `townPressed`                                                                              | `colors.surfacePressed`                       | `colors.choicePressed` | `colors.itemPressed` |
| `cardButtonPressed`                                                                        | `"#F0EADD"`（theme に無く、元の部品の直書き） | 同左                   | 同左                 |
| `progressNow`・`progressOff`                                                               | 渡さない（ProgressStar を使わない）           | 同名                   | 同名                 |
| ほか（`surface`・`text`・`white`・`buttonPressed`・`confetti`・`font`・`space`・`radius`） | 同名                                          | 同名                   | 同名                 |

必須のキーの一覧は、全体の群が `PIYO_UI_TOKEN_KEYS`（入口から出している）、ProgressStar の群が `PIYO_UI_PROGRESS_TOKEN_KEYS`（`ui/tokens.ts`）。

### 元の 3 本の部品との挙動の差

値（色・寸法・時間・既定）は元の部品と同じ。次の点だけが違う。

- `useLongPress` は、発火の時点の最新の `onFire` を呼ぶ（元は押した時点の関数を閉じ込めていた）。押している間に描き直しても、押下は取り消されない
- `useLongPress` は、アンマウントで残りのタイマーを止める（押したまま画面が移っても発火しない）
- `useLongPress` の `ms` に有限で 1 以上でない値（`NaN`・`0`・負の数など）を渡すと、既定の 3 秒に倒す（そのままだと押した直後に親ゲートが開く。元は定数 3000 だけを渡していた）
- `ProgressStar` の⭐の出し方は、文字列の `variant`（`"emoji"`・`"sticker"`）ではなく `mark` で渡す（`EMOJI_MARK` か `STICKER_MARK`）。元の部品は画像の⭐を部品の中で読んでいたので、文字の ⭐ で出すアプリにも `hoshi.svg` が書き出されていた。いまは画像を読むのは `STICKER_MARK`（`./ui/ProgressStarSticker`）を import したときだけ
- tokens に依る style（BigButton の寸法と色・TownLink の色と余白・ProgressStar のドットの色）は `StyleSheet.create` に登録せず、そのまま `style` に渡す（描画のたびに `StyleSheet.create` を呼ばないため）。tokens に依らない形は、モジュールの読み込み時に 1 回だけ `StyleSheet.create` に登録する

### exports と files

- **アプリは部品ごとの入口から import する**。まとめての入口 `@kerokero-1245/piyo-assets/ui`（`./ui` → `ui/index.ts`）は互換のために残しているが、ここから 1 つの部品を import すると、Metro は使わない部品の絵（`ki.svg`・`hoshi.svg`）まで書き出す
- `svg/` は `exports` に無い（アプリはパッケージの絵を import しない）

| 入口（`@kerokero-1245/piyo-assets/…`） | 出すもの                                                                     | 読む絵      |
| -------------------------------------- | ---------------------------------------------------------------------------- | ----------- |
| `ui/BigButton`                         | `BigButton`・`BIG_BUTTON_DEFAULT_SIZE`・型 `BigButtonSize`                   | なし        |
| `ui/Confetti`                          | `Confetti`                                                                   | なし        |
| `ui/ProgressStar`                      | `ProgressStar`・`EMOJI_MARK`・型 `ProgressStarMark`・`StarState`             | なし        |
| `ui/ProgressStarSticker`               | `STICKER_MARK`（画像の⭐の mark）                                            | `hoshi.svg` |
| `ui/TownLink`                          | `TownLink`・`TOWN_URL`・`SHOW_TOWN`・`TOWN_LINK_HEIGHT`                      | `ki.svg`    |
| `ui/tokens`                            | `PiyoUiProvider`・`usePiyoUiTokens`・`PIYO_UI_TOKEN_KEYS`・型 `PiyoUiTokens` | なし        |
| `ui/useLongPress`                      | `useLongPress`・`LONG_PRESS_MS`                                              | なし        |

```tsx
import {
  ProgressStar,
  EMOJI_MARK,
} from "@kerokero-1245/piyo-assets/ui/ProgressStar";
// 画像の⭐で出すアプリだけ
import { STICKER_MARK } from "@kerokero-1245/piyo-assets/ui/ProgressStarSticker";

<ProgressStar state="star" mark={EMOJI_MARK} />;
```

- `files` に `ui` と `svg`（78 個すべて）を入れている。`TownLink`・`STICKER_MARK`（`ui/ProgressStarSticker.ts`）は `require("../svg/ki.svg")`・`require("../svg/hoshi.svg")` で正本を相対で読むので、svg/ が無いと部品が組めない。2 つだけを選ばず 78 個すべてを入れている（v0.4.0 の tarball は 102 ファイル・約 77 kB）
- **2 重配布に注意**: Metro はパッケージの素材を `assets/node_modules/@kerokero-1245/piyo-assets/` の下（`svg/…`）に、アプリの素材を `assets/<アプリの中のパス>`（さんすう・ことばは `assets/assets/svg/…`、めいろは `assets/assets/piyo/…`）に書き出す。中身が同じでもパスが違えば 2 回書き出されるので、部品に移した絵（`ki.svg`・`hoshi.svg`）のアプリ側の写しは、アプリで使う箇所が無くなってから消す
- **Pages は Jekyll を通さない**: パッケージの素材の書き出し先のパスに `node_modules` が入るので、GitHub Pages では Jekyll を通さない配信（`dist/.nojekyll`）が前提。知育 3 本の deploy.yml は `touch dist/.nojekyll` で書き出している
- `react`・`react-native` は `peerDependencies`（`*`）。使う側のものを使い、パッケージは持ち込まない。`peerDependenciesMeta` で optional にしているので、react を使わない静的サイトが取り込んでも npm は react・react-native を入れない

## テストの道具（testing/）

知育 3 本の `node --test` で同じ役割の道具。テストでしか使わない（アプリの書き出しには入らない）。

| 入口（`@kerokero-1245/piyo-assets/…`）             | 中身                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `testing/register`                                 | 読み込みのひな形 `register({ root, stubs, asset })`。.ts・.tsx の変換（呼ぶ側の `typescript` の `transpileModule`・jsx は react-jsx。共有パッケージ自身の .ts も変換する）・拡張子なしの相対 import の補完・JSON・素材の require・react-native と expo の差し替え                                                                                        |
| `testing/stubs/react-native`・`testing/stubs/expo` | ひな形の既定の差し替え（`Platform.OS` は `"web"`・ui/ の部品の import に要る名前・`StatusBar`）。`.ts` なので、アプリの `.ts` の stub が `export * from "@kerokero-1245/piyo-assets/testing/stubs/react-native"` で取り込んで名前を足しても、アプリの `tsc` が型を読める                                                                                 |
| `testing/storage`                                  | 偽の localStorage `FakeStorage`（`log` は失敗した操作にだけ `failed: true` が付く・成功だけは `succeeded()`・`failGet`・`failSet`・`failRemove`・`snapshot`）と `installLocalStorage`・`installThrowingLocalStorage`（戻り値で、最初の install の前の状態に戻す。1 本のテストで何回置き換えても、戻す関数を全部 `t.after` に渡せば次のテストに漏れない） |
| `testing/random`                                   | 種つき乱数 `seededRandom`（mulberry32）・`withRandom`・`withSeed`・`replaceRandom`                                                                                                                                                                                                                                                                       |

`typescript` はこのパッケージの依存に入れていない。アプリの devDependencies のものを、アプリのルートから探して使う。起動の形は今までどおり `node --test --import ./tests/register.mjs "tests/**/*.test.ts"` で、アプリの `tests/register.mjs` はひな形にアプリの差分だけを渡す。下は 3 本の写しで `npm test` の本数と pass が元の register.mjs と同じになった形（ことば）:

```js
import { register } from "@kerokero-1245/piyo-assets/testing/register";

const expo = new URL("./stubs/expo.ts", import.meta.url);

register({
  root: new URL("../", import.meta.url),
  stubs: {
    "react-native": new URL("./stubs/react-native.ts", import.meta.url),
    expo,
    "expo-*": expo,
    "expo/*": expo,
  },
});
```

- `stubs`: 名前 → 差し替えのファイル（パスか URL）。完全一致が先で、`"expo-*"` のように末尾が `*` の名前は前方一致。値に関数を渡すと、import の名前を受けてファイルを返す（無ければ例外で止められる。おつかいめいろは `tests/stubs/<名前>.ts` が無い expo-* をこれで止める）。渡さない名前は、`react-native`・`expo`・`expo-status-bar` だけがひな形の stub に向く。差し替えの無い `react-native-*` と、ほかの `expo-*`（`expo-av` など）は、足す場所の分かる例外で止まる
- `asset`: 画像・音声の `require("…")` の値（`{ specifier, file, root }` を受ける）。既定は素材ファイルの絶対パスの文字列で、ファイルが無ければ `MODULE_NOT_FOUND` で止まる（綴り違いの素材をテストで見つけられる）。`asset` を渡したときは実在を見ない。おつかいめいろは `"/" + root からの相対パス`、ぴよぴよさんすうは `{ uri: "asset:<require の文字列>" }` を渡す
- 素材ではない `require` は「素材ではないので差し替えられません」で止まる。素材を ESM の `import` で読むと、`require` に書き換える案内つきで止まる。構文エラーのファイルは `SyntaxError`（`src/x.ts(3,14): error TS1109: …` の形）で止まる
- JSON は `import` なら属性なしで読める。CJS の `require`（`createRequire`）は Node の読み方のまま
- Node は symlink を実体のパスに直して読むので、ひな形の場所が node_modules の外（`npm link` など）だと、共有パッケージの判定と `typescript` の探し方が変わる。git 依存の install（実体のディレクトリ）で使う

### 元の 3 本の register.mjs との差

- `globalThis.require` を置く（素材ではない `require` を呼ぶと、上の例外を投げる関数）。テストのプロセス全体に入るので、`typeof require` を見て分岐するコードはテストの中では「ある」側を通る（3 本の src にこの分岐は無い）
- `root`・`stubs` の値は URL（`new URL("../", import.meta.url)`）で渡すのが既定。文字列のパスを渡すと `process.cwd()` から解決する（`npm test` を repo のルート以外から打つと、指す先が変わる）

## 音声（voice/）

3アプリ＋街で共通に使う日本語よみあげクリップの正典を [`voice/`](./voice/) にまとめている（14個・約215KB）。
すべて **VOICEVOX / ずんだもん（あまあま・style id 1）** で事前生成した同梱アセット（AAC 64kbps モノラル `.m4a`）。
統一idは `t_*`（タイトル）・`p_*`（ほめ／定型句）・`e_*`（誤答フォロー＝やわらか、否定語なし）。
id・セリフ・生成設定・クレジットの一覧は [`voice/INDEX.md`](./voice/INDEX.md)。クレジットは **VOICEVOX:ずんだもん**。

## ライセンス

**SVGはすべてオリジナル作品**（このプロジェクトのために手描きした一次創作）。既存の絵文字フォント・第三者素材のトレースや複製は含まない。ぴよぴよランド及びその姉妹アプリでの利用を想定。再配布・改変時はこの由来を保ってください。

**音声（voice/）** は VOICEVOX の音声合成で生成したもの。クレジット表記は **VOICEVOX:ずんだもん**（VOICEVOX 利用規約に基づく）。各アプリの「おとなモード」下部にも明記している。
