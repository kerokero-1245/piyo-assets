// testing/storage.ts（知育アプリのテストの偽の localStorage）を確かめる。
// アプリの保存（⭐の累計・設定）は globalThis.localStorage を読む。Node には無いので、テストは偽物を置いて
// 読み書きの記録と失敗を操作する。ここが崩れると、
//   - 保存の検査が偽物の都合で通る（値を文字列にしない・消したキーが残る・key/length が本物と違う）
//   - 失敗した書き込みを成功と数える（「書けなかったら保存しない」の検査が素通りする）
//   - 置いた偽物が戻らず、後のテストに漏れる（1 本のテストで 2 回置き換えて、戻す関数を t.after に渡したときも）
// のどれも、例外を出さずに起きる。
//
// 見るもの:
//   ① getItem・setItem・removeItem・clear が本物と同じ値を返す（無いキーは null・値は文字列にする）
//   ② key(i)・length は入れた順のキーと件数（範囲外の key は null）
//   ③ 呼ばれた操作は log に順に残る（失敗した操作も残り、失敗したものだけ failed: true が付く）
//   ④ failGet・failSet・failRemove でその操作だけが例外になり、中身は変わらず、log には failed: true で残る
//   ⑤ snapshot はキー順の普通のオブジェクト
//   ⑥ installLocalStorage・installThrowingLocalStorage は戻り値の関数で元の状態に戻る
//   ⑦ succeeded() は成功した操作だけ（おつかいめいろの「書けたキー」「消せたキー」の数え方が表せる）
//   ⑧ 戻す関数を置いた順に呼んでも、最初の install の前の状態に戻る（2 回呼んでも変わらない）
//   ⑨ 1 本のテストで 2 回置き換え、戻す関数をどちらも t.after に渡す（t.after は登録した順に呼ぶ）と、
//      次のテストには最初の install の前の状態が残る（⑩ が見る）
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

test("③ 呼ばれた操作は log に順に残る（失敗した操作も残り、failed: true が付く）", () => {
  const storage = new FakeStorage();
  storage.getItem("x");
  storage.setItem("x", "1");
  storage.failRemove = true;
  assert.throws(() => storage.removeItem("x"));
  storage.clear();
  assert.deepEqual(storage.log, [
    { op: "get", key: "x" },
    { op: "set", key: "x", value: "1" },
    { op: "remove", key: "x", failed: true },
    { op: "clear" },
  ]);
});

test("④ failGet・failSet・failRemove はその操作だけを例外にし、中身は変えず、log に failed: true で残る", () => {
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
  assert.deepEqual(storage.log, [
    { op: "get", key: "k", failed: true },
    { op: "set", key: "k", value: "w", failed: true },
    { op: "remove", key: "k", failed: true },
    { op: "get", key: "k" },
  ]);
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

test("⑦ succeeded() は成功した操作だけ（めいろの書けたキー・消せたキー）", () => {
  const storage = new FakeStorage({ a: "1" });
  storage.setItem("a", "2");
  storage.failSet = true;
  assert.throws(() => storage.setItem("b", "1"));
  storage.failSet = false;
  storage.failRemove = true;
  assert.throws(() => storage.removeItem("a"));
  storage.failRemove = false;
  storage.removeItem("a");
  const keysOf = (op) =>
    storage
      .succeeded()
      .filter((call) => call.op === op)
      .map((call) => call.key);
  assert.deepEqual(keysOf("set"), ["a"], "書けたキー（失敗した b は入らない）");
  assert.deepEqual(
    keysOf("remove"),
    ["a"],
    "消せたキー（失敗した 1 回目は入らない）",
  );
  assert.equal(storage.log.length, 4, "log には失敗も残る");
});

test("⑧ 戻す順が置いた順と同じでも、最初の install の前に戻る（手で呼ぶ）", () => {
  const a = installLocalStorage(new FakeStorage());
  const b = installThrowingLocalStorage();
  a();
  assert.throws(
    () => globalThis.localStorage,
    /SecurityError/,
    "b はまだ置かれている",
  );
  b();
  assert.equal(Object.hasOwn(globalThis, "localStorage"), false);
  // 2 回呼んでも何も変えない
  a();
  b();
  assert.equal(Object.hasOwn(globalThis, "localStorage"), false);
});

test("⑨ 1 本のテストで 2 回置き換え、戻す関数をどちらも t.after に渡す", (t) => {
  t.after(installLocalStorage(new FakeStorage()));
  t.after(installThrowingLocalStorage());
  assert.throws(() => globalThis.localStorage, /SecurityError/);
});

test("⑩ ⑨ の後のテストに localStorage が漏れていない", () => {
  assert.equal(Object.hasOwn(globalThis, "localStorage"), false);
});
