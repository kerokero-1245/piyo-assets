// 部品へ渡す見た目の値（ui/tokens.ts の PiyoUiTokens）の実行時の検査を確かめる。
// tokens に既定値は無い。Provider を置き忘れた・値を 1 つ渡し忘れたときに既定の色で黙って動くと、
// 別のアプリの色や undefined の色（透明）で部品が出ても気付けない。だから実行時にも止める。
// （型の PiyoUiTokens とキーの一覧 PIYO_UI_TOKEN_KEYS が同じ集合であることは tsc が止める。tokens.ts を参照）
//
// 見るもの:
//   ① 必須キーの一覧（この一覧が変わったら、使う側の 3 本が渡す値も変わる）
//   ② 全部そろった tokens は通る
//   ③ 一覧のキーを 1 つずつ消すと、そのキーだけが欠けとして出て、assert が例外を出す（キーは一覧から列挙）
//   ④ 型の合わない値（色に数・数に文字・空の紙吹雪）も欠けとして出る
//   ⑤ Provider の外（context が undefined）は例外
import assert from "node:assert/strict";
import test from "node:test";

import {
  assertPiyoUiTokens,
  missingTokenKeys,
  PIYO_UI_TOKEN_KEYS,
  readTokens,
} from "../ui/tokens.ts";

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

function without(tokens, path) {
  const [group, key] = path.split(".");
  delete tokens[group][key];
  return tokens;
}

test("① tokens の必須キーの一覧", () => {
  assert.deepEqual([...PIYO_UI_TOKEN_KEYS].sort(), [
    "colors.buttonPressed",
    "colors.cardButtonPressed",
    "colors.confetti",
    "colors.progressNow",
    "colors.progressOff",
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
});

test("② tokens: 全部そろっていれば欠けは 0 で、assert も通る", () => {
  assert.deepEqual(missingTokenKeys(full()), []);
  assert.doesNotThrow(() => assertPiyoUiTokens(full()));
});

test("③ tokens: キーを 1 つ消すとそのキーだけが欠けとして出る（一覧の全キー）", () => {
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

test("④ tokens: 型の合わない値も欠けとして出る", () => {
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
});

test("⑤ tokens: PiyoUiProvider の外（undefined）で読むと例外", () => {
  assert.throws(() => readTokens(undefined), /PiyoUiProvider の外/);
  const t = full();
  assert.equal(readTokens(t), t);
});
