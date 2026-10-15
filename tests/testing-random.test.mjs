// testing/random.ts（知育アプリのテストの種つき乱数）を確かめる。
// 出題・迷路の生成は Math.random を直に使うので、テストは Math.random を種つきの乱数に差し替えて、何度回しても
// 同じ結果で再現する。ここが崩れると、
//   - 同じ種で列が変わる（失敗を同じ種で再現できない・3 本の既存の期待値（金の値）がずれる）
//   - 差し替えた Math.random が元に戻らない（後のテストが種つきのまま・例外のときに戻らない）
// のどれも、例外を出さずに起きる。
//
// 見るもの:
//   ① seededRandom は同じ種なら同じ列、違う種なら違う列で、値は 0 以上 1 未満
//   ② seededRandom は 3 本が使ってきた mulberry32 と同じ列（種 1 の最初の 3 つを固定）
//   ③ withRandom は run の間だけ Math.random を差し替えて run の戻り値を返し、例外でも元に戻す
//   ④ withSeed(seed, run) は withRandom(seededRandom(seed), run) と同じ列
//   ⑤ replaceRandom はテストの終わり（t.after）で元に戻す
import assert from "node:assert/strict";
import test from "node:test";

import {
  replaceRandom,
  seededRandom,
  withRandom,
  withSeed,
} from "../testing/random.ts";

const take = (random, n) => Array.from({ length: n }, () => random());

test("① seededRandom: 同じ種なら同じ列、違う種なら違う列、0 以上 1 未満", () => {
  assert.deepEqual(take(seededRandom(42), 50), take(seededRandom(42), 50));
  assert.notDeepEqual(take(seededRandom(42), 50), take(seededRandom(43), 50));
  for (const value of take(seededRandom(7), 1000)) {
    assert.ok(value >= 0 && value < 1, String(value));
  }
});

test("② seededRandom は mulberry32 の列（種 1 の最初の 3 つ）", () => {
  assert.deepEqual(
    take(seededRandom(1), 3),
    [0.6270739405881613, 0.002735721180215478, 0.5274470399599522],
  );
});

test("③ withRandom: run の間だけ差し替え、戻り値を返し、例外でも元に戻す", () => {
  const original = Math.random;
  assert.equal(
    withRandom(
      () => 0.25,
      () => Math.random() * 4,
    ),
    1,
  );
  assert.equal(Math.random, original);
  assert.throws(() =>
    withRandom(
      () => 0,
      () => {
        throw new Error("run の中の例外");
      },
    ),
  );
  assert.equal(Math.random, original, "例外のあとも元に戻る");
});

test("④ withSeed は withRandom(seededRandom(seed), run) と同じ列", () => {
  const original = Math.random;
  assert.deepEqual(
    withSeed(5, () => take(Math.random, 10)),
    take(seededRandom(5), 10),
  );
  assert.equal(Math.random, original);
});

test("⑤ replaceRandom: テストの終わり（t.after）で元に戻す", () => {
  const original = Math.random;
  const after = [];
  replaceRandom({ after: (fn) => after.push(fn) }, seededRandom(9));
  assert.notEqual(Math.random, original);
  assert.deepEqual(take(Math.random, 3), take(seededRandom(9), 3));
  assert.equal(after.length, 1);
  after[0]();
  assert.equal(Math.random, original);
});
