// 長押し（useLongPress の中身 = ui/longPress.ts の createLongPress）が、親ゲートの約束どおりに動くかを確かめる。
// 親ゲートは「タイトルの ⚙️ を 3 秒押し続けたときだけ おとなモードへ入る」。ここが崩れると、
//   - 3 秒より短い押下で入れてしまう（こどもが偶然 おとなモードに入る）
//   - 離したのに入る・画面を離れた後に入る（押したまま別の操作で画面が移った 3 秒後に飛ぶ）
// のどれも、例外を出さずに起きる。
//
// 見るもの（偽の時計 node:test の mock.timers で時間を進める。実時間は待たない）:
//   ① 既定の ms は 3000（ms を省いたとき 2999ms では発火せず、3000ms ちょうどで 1 回だけ発火）
//   ② 押して離すと発火しない（3 秒より前に離した場合）
//   ③ dispose（アンマウントの後始末）で残りのタイマーが止まる
//   ④ 押し直すと前のタイマーは捨てて、押し直した時点から数え直す
//   ⑤ 発火の時点で getFire を呼ぶ（React 側は最新の onFire を返す）
//   ⑥ ms を渡すとその長さで発火する
// React のフック（ui/useLongPress.ts）そのものは描画の道具が無いので動かさない。
// フックは createLongPress に ms をそのまま渡し、アンマウントで dispose を呼ぶだけの薄い入口にしてある。
import assert from "node:assert/strict";
import { mock, test } from "node:test";

import { createLongPress, LONG_PRESS_MS } from "../ui/longPress.ts";

function setup(ms) {
  mock.timers.enable({ apis: ["setTimeout"] });
  const calls = [];
  const fire = () => calls.push("fire");
  const handlers =
    ms === undefined
      ? createLongPress(() => fire)
      : createLongPress(() => fire, ms);
  return { calls, handlers };
}

test("① useLongPress の既定: ms を省くと 2999ms では発火せず、3000ms で 1 回だけ発火する", (t) => {
  t.after(() => mock.timers.reset());
  assert.equal(LONG_PRESS_MS, 3000);
  const { calls, handlers } = setup();
  handlers.onPressIn();
  mock.timers.tick(2999);
  assert.deepEqual(calls, [], "3 秒より前に発火した");
  mock.timers.tick(1);
  assert.deepEqual(calls, ["fire"]);
  // 押したままさらに待っても 2 回目は無い（1 回だけ）
  mock.timers.tick(10_000);
  assert.deepEqual(calls, ["fire"]);
});

test("② useLongPress: 押して 3 秒より前に離すと発火しない", (t) => {
  t.after(() => mock.timers.reset());
  const { calls, handlers } = setup();
  handlers.onPressIn();
  mock.timers.tick(2000);
  handlers.onPressOut();
  mock.timers.tick(10_000);
  assert.deepEqual(calls, []);
});

test("③ useLongPress: アンマウント（dispose）で残りのタイマーが止まる", (t) => {
  t.after(() => mock.timers.reset());
  const { calls, handlers } = setup();
  handlers.onPressIn();
  mock.timers.tick(1000);
  handlers.dispose();
  mock.timers.tick(10_000);
  assert.deepEqual(calls, []);
});

test("④ useLongPress: 押し直すと押し直した時点から 3 秒を数え直す", (t) => {
  t.after(() => mock.timers.reset());
  const { calls, handlers } = setup();
  handlers.onPressIn();
  mock.timers.tick(2000);
  handlers.onPressIn();
  mock.timers.tick(2999);
  assert.deepEqual(calls, [], "最初の押下から数えて発火した");
  mock.timers.tick(1);
  assert.deepEqual(calls, ["fire"]);
});

test("⑤ useLongPress: 発火の時点の getFire() を呼ぶ（押した後に差し替えた関数が呼ばれる）", (t) => {
  t.after(() => mock.timers.reset());
  mock.timers.enable({ apis: ["setTimeout"] });
  const calls = [];
  let current = () => calls.push("old");
  const handlers = createLongPress(() => current);
  handlers.onPressIn();
  current = () => calls.push("new");
  mock.timers.tick(LONG_PRESS_MS);
  assert.deepEqual(calls, ["new"]);
});

test("⑥ useLongPress: ms を渡すとその長さで発火する", (t) => {
  t.after(() => mock.timers.reset());
  const { calls, handlers } = setup(500);
  handlers.onPressIn();
  mock.timers.tick(499);
  assert.deepEqual(calls, []);
  mock.timers.tick(1);
  assert.deepEqual(calls, ["fire"]);
});
