# piyo-assets/bgm — ぴよぴよランド 共通BGM

4つの姉妹アプリ（**街（ぴよぴよランド）／おつかいめいろ／ぴよぴよさんすう／ぴよぴよことば**）が共有する
**オルゴール風BGM**の基盤。音源ファイルは同梱せず、**Web Audio API でその場合成する手続き生成ループ**。
既存の効果音・声（各アプリ `src/audio/`）と同じ思想 — 外部送信ゼロ・完全オフライン・つなぎ目なし。

**BGM: オリジナル（Web Audio 生成）**。録音物・外部素材は使っていない。

```
bgm/
├── engine.ts     Expo（RN / react-native-web）3アプリ用エンジン（依存ゼロ）
├── engine.js     街の静的HTML用エンジン（同一ロジックの vanilla 版）
├── songs.ts      4曲のスコアデータ（+ 型）
├── songs.js      同上（vanilla / window.PIYO_SONGS）
├── analysis.md   レンダリング検証の数値
├── preview/      試聴用 m4a（各曲1ループ+余韻。配線には使わない・確認用）
└── README.md     このファイル
```

## 曲

全曲 **16小節ループ**・メジャーペンタトニック・和声骨格 `[I vi IV V]×4`・オルゴール系統。
旋律は C5〜C6帯のペンタトニック（強拍はコードトーン、跳躍は6度以内中心、隙間多め）。
伴奏は C3〜C4帯の分散和音（まばら）。8小節フレーズ（P1+P2）を `A B A B'` に展開し、
末尾（V）→ 先頭（I）が和声的に自然につながる。

| songId | アプリ | キー | テンポ | 性格 | ノート数 |
|----|----|----|----|----|----|
| `land` | 街（ぴよぴよランド） | C メジャーペンタ | 66 BPM | いちばん子守唄寄り | 66 |
| `meiro` | おつかいめいろ | G メジャーペンタ | 84 BPM | すこしわくわく | 104 |
| `sansu` | ぴよぴよさんすう | F メジャーペンタ | 76 BPM | ほのぼの | 96 |
| `kotoba` | ぴよぴよことば | D メジャーペンタ | 92 BPM | 軽やか | 130 |

### スコア形式

```ts
{ bpm, beatsPerBar, bars, mix, notes: [ { t, midi, dur, vel } ] }
```

- `t` … 曲頭からの拍位置（0拍=先頭）。ループ長 = `beatsPerBar * bars` 拍。
- `midi` … MIDIノート番号（60=C4, 72=C5）。
- `dur` … 音価（拍）。オルゴールの余韻はエンジン側で音価から算出。
- `vel` … 相対音量（0〜1）。**実音量 = マスターゲイン(0.10) × mix × vel**。
- `mix` … 曲別の音量トリム（音数が多い曲ほど下げ、体感RMSを4曲でそろえる）。

## 音色（オルゴール風）

- 基音 **triangle** ＋ 高次倍音1本（**sine・1オクターブ上・小ゲイン0.32・速い減衰**）。
- アタック **約5ms**（指数ランプ）、指数減衰 **0.9〜2.0秒**（音価から算出）。
- 全体に **ローパス 4500Hz / Q0.7** をかけてやわらかく。
- マスターゲイン **0.10前後**（控えめ・初期ON）。

## スケジューラ

- **lookahead 方式**（インターバル200ms・先読み600ms）。
- `ctx.currentTime` 基準の**絶対時刻**にノートを予約 → ドリフト無し。
- 曲を「無限に続くノート列」として予約し続ける（止めて鳴らし直さない）ので**シームレスループ**。
  末尾で鳴っている音の余韻がそのまま次周へ伸び、境界にクリックが出ない（`analysis.md` で数値確認済）。
- `visibilitychange` で自動サスペンド／復帰。二重 start 防止。

## API

`startBgm` は **必ずユーザー操作起点**で呼ぶ（iOS Safari の自動再生制限）。
AudioContext 非対応環境では全 API が**無害な no-op**（クラッシュしない）。

