// 保存キーの定数が 2 か所で食い違う事故を防ぐ。
// keys/index.ts（知育 3 本が import する）と keys/keys.js（街の静的 HTML が <script> で読む window.PIYO_KEYS）は、
// 同じ 3 つの値を手で 2 回書いている。片方だけ直すと、知育 3 本が書くキーと街が読むキーがずれ、
// 街の燃料（⭐の合計）が例外も出さずに 0 になる。
//
// 見るもの:
//   ① 2 つの TOTAL_STARS が同じ値
//   ② キーが meiro・sansu・kotoba の 3 つちょうど（空・欠け・余りでは通らない）
//   ③ 各値が「<キー名>.totalStars」の形（期待する値をこのテストにも書かない。書くと 3 回目の写しになる）
// キーの順序や引用符の違いは見ない（値が同じなら通る）。
//
// 読み方: index.ts は Node の型の剥ぎ取りでそのまま import する。keys.js はブラウザ用の classic script なので、
// window だけを持つ vm の中で評価して window.PIYO_KEYS を取り出す。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

import { TOTAL_STARS as fromIndexTs } from "../keys/index.ts";

function loadTotalStarsFromKeysJs() {
  const source = readFileSync(
    new URL("../keys/keys.js", import.meta.url),
    "utf8",
  );
  const window = {};
  vm.runInNewContext(source, { window }, { filename: "keys/keys.js" });
  assert.ok(
    window.PIYO_KEYS?.TOTAL_STARS,
    "keys.js が window.PIYO_KEYS.TOTAL_STARS を定義していない",
  );
  return window.PIYO_KEYS.TOTAL_STARS;
}

// vm の中で作った object は prototype が別の realm のものになり、構造が同じでも deepStrictEqual が落ちる。
// 比べる前に、このテストの realm の素の object へ写す。
const plain = (object) => Object.fromEntries(Object.entries(object));

test("① index.ts と keys.js の TOTAL_STARS は同じ値", () => {
  assert.deepStrictEqual(plain(loadTotalStarsFromKeysJs()), plain(fromIndexTs));
});

test("② キーは meiro・sansu・kotoba の 3 つちょうど（index.ts・keys.js とも）", () => {
  const expected = ["kotoba", "meiro", "sansu"];
  assert.deepStrictEqual(Object.keys(fromIndexTs).sort(), expected);
  assert.deepStrictEqual(
    Object.keys(loadTotalStarsFromKeysJs()).sort(),
    expected,
  );
});

test("③ 値は「<キー名>.totalStars」の形（index.ts・keys.js とも）", () => {
  const sources = [
    ["index.ts", fromIndexTs],
    ["keys.js", loadTotalStarsFromKeysJs()],
  ];
  for (const [file, totalStars] of sources) {
    for (const [key, value] of Object.entries(totalStars)) {
      assert.equal(value, `${key}.totalStars`, `${file} の ${key}`);
    }
  }
});
