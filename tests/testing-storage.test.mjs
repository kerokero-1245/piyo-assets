// testing/storage.ts（知育アプリのテストの偽の localStorage）を確かめる。
// アプリの保存（⭐の累計・設定）は globalThis.localStorage を読む。Node には無いので、テストは偽物を置いて
// 読み書きの記録と失敗を操作する。ここが崩れると、
//   - 保存の検査が偽物の都合で通る（値を文字列にしない・消したキーが残る・key/length が本物と違う）
//   - 置いた偽物が戻らず、後のテストに漏れる
// のどれも、例外を出さずに起きる。
//
// 見るもの:
//   ① getItem・setItem・removeItem・clear が本物と同じ値を返す（無いキーは null・値は文字列にする）
//   ② key(i)・length は入れた順のキーと件数（範囲外の key は null）
//   ③ 呼ばれた操作は log に順に残る（失敗した操作も残る）
//   ④ failGet・failSet・failRemove でその操作だけが例外になり、中身は変わらない
//   ⑤ snapshot はキー順の普通のオブジェクト
//   ⑥ installLocalStorage・installThrowingLocalStorage は戻り値の関数で元の状態に戻る
import assert from "node:assert/strict";
import test from "node:test";

import {
  FakeStorage,
  installLocalStorage,
  installThrowingLocalStorage,
} from "../testing/storage.ts";

test("① 読み書きは本物と同じ値（無いキーは null・値は文字列）", () => {
  const storage = new FakeStorage({ a: "1" });
  assert.equal(storage.getItem("a"), "1");
  assert.equal(storage.getItem("none"), null);
  storage.setItem("n", 5);
  assert.equal(storage.getItem("n"), "5");
  storage.removeItem("a");
  assert.equal(storage.getItem("a"), null);
  storage.clear();
  assert.equal(storage.length, 0);
});

test("② key(i)・length は入れた順のキーと件数", () => {
  const storage = new FakeStorage({ b: "2", a: "1" });
  storage.setItem("c", "3");
  assert.equal(storage.length, 3);
  assert.deepEqual(
    [0, 1, 2, 3, -1].map((i) => storage.key(i)),
    ["b", "a", "c", null, null],
  );
  storage.removeItem("a");
  assert.equal(storage.length, 2);
  assert.equal(storage.key(1), "c");
});

test("③ 呼ばれた操作は log に順に残る（失敗した操作も残る）", () => {
  const storage = new FakeStorage();
  storage.getItem("x");
  storage.setItem("x", "1");
  storage.failRemove = true;
  assert.throws(() => storage.removeItem("x"));
  storage.clear();
  assert.deepEqual(storage.log, [
    { op: "get", key: "x" },
    { op: "set", key: "x", value: "1" },
    { op: "remove", key: "x" },
    { op: "clear" },
  ]);
});

test("④ failGet・failSet・failRemove はその操作だけを例外にし、中身は変えない", () => {
  const storage = new FakeStorage({ k: "v" });
  storage.failGet = true;
  assert.throws(() => storage.getItem("k"));
  storage.failGet = false;
  storage.failSet = true;
  assert.throws(() => storage.setItem("k", "w"));
  storage.failSet = false;
  storage.failRemove = true;
  assert.throws(() => storage.removeItem("k"));
  assert.equal(storage.getItem("k"), "v");
  assert.deepEqual(storage.snapshot(), { k: "v" });
});

test("⑤ snapshot はキー順の普通のオブジェクト", () => {
  const storage = new FakeStorage({ b: "2", a: "1" });
  assert.deepEqual(Object.keys(storage.snapshot()), ["a", "b"]);
  assert.deepEqual(storage.snapshot(), { a: "1", b: "2" });
});

test("⑥ install は戻り値の関数で元の状態に戻す（無かったものは無い状態へ）", () => {
  assert.equal(Object.hasOwn(globalThis, "localStorage"), false);
  const storage = new FakeStorage();
  const restore = installLocalStorage(storage);
  assert.equal(globalThis.localStorage, storage);
  const restoreThrowing = installThrowingLocalStorage();
  assert.throws(() => globalThis.localStorage, /SecurityError/);
  restoreThrowing();
  assert.equal(globalThis.localStorage, storage);
  const restoreMissing = installLocalStorage(undefined);
  assert.equal(globalThis.localStorage, undefined);
  restoreMissing();
  restore();
  assert.equal(Object.hasOwn(globalThis, "localStorage"), false);
});
