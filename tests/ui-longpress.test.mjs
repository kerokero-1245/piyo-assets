// 長押し（ui/longPress.ts の createLongPress と、React の入口 ui/useLongPress.ts）が、親ゲートの約束どおりに動くかを確かめる。
// 親ゲートは「タイトルの ⚙️ を 3 秒押し続けたときだけ おとなモードへ入る」。ここが崩れると、
//   - 3 秒より短い押下で入れてしまう（こどもが偶然 おとなモードに入る。ms が NaN・0・負のときも同じ）
//   - 離したのに入る・画面を離れた後に入る（押したまま別の操作で画面が移った 3 秒後に飛ぶ）
// のどれも、例外を出さずに起きる。
//
// 見るもの（偽の時計 node:test の mock.timers で時間を進める。実時間は待たない）:
//   createLongPress（React に依存しない中身）
//   ① 既定の ms は 3000（ms を省いたとき 2999ms では発火せず、3000ms ちょうどで 1 回だけ発火）
//   ② 押して離すと発火しない（3 秒より前に離した場合）
//   ③ dispose（アンマウントの後始末）で残りのタイマーが止まる
//   ④ 押し直すと前のタイマーは捨てて、押し直した時点から数え直す
//   ⑤ 発火の時点で getFire を呼ぶ（React 側は最新の onFire を返す）
//   ⑥ ms を渡すとその長さで発火する
//   ⑦ 有限で 1 以上でない ms（NaN・0・-1・Infinity・0.5・文字）は既定の 3000 に倒す
//   useLongPress（react-test-renderer で描いて、フックの配線を見る）
//   ⑧ ms を省くと既定の 3000、渡すとその長さ（フックが ms をそのまま中身へ渡す）
//   ⑨ アンマウントで残りのタイマーが止まる（フックが dispose を呼ぶ）
//   ⑩ 押している間に描き直して onFire が変わると、発火の時点の onFire を呼ぶ。描き直しで押下は取り消されない
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { mock, test } from "node:test";
import { act, createElement } from "react";
import TestRenderer from "react-test-renderer";

import { createLongPress, LONG_PRESS_MS } from "../ui/longPress.ts";

// ui/useLongPress.ts は拡張子なしの相対 import（"./longPress"）を持つ（Metro と tsc の書き方）。
// Node はそのままでは解決できないので、このテストの中だけ ".ts" を補って読む。
registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/.test(specifier)) {
        return next(`${specifier}.ts`, context);
      }
      throw error;
    }
  },
});
const { useLongPress } = await import("../ui/useLongPress.ts");

// react-test-renderer は React 19 で非推奨の案内を console.error に出す。その 1 文だけを黙らせる。
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const consoleError = console.error;
console.error = (...args) => {
  if (String(args[0]).startsWith("react-test-renderer is deprecated")) return;
  consoleError(...args);
};

function setup(ms) {
  mock.timers.enable({ apis: ["setTimeout"] });
  const calls = [];
  const fire = () => calls.push("fire");
  const handlers =
    ms === undefined
      ? createLongPress(() => fire)
      : createLongPress(
          () => fire,
          () => ms,
        );
  return { calls, handlers };
}

