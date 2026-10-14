// 部品へ渡す見た目の値（ui/tokens.ts の PiyoUiTokens）の実行時の検査と、その配線を確かめる。
// tokens に既定値は無い。Provider を置き忘れた・値を 1 つ渡し忘れたときに既定の色で黙って動くと、
// 別のアプリの色や undefined の色（透明）で部品が出ても気付けない。だから実行時にも止める。
// 必須は群ごと: 全体の群（どの部品も使い得る値）は Provider が検査し、ProgressStar の群（進捗ドットの 2 色）は
// ProgressStar を描くときにだけ検査する（ProgressStar を使わないアプリ = おつかいめいろ は渡さなくてよい）。
// （型の PiyoUiTokens とキーの一覧・値の種類の表が同じ集合であることは tsc が止める。tokens.ts を参照）
//
// 見るもの:
//   ① 群ごとのキーの一覧（この一覧が変わったら、使う側の 3 本が渡す値も変わる）
//   ② 全部そろった tokens は通る。progress の群が無くても全体の群の検査は通る
//   ③ 全体の群のキーを 1 つずつ消すと、そのキーだけが欠けとして出て、assert が例外を出す（キーは一覧から列挙）
//   ④ ProgressStar の群: そろえば 2 色を返し、1 つでも無ければ ProgressStar の名前と足りないキーを書いた例外
//   ⑤ 型の合わない値（色に数・数に文字・空の紙吹雪・紙吹雪の要素が文字でない）も欠けとして出る
//   ⑥ Provider の外（context が undefined）は例外
//   ⑦ PiyoUiProvider を関数として呼ぶ: 欠けは例外、そろえば渡した tokens を context の値にする（progress の群は見ない）
//   ⑧ usePiyoUiTokens を描く（react-test-renderer）: Provider の内側は渡した tokens、外側は例外
import assert from "node:assert/strict";
import test from "node:test";
import { act, createElement } from "react";
import TestRenderer from "react-test-renderer";

import {
  assertPiyoUiTokens,
  missingTokenKeys,
  PIYO_UI_PROGRESS_TOKEN_KEYS,
  PIYO_UI_TOKEN_KEYS,
  PiyoUiProvider,
  readProgressTokens,
  readTokens,
  usePiyoUiTokens,
} from "../ui/tokens.ts";

// react-test-renderer は React 19 で非推奨の案内を console.error に出す。その 1 文だけを黙らせる。
// 描画中の例外を React が console.error に出す分は、⑧ の中だけ黙らせる。
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const consoleError = console.error;
let quiet = false;
console.error = (...args) => {
  if (quiet) return;
  if (String(args[0]).startsWith("react-test-renderer is deprecated")) return;
  consoleError(...args);
};

const full = () => ({
  colors: {
    surface: "#FFFFFF",
    text: "#000001",
    white: "#FFFFFE",
    townBorder: "#000002",
    townPressed: "#000003",
    buttonPressed: "#000004",
    cardButtonPressed: "#000005",
    progressNow: "#000006",
    progressOff: "#000007",
    confetti: ["#000008", "#000009"],
  },
  font: { huge: 4, title: 3, big: 2, body: 1 },
  space: { xs: 1, sm: 2, md: 3, lg: 4 },
  radius: { md: 1, lg: 2, pill: 999 },
});

// ProgressStar の群を渡さないアプリ（おつかいめいろ）の形
const withoutProgress = () => {
  const t = full();
  delete t.colors.progressNow;
  delete t.colors.progressOff;
  return t;
};

function without(tokens, path) {
  const [group, key] = path.split(".");
  delete tokens[group][key];
  return tokens;
}

test("① 群ごとのキーの一覧: 全体の群と ProgressStar の群", () => {
  assert.deepEqual([...PIYO_UI_TOKEN_KEYS].sort(), [
    "colors.buttonPressed",
    "colors.cardButtonPressed",
    "colors.confetti",
    "colors.surface",
    "colors.text",
    "colors.townBorder",
    "colors.townPressed",
    "colors.white",
    "font.big",
    "font.body",
    "font.huge",
    "font.title",
    "radius.lg",
    "radius.md",
    "radius.pill",
    "space.lg",
    "space.md",
    "space.sm",
    "space.xs",
  ]);
  assert.deepEqual([...PIYO_UI_PROGRESS_TOKEN_KEYS].sort(), [
    "colors.progressNow",
    "colors.progressOff",
  ]);
  const overlap = PIYO_UI_PROGRESS_TOKEN_KEYS.filter((k) =>
    PIYO_UI_TOKEN_KEYS.includes(k),
  );
  assert.deepEqual(overlap, [], "2 つの群に同じキーがある");
});

