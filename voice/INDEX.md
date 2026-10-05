# voice — ぴよぴよランド 共有音声ライブラリ

3アプリ＋街で共通に使う日本語よみあげクリップの正典。すべて **VOICEVOX / ずんだもん（あまあま）**
で事前生成した同梱アセット（`.m4a`）。各アプリは読み上げ3段構え「①同梱クリップ → ②speechSynthesis → ③無音」
の **①** としてここのクリップを取り込む（`piyopiyo-*/otsukai-meiro/kerokero-1245.github.io` の `assets/voice/`）。

- **統一id 規約**: `t_*`＝アプリ/街のタイトル読み、`p_*`＝ほめ・定型句、`e_*`＝誤答フォロー（やわらか）。
- **正典口調（WORLD §3.6）**: ひらがな・短句・語尾やわらか。**命令形・否定語（だめ・ちがう）は使わない。**
  `e_oshii/e_arere/e_mouikkai` は「おしい・あれれ・もういっかい」＝**否定語ではない**やわらかフォロー。
- **外部送信ゼロ**: クリップは端末内同梱アセット。生成時のみエンジンをローカル起動し、生成後に停止する。

## クリップ一覧（14個・約215KB）

| id | セリフ | 用途 | speed | 長さ | サイズ | 由来 |
|---|---|---|---|---|---|---|
| `t_land`     | ぴよぴよランド     | 街（ランチャー）タイトル       | 0.92 | 1.67s | 18,615 B | 収集: `kerokero-1245.github.io/assets/voice/piyopiyo-land.m4a` |
| `t_meiro`    | おつかいめいろ     | おつかいめいろ タイトル         | 0.92 | 1.49s | 17,092 B | 収集: `otsukai-meiro/assets/voice/p_title.m4a` |
| `t_sansu`    | ぴよぴよさんすう   | ぴよぴよさんすう タイトル       | 0.92 | 1.79s | 19,559 B | 生成（2026-07-18） |
| `t_kotoba`   | ぴよぴよことば     | ぴよぴよことば タイトル         | 0.92 | 1.69s | 18,528 B | 生成（2026-07-18） |
| `p_seikai`   | せいかい！         | 正解（ことば／さんすう）        | 0.95 | 1.11s | 13,370 B | 収集: `piyopiyo-kotoba/assets/voice/p_seikai.m4a` |
| `p_yattane`  | やったね！         | ⭐獲得直後（WORLD §3.6）        | 0.95 | 1.12s | 13,432 B | 生成（2026-07-18） |
| `p_sugoi`    | すごい！           | ほめ（達成・連続正解 等）      | 0.95 | 0.90s | 12,077 B | 生成（2026-07-18） |
| `p_tsuita`   | ついたね！         | ゴール到達（めいろ）            | 0.95 | 1.17s | 14,534 B | 収集: `otsukai-meiro/assets/voice/p_tsuita.m4a` |
| `p_zenbu`    | ぜんぶ できたね！  | 全レベル制覇／がんばりカード    | 0.95 | 2.40s | 23,985 B | 収集: `otsukai-meiro/assets/voice/p_zenbu.m4a` |
| `p_kitayo`   | きたよ！           | 増の合図（さんすう つづきもの） | 0.95 | 0.99s | 12,340 B | 生成（2026-07-19） |
| `p_kaettayo` | かえったよ         | 減の合図（さんすう つづきもの） | 0.95 | 1.35s | 15,467 B | 生成（2026-07-19） |
| `e_oshii`    | おしい！           | 誤答フォロー（やわらか）        | 0.95 | 0.94s | 12,017 B | 生成（2026-07-18） |
| `e_arere`    | あれれ？           | 誤答フォロー（やわらか）        | 0.95 | 1.09s | 13,333 B | 生成（2026-07-18） |
| `e_mouikkai` | もういっかい       | もう一回うながし                | 0.95 | 1.30s | 15,724 B | 生成（2026-07-18） |

内訳: 収集 5 ／ 生成 9。

## 生成の再現情報（全アプリ・街で統一）

| 項目 | 値 |
|---|---|
| エンジン | VOICEVOX ENGINE 0.25.2（macOS x64 CPU・公式GitHubリリース） |
| 話者 / スタイル | ずんだもん / あまあま（`speaker` = style id **1**） |
| 速度 | `speedScale` = 0.92（タイトル `t_*`）／ 0.95（定型句 `p_*`・フォロー `e_*`）。4〜5歳向けにやや遅め |
| 疑問/感嘆の抑揚 | `/synthesis?enable_interrogative_upspeak=true` |
| その他パラメータ | `audio_query` の既定値（pitch/intonation 等は変更なし） |
| 音声形式 | 24kHz モノラル WAV → `afconvert -f m4af -d aac -b 64000`（AAC 64kbps モノラル m4a） |

手順（要約）: 公式リリースの ENGINE をローカル起動（HTTP `localhost:50021`）→ `/speakers` で
ずんだもん/あまあま（id 1）を確認 → 各フレーズを `/audio_query`（`speedScale` 調整）→
`/synthesis`（`enable_interrogative_upspeak=true`）で WAV → `afconvert` で m4a 化 → 本ディレクトリへ配置。
エンジンは生成後に停止。既存の `t_land`/`t_meiro`/`p_seikai`/`p_tsuita`/`p_zenbu` は各アプリrepoの
同一クリップをそのまま収集（再生成なし）。

## 各アプリへの取り込み

各アプリの `assets/voice/` は基名（ファイル名）でクリップを解決する（`src/audio/` の `PHRASE_VOICE` 等）。
**ファイル名は id のままとは限らない**。いまの対応（中身は本ライブラリのクリップと同一ハッシュ）:

| id | 街 | おつかいめいろ | ぴよぴよさんすう | ぴよぴよことば |
|---|---|---|---|---|
| `t_land` | `piyopiyo-land.m4a` | — | — | — |
| `t_meiro` | — | `p_title.m4a` | — | — |
| `t_sansu` | — | — | `t_sansu.m4a` | — |
| `t_kotoba` | — | — | — | `p_title.m4a` |
| `p_seikai` | — | — | `p_seikai.m4a` | `p_seikai.m4a` |
| `p_tsuita` | — | `p_tsuita.m4a` | — | — |
| `p_zenbu` | — | `p_zenbu.m4a` | `p_zenbu.m4a` | — |
| `p_kitayo` | — | — | `p_kitayo.m4a` | — |
| `p_kaettayo` | — | — | `p_kaettayo.m4a` | — |
| `e_oshii` | — | — | `e_oshii.m4a` | `p_oshii.m4a` |
| `e_arere` | — | — | `e_arere.m4a` | `p_arere.m4a` |

`p_yattane`・`p_sugoi`・`e_mouikkai` は、いまはどのアプリも取り込んでいない。
ことばの語の読み（`<語id>.m4a`・`ask_<語id>.m4a`）は ことば repo 独自のクリップで、本ライブラリには含まない。

## クレジット

**VOICEVOX:ずんだもん**（VOICEVOX 利用規約に基づく）。各アプリの「おとなモード」下部にも明記している。
