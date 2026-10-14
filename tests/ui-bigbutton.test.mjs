// 大ボタン（ui/BigButton.tsx）の size → 見た目の対応と、色の決め方が、元の 3 本の部品と同じかを確かめる。
// 3 本の部品を 1 つにまとめたとき、size の対応や押下色を取り違えると、画面は例外を出さずに
// 一回り大きい・小さいボタンや別の押下色で出る（こども側のボタンが小さくなる、おとなモードのラベルが折り返す）。
//
// 見るもの:
//   ① size の既定は "big"
//   ② big・huge・small の 3 値それぞれの style（高さ・余白・角丸・絵文字と文字の大きさ・行数）
//   ③ 影は 3 値で同じ
//   ④ 色: 色なし = 白いカード（surface）・押下 cardButtonPressed・文字 text /
//         色あり = その色・押下 buttonPressed・文字 white / props の上書きが勝つ
// tokens はすべて別々の値にして、どの値を拾ったかで取り違えが分かるようにする（実物の theme の値は使わない）。
import assert from "node:assert/strict";
import test from "node:test";

import {
  BIG_BUTTON_DEFAULT_SIZE,
  bigButtonColors,
  bigButtonStyles,
} from "../ui/bigButtonStyle.ts";

const T = {
  font: { huge: 104, title: 103, big: 102, body: 101 },
  space: { xs: 201, sm: 202, md: 203, lg: 204 },
  radius: { md: 301, lg: 302 },
  colors: {
    surface: "surface",
    text: "text",
    white: "white",
    buttonPressed: "buttonPressed",
    cardButtonPressed: "cardButtonPressed",
  },
};

// 期待値（元の部品の StyleSheet をそのまま重ねた結果）
const EXPECTED = {
  big: {
    button: {
      minHeight: 76,
      borderRadius: T.radius.lg,
      paddingVertical: T.space.md,
      paddingHorizontal: T.space.lg,
    },
    emoji: { fontSize: T.font.title, marginRight: T.space.sm },
    label: { fontSize: T.font.big, fontWeight: "800" },
    numberOfLines: undefined,
  },
  huge: {
    button: {
      minHeight: 104,
      borderRadius: T.radius.lg,
      paddingVertical: T.space.md,
      paddingHorizontal: T.space.lg,
    },
    emoji: { fontSize: T.font.huge, marginRight: T.space.sm },
    label: { fontSize: T.font.huge, fontWeight: "800" },
    numberOfLines: undefined,
  },
  small: {
    button: {
      minHeight: 64,
      borderRadius: T.radius.md,
      paddingVertical: T.space.sm,
      paddingHorizontal: T.space.md,
    },
    emoji: { fontSize: T.font.big, marginRight: T.space.xs },
    label: { fontSize: T.font.body, fontWeight: "800" },
    numberOfLines: 1,
  },
};

const SHADOW = {
  justifyContent: "center",
  alignItems: "center",
  shadowColor: "#00000040",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.18,
  shadowRadius: 5,
  elevation: 3,
};

test("① BigButton の size の既定は big", () => {
  assert.equal(BIG_BUTTON_DEFAULT_SIZE, "big");
});

for (const size of Object.keys(EXPECTED)) {
  test(`② BigButton size=${size} の style`, () => {
    const s = bigButtonStyles(size, T);
    const e = EXPECTED[size];
    assert.deepEqual(s.button, { ...SHADOW, ...e.button });
    assert.deepEqual(s.emoji, e.emoji);
    assert.deepEqual(s.label, e.label);
    assert.equal(s.numberOfLines, e.numberOfLines);
  });
}

test("③ BigButton の 3 値は size の数（3）だけ別の高さになる", () => {
  const heights = Object.keys(EXPECTED).map(
    (size) => bigButtonStyles(size, T).button.minHeight,
  );
  assert.equal(heights.length, 3);
  assert.equal(new Set(heights).size, 3);
});

test("④ BigButton の色: 色なしは白いカード、色ありはその色、props の上書きが勝つ", () => {
  assert.deepEqual(bigButtonColors({}, T), {
    background: "surface",
    pressedBackground: "cardButtonPressed",
    text: "text",
  });
  assert.deepEqual(bigButtonColors({ color: "#123456" }, T), {
    background: "#123456",
    pressedBackground: "buttonPressed",
    text: "white",
  });
  assert.deepEqual(
    bigButtonColors(
      { color: "#123456", pressedColor: "#abcdef", textColor: "#000000" },
      T,
    ),
    { background: "#123456", pressedBackground: "#abcdef", text: "#000000" },
  );
});
