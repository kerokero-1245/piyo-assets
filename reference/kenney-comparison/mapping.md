# ハイブリッド採用マップ — ぴよぴよことば / 街（ランチャー）

対象アプリ2つ（未適用）:
- **ことば** `piyopiyo-kotoba` … ベルトの語彙40種（`src/game/words.ts` の `WORDS[].id`）＋正解演出
- **街** `kerokero-1245.github.io` … ぴよ4態・施設3・飾り10段階・太陽/月/雲/星（`index.html`＋`WORLD.md §3.4`）

判定日 2026-07-18 / 画風正典 = シールポップ（太い白フチ・濃いこげ茶アウトライン・ビビッド配色・大きな瞳と頬）。

---

## 結論（要約）

**Kenney採用 = 0件。全65モチーフ = custom。**

視覚審査（`compare.png` / `machi.png`）の結果、ダウンロード済み Kenney サンプル群は **シールポップの4要件（①太い白フチ ②濃いアウトライン ③ビビッド彩度 ④顔つき）を1つも満たさない**。全候補で自作SVGが明確に上回る。自作78個は完成済み・品質保証済みで、Kenneyを混ぜても時短メリットは無く、逆に**世界観のコヒーレンスを壊す**（無表情・無フチ・くすみ色の平面素材が白フチかわいい群から浮く）。

したがってハイブリッド方針の「Kenneyは画風調和の見込みがある良候補がある場合のみ／迷ったらcustom」に照らし、**該当ゼロ**が正しい帰結。

