/* ぴよぴよランド 保存キーの定数（街の静的 HTML 用・依存ゼロの classic script）
 * ------------------------------------------------------------------
 * 街の燃料（⭐の累計）を入れる localStorage のキーを window.PIYO_KEYS に置く。
 * 知育 3 本が import する keys/index.ts と同じ値（2 つの値の一致は tests/keys.test.mjs が見る）。
 * 値の正本は keys/index.ts、台帳の文書は kerokero-1245.github.io の docs/WORLD.md §7。片方だけ直さない。
 *
 * 使い方（街）:
 *   <script src="…/keys.js"></script>        // window.PIYO_KEYS を定義
 *   PIYO_KEYS.TOTAL_STARS.meiro              // "meiro.totalStars"
 */
(function () {
  "use strict";

  if (typeof window !== "undefined") {
    window.PIYO_KEYS = Object.freeze({
      TOTAL_STARS: Object.freeze({
        meiro: "meiro.totalStars",
        sansu: "sansu.totalStars",
        kotoba: "kotoba.totalStars",
      }),
    });
  }
})();