| API | 説明 |
|----|----|
| `startBgm(songId)` | 曲を再生開始（ユーザー操作起点）。**同一曲での再呼び出しは冪等（無視）**、**別曲なら内部で停止→再初期化→切替**（走行中カーソルを乱さない・クリック無し）。 |
| `stopBgm(fadeSec?)` | フェードアウト停止（既定0.4秒）。 |
| `setBgmEnabled(bool)` | ON/OFF。false で停止、true で予定曲を鳴らし直す。 |
| `isBgmEnabled()` | 現在の ON/OFF。 |
| `duckBgm()` / `unduckBgm()` | 声再生中のダッキング（35%へ・`setTargetAtTime` でなめらか）。多重呼び出し対応。 |
| `getBgmState()` | 状態スナップショット `{ supported, enabled, running, songId, ducked, ownsCtx }`（検証・デバッグ用）。 |
| `dispose()` | 後片付け（`engine.js` のみ）。スケジューラ停止＋`visibilitychange` リスナ解除。 |
| `configureBgm({ getCtx?, masterVolume? })` | （`engine.ts` のみ）外部の AudioContext の getter とマスター音量を設定する。アプリ初期化時に1回・任意。注入しなければ自前で ctx を作る。 |
| `createEngine(config?)` | （`engine.js` のみ・`window.PiyoBgm.createEngine`）上の API を持つエンジンを1つ作って返す。`config` は `songs`（省略時 `window.PIYO_SONGS`）・`getCtx` または `ctx`（共有 AudioContext）・`masterVolume`。 |
| `renderSong(songId, opts?)` | （`engine.js` のみ・`window.PiyoBgm.renderSong`）`OfflineAudioContext` で曲を `opts.loops` 周（既定1）レンダリングし `Promise<AudioBuffer \| null>` を返す。`opts` は `songs`・`loops`・`tail`・`sampleRate`・`masterVolume`。試聴・検証用（非対応環境では `null`）。 |

### Expo アプリ（engine.ts）

```ts
import { startBgm, stopBgm, duckBgm, unduckBgm, setBgmEnabled, configureBgm } from './bgm/engine';

// （任意）声・効果音と同じ AudioContext を共有する場合:
configureBgm({ getCtx: () => getSharedAudioContext() });

// 最初のユーザー操作（「あそぶ」タップ）で:
startBgm('sansu');

// 声を鳴らす直前／直後:
duckBgm(); /* ...声... */ unduckBgm();
```

`web` 以外（iOS/Android 実機）は無音スタブ。

### 街の静的HTML（engine.js）

```html
<script src="assets/bgm/songs.js"></script>   <!-- window.PIYO_SONGS -->
<script src="assets/bgm/engine.js"></script>  <!-- window.PiyoBgm -->
<script>
  var bgm = PiyoBgm.createEngine();  // 既定で window.PIYO_SONGS を読む
  // 最初のタップで: bgm.startBgm('land');
  // 声の前後で: bgm.duckBgm() / bgm.unduckBgm()
</script>
```

## 配線（4サイトとも実施済み）

このフォルダは共有基盤。各サイトはここのエンジンと曲を自分の repo にコピーして同梱し、次のように配線している。

| サイト | エンジン | 曲 | ON/OFF の保存キー（既定 ON） | 切り替え |
|----|----|----|----|----|
| 街（kerokero-1245.github.io） | `assets/bgm/engine.js` の `createEngine({ getCtx })` | `land` | `land.bgm`（`'1'`/`'0'`） | トップバーの 🔊/🔇 チップ |
| おつかいめいろ | `src/audio/bgm/engine.ts`（`src/audio/bgm.ts` から利用） | `meiro` | `meiro.bgm`（`'1'`/`'0'`） | おとなモードのトグル |
| ぴよぴよさんすう | 同上 | `sansu` | `sansu.bgm`（`'on'`/`'off'`） | おとなモードのトグル |
| ぴよぴよことば | 同上 | `kotoba` | `kotoba.bgm`（`'on'`/`'off'`） | おとなモードのトグル |

- **初期状態 ON・控えめ音量**。最初のユーザー操作で `startBgm(songId)`（街はタイトル読み上げと同じ初回タップ）。
- **声ダッキング連携**: 声・タイトル読み上げの再生中は `duckBgm()`、終了で `unduckBgm()`。
- **AudioContext 共有**: Expo の3アプリは `configureBgm({ getCtx })`、街は `createEngine({ getCtx })` で
  声・効果音と同じ ctx を注入している。注入しなくてもエンジンは自前 ctx で動作する。
- キーの値の形式と所有の正典は ぴよぴよランドの `docs/WORLD.md` §7（キー台帳）。

## 検証

`analysis.md` 参照。ピーク < -3dBFS（実測 -17〜-19dBFS）・RMS差 0.58dB・ループ境界クリック無し・
発音数＝スコア一致・実ブラウザ再生エラーゼロ・no-op安全 を確認済み。
`preview/*.m4a` は各曲1ループ+余韻の試聴用（**確認用であり、アプリ配線には使わない**）。