test("① createLongPress の既定: ms を省くと 2999ms では発火せず、3000ms で 1 回だけ発火する", (t) => {
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

test("② createLongPress: 押して 3 秒より前に離すと発火しない", (t) => {
  t.after(() => mock.timers.reset());
  const { calls, handlers } = setup();
  handlers.onPressIn();
  mock.timers.tick(2000);
  handlers.onPressOut();
  mock.timers.tick(10_000);
  assert.deepEqual(calls, []);
});

test("③ createLongPress: アンマウント（dispose）で残りのタイマーが止まる", (t) => {
  t.after(() => mock.timers.reset());
  const { calls, handlers } = setup();
  handlers.onPressIn();
  mock.timers.tick(1000);
  handlers.dispose();
  mock.timers.tick(10_000);
  assert.deepEqual(calls, []);
});

test("④ createLongPress: 押し直すと押し直した時点から 3 秒を数え直す", (t) => {
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

test("⑤ createLongPress: 発火の時点の getFire() を呼ぶ（押した後に差し替えた関数が呼ばれる）", (t) => {
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

test("⑥ createLongPress: ms を渡すとその長さで発火する", (t) => {
  t.after(() => mock.timers.reset());
  const { calls, handlers } = setup(500);
  handlers.onPressIn();
  mock.timers.tick(499);
  assert.deepEqual(calls, []);
  mock.timers.tick(1);
  assert.deepEqual(calls, ["fire"]);
});

for (const bad of [Number.NaN, 0, -1, Number.POSITIVE_INFINITY, 0.5, "500"]) {
  test(`⑦ createLongPress: ms=${String(bad)} は既定の 3000 に倒す（押した直後に発火しない）`, (t) => {
    t.after(() => mock.timers.reset());
    const { calls, handlers } = setup(bad);
    handlers.onPressIn();
    mock.timers.tick(1);
    assert.deepEqual(calls, [], "押した直後に発火した");
    mock.timers.tick(LONG_PRESS_MS - 2);
    assert.deepEqual(calls, [], "3 秒より前に発火した");
    mock.timers.tick(1);
    assert.deepEqual(calls, ["fire"]);
  });
}

// useLongPress を描く。返り値の handlers は最後に描いたときのもの。
function renderHook(props) {
  const box = { handlers: null };
  function Probe({ onFire, ms }) {
    box.handlers = useLongPress(onFire, ms);
    return null;
  }
  let renderer;
  act(() => {
    renderer = TestRenderer.create(createElement(Probe, props));
  });
  return {
    box,
    rerender: (next) =>
      act(() => {
        renderer.update(createElement(Probe, next));
      }),
    unmount: () =>
      act(() => {
        renderer.unmount();
      }),
  };
}

test("⑧ useLongPress(onFire): ms を省くと 3000、ms を渡すとその長さで発火する", (t) => {
  t.after(() => mock.timers.reset());
  mock.timers.enable({ apis: ["setTimeout"] });
  const calls = [];
  const a = renderHook({ onFire: () => calls.push("default") });
  a.box.handlers.onPressIn();
  mock.timers.tick(2999);
  assert.deepEqual(calls, [], "既定の 3 秒より前に発火した");
  mock.timers.tick(1);
  assert.deepEqual(calls, ["default"]);
  a.unmount();

  const b = renderHook({ onFire: () => calls.push("500"), ms: 500 });
  b.box.handlers.onPressIn();
  mock.timers.tick(499);
  assert.deepEqual(calls, ["default"]);
  mock.timers.tick(1);
  assert.deepEqual(calls, ["default", "500"]);
  b.unmount();
});

test("⑨ useLongPress(onFire): 押したままアンマウントすると発火しない", (t) => {
  t.after(() => mock.timers.reset());
  mock.timers.enable({ apis: ["setTimeout"] });
  const calls = [];
  const h = renderHook({ onFire: () => calls.push("fire") });
  h.box.handlers.onPressIn();
  mock.timers.tick(1000);
  h.unmount();
  mock.timers.tick(10_000);
  assert.deepEqual(calls, [], "画面を離れた後に発火した");
});

test("⑩ useLongPress(onFire): 押している間に描き直すと、発火の時点の onFire を呼ぶ（押下は取り消されない）", (t) => {
  t.after(() => mock.timers.reset());
  mock.timers.enable({ apis: ["setTimeout"] });
  const calls = [];
  const h = renderHook({ onFire: () => calls.push("old") });
  const first = h.box.handlers;
  h.box.handlers.onPressIn();
  mock.timers.tick(1000);
  h.rerender({ onFire: () => calls.push("new") });
  assert.equal(
    h.box.handlers.onPressIn,
    first.onPressIn,
    "描き直しで作り直された",
  );
  mock.timers.tick(LONG_PRESS_MS - 1000);
  assert.deepEqual(calls, ["new"]);
  h.unmount();
});
