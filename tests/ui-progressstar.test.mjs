// 進捗の⭐（ui/ProgressStar.tsx）の出し方（mark）が、元の 2 本の部品と同じかを確かめる。
// 画像（シールポップの hoshi.svg）と文字（⭐）を取り違えると、例外を出さずに別のアプリの見た目で⭐が出る。
// mark は必須の props で既定を持たない。型を外れた値が来たら黙って片方に倒さず止める。
// 画像の mark（STICKER_MARK）は絵を require するので ui/ProgressStarSticker.ts に分けてあり、
// Node の素の読み込みでは読めない（require が無い）。その中身は tests/testing-register.test.mjs が
// testing/register.mjs を通して読んで確かめる。
//
// 見るもの:
//   ① EMOJI_MARK = 文字の ⭐ を fontSize 22・行の高さ 26・中央寄せ
//   ② 画像の mark = 渡した source をそのまま 24×24
//   ③ 古い variant の文字列（"emoji"・"sticker"）や、kind・source・glyph の欠けた mark は例外
//   ④ EMOJI_MARK は書き換えられない（凍結。部品の外から ⭐ を差し替えて、別のアプリの⭐にしない）
import assert from "node:assert/strict";
import test from "node:test";

import { EMOJI_MARK, progressStarMarkView } from "../ui/progressStarMark.ts";

test("① ProgressStar mark=EMOJI_MARK は文字の ⭐（22 / 26 / 中央）", () => {
  assert.deepEqual(EMOJI_MARK, { kind: "text", glyph: "⭐" });
  assert.deepEqual(progressStarMarkView(EMOJI_MARK), {
    kind: "text",
    glyph: "⭐",
    style: { fontSize: 22, lineHeight: 26, textAlign: "center" },
  });
});

test("② ProgressStar の画像の mark は、渡した source を 24×24", () => {
  const source = { uri: "hoshi.svg" };
  assert.deepEqual(progressStarMarkView({ kind: "image", source }), {
    kind: "image",
    source,
    style: { width: 24, height: 24 },
  });
  // Metro は native で数値の素材 id を返すので、数も source として通す
  assert.equal(progressStarMarkView({ kind: "image", source: 7 }).source, 7);
});

test("③ ProgressStar の不正な mark は例外（既定に倒さない）", () => {
  for (const bad of [
    undefined,
    null,
    "",
    "emoji",
    "sticker",
    {},
    { kind: "emoji" },
    { kind: "image" },
    { kind: "image", source: null },
    { kind: "text" },
    { kind: "text", glyph: "" },
    { kind: "text", glyph: 1 },
  ]) {
    assert.throws(
      () => progressStarMarkView(bad),
      /mark が不正/,
      JSON.stringify(bad),
    );
  }
});

test("④ EMOJI_MARK は凍結されている", () => {
  assert.ok(Object.isFrozen(EMOJI_MARK));
  assert.throws(() => {
    EMOJI_MARK.glyph = "🌟";
  }, TypeError);
});