### 視覚審査の要点（compare.png：custom左 vs kenney右）
| モチーフ | Kenney候補 | 判定理由（不採用） |
|---|---|---|
| たいよう | `bg_sun.png` | 顔なしの**白い円**（汎用背景）。custom太陽は笑顔＋光条で「太陽も笑う」世界観に必須 |
| つき | `bg_moon.png` | クレーター写実・無表情・クリーム系**くすみ**。custom月は眠り顔で就寝/巣/zzz連動 |
| くも | `bg_cloud.png` | グレー無フチ・無表情。ビビッド青空(#AEE4FF)に不調和 |
| ほし | `emote_star.png` | 小さな平面オレンジ星・**無フチ**。custom金星＋白フチが存在感で勝る |
| きらきら | `emote_stars.png` | ドット散らしのUI風で装飾力ゼロ |
| すやすや | `emote_sleep.png` | 平面の黒Z文字。custom青フチZzZが就寝演出に調和 |
| くさ | `bg_grass.png` | 茶色い塊状で草に見えず色が濁る |
| いえ | `bg_house.png` | 無フチ・くすみベージュ平面。custom赤屋根＋白フチ＋窓が勝る |
| き | `bg_tree` / `racing_tree` | 無フチ平面（暗緑/明緑）。custom茶フチ樹が馴染む |
| ケーキ | `food_cake.png` | 可愛いが紫くすみ・**無白フチ**で白フチ群から浮く |
| にんじん | `food_carrot.png` | 細い平面・無表情。custom（顔つき・語彙）に劣る |
| くるま | `racing_car_red.png` | 真上視点・無フチでベルト内の他語と視点/画風が不一致 |

> 追加パックのダウンロードは見送り。既存サンプルは候補カテゴリ（bg_/emote_/food_/animal_/racing_/fish_）を代表しており、いずれも同じ4点（白フチ・彩度・顔・フチ線）で外れる。Kenneyには「白フチ焼き込み＋かわいい顔」系パックが存在しないため、別パックでも結果は変わらない。

---

## ことば（40語彙＋正解演出）— 全 custom

すべて `svg/<id>.svg` が完成済み（`words.ts` の id と1対1）。ベルト（`Belt.tsx`）とリビールカード（`RevealCard.tsx`）は現状 `item.emoji`。ここを自作SVGへ差し替える想定。

### やさい（10）
`ninjin`(★街と共有), `tomato`, `nasu`, `toumorokoshi`, `piiman`, `kyuuri`, `jagaimo`, `satsumaimo`, `tamanegi`, `burokkorii`
→ **和野菜の日本語読み上げが学習対象**。Kenney `food_*` は顔なし・無フチ・くすみで語彙用途に不適（前回計測でも語彙はほぼ全滅）。custom固定。

### くだもの（10）
`banana`, `ringo`(迷/数と共有), `ichigo`, `budou`, `mikan`, `suika`, `momo`, `sakuranbo`, `meron`, `painappuru`
→ くだもの語彙。Kenney `food_*` は平面・くすみ・無白フチで画風非調和。custom。

### どうぶつ（10）
`inu`, `neko`, `usagi`(★街と共有), `zou`, `raion`, `kirin`, `panda`, `saru`, `kuma`, `buta`
→ **キャラクター＝顔必須**（シールポップの核）。Kenney `animal_*` は無表情・無白フチでクラッシュ。custom。

### のりもの（10）
`kuruma`, `basu`, `densha`, `hikouki`, `fune`, `shoubousha`, `kyuukyuusha`, `jitensha`, `herikoputaa`, `roketto`
→ のりもの語彙。Kenney `racing_*` 等は視点/造形不一致（真上視点・無フチ）。custom。

### 正解演出
`hoshi`(★街と共有) … 進捗⭐・がんばりカード⭐。Kenney `emote_star.png` は小平面星で存在感不足。custom。
※ 紙吹雪（`Confetti.tsx`）は**手続き生成・外部素材不使用**なので素材対象外。

---

## 街（ランチャー）— 全 custom

`index.html` は現状すべて絵文字。自作SVGへ差し替える想定。「みち／さら地」は CSS 描画のため素材対象外。

### ぴよ4態（4）
`piyo`（通常）, `piyo-yorokobi`（cheer）, `piyo-nemui`（sleep）, `oukan`（王様ぴよ＝piyo＋王冠・段階10）
→ 相棒キャラ本体。顔・表情差分が世界観の主役。Kenney該当なし/無表情。custom。

### 施設3（3）
`ki`（🌳こうえん＝めいろへ）, `cake`（🍰ケーキやさん＝さんすうへ）, `ninjin`（🥕やおやさん＝ことばへ）
→ ランチャーの入口アイコン。`bg_tree`/`food_cake`/`food_carrot` はいずれも無白フチ・くすみで浮く。custom。

### 飾り10段階（`WORLD.md §3.4`）
- 段階1: `kusa`, `hana`
- 段階2: `hiyoko`（なかまのひよこ）
- 段階3: `ki`(施設と共有), `benchi`
- 段階4: `ie`, `kemuri`
- 段階5: `usagi`(★ことばと共有), （みち=CSS）
- 段階6: `funsui`
- 段階7: `mokuba`（メリーゴーラウンド）
- 段階8: `niji`, `koinobori`
- 段階9: `kanransha`
- 段階10: `hanabi`(×2配置), `oukan`(ぴよ状態と共有)
→ 飾りの大半は Kenney に該当なし。`kusa/ie/ki` は候補ありも上表の通り非調和。custom完成済み・品質保証。

### 背景（4）
`taiyou`（昼の空）, `tsuki`（夜モード）, `kumo`（×2/×3配置）, `hoshi`(★正解演出と共有・背景星/紙吹雪マーク)
→ 上表の通り全て Kenney 候補が非調和。custom。
※ 現状 `.star` は CSS ドット、`hoshi.svg` は演出/背景星に使用。

### 夜モード小物・演出（3）
`su`（ぴよの巣。現状 🌿 絵文字→ `su.svg` へ）, `kirakira`（きらきら演出）, `zzz`（すやすや）
→ `emote_stars`/`emote_sleep` は装飾力不足。custom。

---

## モチーフ内訳
- ことば 40語彙 ＋ 正解演出 `hoshi` = 41スロット（うち `ninjin`/`usagi`/`hoshi` は街と共有）
- 街 27モチーフ
- **重複排除した distinct モチーフ = 65。全 custom。Kenney = 0。**

## 生成物
- `compare.md`/`mapping.md`（本ファイル）… 判定一覧
- `compare.png` … custom vs kenney 13組の視覚審査
- `machi.png` … 街の自作モチーフ群コヒーレンス確認
