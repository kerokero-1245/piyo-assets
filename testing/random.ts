// 知育アプリのテストの種つき乱数。出題・迷路の生成は Math.random を直に使うので、テストの間だけ種つきの乱数に
// 差し替えると、何度回しても同じ結果になり、失敗したときに同じ種で再現できる。
// 3 本の使い方で要るものだけを置く:
//   seededRandom(seed)       … 種つきの乱数（mulberry32。3 本が同じ式で書いていた）
//   withRandom(random, run)  … run の間だけ Math.random を差し替える（例外でも戻す。乱数に決めた列を渡すときにも使う）
//   withSeed(seed, run)      … withRandom(seededRandom(seed), run)
//   replaceRandom(t, random) … テストの終わり（t.after）で戻す。乱数を何十万回も引くテスト向け
//                              （t.mock.method は呼び出しのたびに記録を取るので遅い）

/** 種つきの乱数（mulberry32）。同じ種なら同じ列（0 以上 1 未満）になる。 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** run の間だけ Math.random を random にする（終わったら、例外のときも元へ戻す）。 */
export function withRandom<T>(random: () => number, run: () => T): T {
  const original = Math.random;
  Math.random = random;
  try {
    return run();
  } finally {
    Math.random = original;
  }
}

/** run の間だけ Math.random を種つきにする。 */
export function withSeed<T>(seed: number, run: () => T): T {
  return withRandom(seededRandom(seed), run);
}

/** Math.random をこのテストの間だけ差し替える（node:test の t を渡す。テストが終わると元に戻す）。 */
export function replaceRandom(
  t: { after(fn: () => void): unknown },
  random: () => number,
): void {
  const original = Math.random;
  Math.random = random;
  t.after(() => {
    Math.random = original;
  });
}
