// 進捗の⭐（ui/ProgressStar.tsx）の variant の選び方が、元の 2 本の部品と同じかを確かめる。
// 画像（sticker）と絵文字（emoji）を取り違えると、例外を出さずに別のアプリの見た目で⭐が出る。
// variant は必須の props で既定を持たない。型を外れた値が来たら黙って片方に倒さず止める。
//
// 見るもの:
//   ① sticker = 画像（svg/hoshi.svg）を 24×24
//   ② emoji = 文字の ⭐ を fontSize 22・行の高さ 26・中央寄せ
//   ③ variant の一覧はこの 2 つちょうどで、一覧のどれもが別の出し方になる
//   ④ 一覧に無い値は例外
import assert from "node:assert/strict";
import test from "node:test";

import {
  PROGRESS_STAR_VARIANTS,
  progressStarMark,
} from "../ui/progressStarMark.ts";

test("① ProgressStar variant=sticker は画像 24×24", () => {
  assert.deepEqual(progressStarMark("sticker"), {
    kind: "image",
    style: { width: 24, height: 24 },
  });
});

test("② ProgressStar variant=emoji は文字の ⭐（22 / 26 / 中央）", () => {
  assert.deepEqual(progressStarMark("emoji"), {
    kind: "text",
    glyph: "⭐",
    style: { fontSize: 22, lineHeight: 26, textAlign: "center" },
  });
});

test("③ ProgressStar の variant は emoji・sticker の 2 つちょうどで、出し方が別", () => {
  assert.deepEqual([...PROGRESS_STAR_VARIANTS].sort(), ["emoji", "sticker"]);
  const kinds = PROGRESS_STAR_VARIANTS.map((v) => progressStarMark(v).kind);
  assert.equal(new Set(kinds).size, PROGRESS_STAR_VARIANTS.length);
});

test("④ ProgressStar の一覧に無い variant は例外（既定に倒さない）", () => {
  for (const bad of [undefined, "", "star", "Emoji"]) {
    assert.throws(() => progressStarMark(bad), /variant が不正/);
  }
});