test("② tokens 群ごと: 全部そろえば通り、ProgressStar の群が無くても全体の群の検査は通る", () => {
  assert.deepEqual(missingTokenKeys(full()), []);
  assert.doesNotThrow(() => assertPiyoUiTokens(full()));
  assert.deepEqual(missingTokenKeys(withoutProgress()), []);
  assert.doesNotThrow(() => assertPiyoUiTokens(withoutProgress()));
});

test("③ tokens: 全体の群のキーを 1 つ消すとそのキーだけが欠けとして出る（一覧の全キー）", () => {
  assert.ok(PIYO_UI_TOKEN_KEYS.length > 0, "キーの一覧が空");
  for (const path of PIYO_UI_TOKEN_KEYS) {
    assert.deepEqual(missingTokenKeys(without(full(), path)), [path], path);
    assert.throws(
      () => assertPiyoUiTokens(without(full(), path)),
      new RegExp(path.replace(".", "\\.")),
      path,
    );
  }
});

test("④ tokens 群ごと: ProgressStar の群はそろえば 2 色を返し、無ければ ProgressStar の名前と足りないキーで落ちる", () => {
  assert.deepEqual(readProgressTokens(full()), {
    progressNow: "#000006",
    progressOff: "#000007",
  });
  assert.throws(
    () => readProgressTokens(withoutProgress()),
    (error) =>
      error instanceof Error &&
      error.message.includes("ProgressStar") &&
      error.message.includes("colors.progressNow") &&
      error.message.includes("colors.progressOff"),
  );
  assert.ok(PIYO_UI_PROGRESS_TOKEN_KEYS.length > 0, "群のキーの一覧が空");
  for (const path of PIYO_UI_PROGRESS_TOKEN_KEYS) {
    const t = without(full(), path);
    assert.deepEqual(
      missingTokenKeys(t, PIYO_UI_PROGRESS_TOKEN_KEYS),
      [path],
      path,
    );
    assert.throws(
      () => readProgressTokens(t),
      new RegExp(`ProgressStar[\\s\\S]*${path.replace(".", "\\.")}`),
      path,
    );
  }
  const empty = full();
  empty.colors.progressNow = "";
  assert.throws(() => readProgressTokens(empty), /colors\.progressNow/);
});

test("⑤ tokens: 型の合わない値も欠けとして出る", () => {
  const t = full();
  t.colors.townBorder = 123;
  t.font.body = "20";
  t.colors.confetti = [];
  t.space.md = Number.NaN;
  assert.deepEqual(missingTokenKeys(t).sort(), [
    "colors.confetti",
    "colors.townBorder",
    "font.body",
    "space.md",
  ]);
  assert.deepEqual(missingTokenKeys(undefined), [...PIYO_UI_TOKEN_KEYS]);
  // 紙吹雪の要素は空でない文字列の色
  for (const bad of [[1, null], ["#FF0000", ""], [undefined], "#FF0000"]) {
    const c = full();
    c.colors.confetti = bad;
    assert.deepEqual(
      missingTokenKeys(c),
      ["colors.confetti"],
      JSON.stringify(bad),
    );
  }
});

test("⑥ tokens: PiyoUiProvider の外（undefined）で読むと例外", () => {
  assert.throws(() => readTokens(undefined), /PiyoUiProvider の外/);
  const t = full();
  assert.equal(readTokens(t), t);
});

test("⑦ PiyoUiProvider（関数として呼ぶ）群ごと: 全体の群の欠けは例外、そろえば渡した tokens を値にする", () => {
  assert.throws(
    () => PiyoUiProvider({ tokens: without(full(), "colors.surface") }),
    /PiyoUiProvider の tokens に足りない値があります: colors\.surface/,
  );
  for (const tokens of [full(), withoutProgress()]) {
    const element = PiyoUiProvider({ tokens });
    assert.equal(element.props.value, tokens);
  }
});

test("⑧ usePiyoUiTokens を描く: Provider の内側は渡した tokens、外側は例外", () => {
  const seen = [];
  function Probe() {
    seen.push(usePiyoUiTokens());
    return null;
  }
  const tokens = withoutProgress();
  let renderer;
  act(() => {
    renderer = TestRenderer.create(
      createElement(PiyoUiProvider, { tokens }, createElement(Probe)),
    );
  });
  assert.ok(seen.length > 0, "描かれていない");
  assert.ok(
    seen.every((s) => s === tokens),
    "渡した tokens が届いていない",
  );
  act(() => renderer.unmount());

  quiet = true;
  try {
    assert.throws(
      () =>
        act(() => {
          TestRenderer.create(createElement(Probe));
        }),
      /PiyoUiProvider の外/,
    );
  } finally {
    quiet = false;
  }
});
