// 知育アプリのテストの偽の localStorage。Node には localStorage が無いので、保存（⭐の累計・設定）が見る
// globalThis.localStorage の場所へ置き、読み書きの記録と失敗のさせ方をテストから操作する。
// 3 本の使い方から決めた構成（和集合ではない。installThrowingLocalStorage はおつかいめいろだけが使う）:
//   FakeStorage                  … Storage と同じ getItem・setItem・removeItem・clear・key・length。
//                                  data（中身の Map）・log（呼ばれた操作。失敗した操作も failed: true を付けて残る）・
//                                  succeeded()（成功した操作だけ）・failGet・failSet・failRemove（その操作を例外にする）・
//                                  snapshot（キー順の中身）
//   installLocalStorage(storage) … globalThis.localStorage に置く（undefined も置ける）。戻り値を呼ぶと元に戻る
//   installThrowingLocalStorage() … localStorage を取り出すだけで例外になる環境（サンドボックスの iframe・
//                                  プライベートモード）。戻り値を呼ぶと元に戻る
// install は積み上げ式: 戻す関数をどの順で呼んでも、全部呼べば最初の install の前の状態に戻る
// （node:test の t.after は登録した順に呼ぶので、1 本のテストで 2 回置き換えても次のテストに漏れない）。

export type StorageCall = (
  | { op: "get"; key: string }
  | { op: "set"; key: string; value: string }
  | { op: "remove"; key: string }
  | { op: "clear" }
) & {
  /** その操作が例外を投げたときだけ true（成功した操作には付かない）。 */
  failed?: true;
};

export class FakeStorage {
  readonly data: Map<string, string>;
  /** 呼ばれた操作（呼ばれた順。失敗した操作も failed: true で残る）。「このキーには触っていない」を確かめるのに使う。 */
  readonly log: StorageCall[] = [];
  /** true にすると、その操作が例外を投げる（容量超過・プライベートモードなどの再現）。 */
  failGet = false;
  failSet = false;
  failRemove = false;

  constructor(initial: Record<string, string> = {}) {
    this.data = new Map(Object.entries(initial));
  }

  get length(): number {
    return this.data.size;
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    if (this.failGet) {
      this.log.push({ op: "get", key, failed: true });
      throw new Error("FakeStorage: getItem で読めません");
    }
    this.log.push({ op: "get", key });
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: unknown): void {
    const text = String(value);
    if (this.failSet) {
      this.log.push({ op: "set", key, value: text, failed: true });
      throw new Error("FakeStorage: setItem で書けません");
    }
    this.log.push({ op: "set", key, value: text });
    this.data.set(key, text);
  }

  removeItem(key: string): void {
    if (this.failRemove) {
      this.log.push({ op: "remove", key, failed: true });
      throw new Error("FakeStorage: removeItem で消せません");
    }
    this.log.push({ op: "remove", key });
    this.data.delete(key);
  }

  clear(): void {
    this.log.push({ op: "clear" });
    this.data.clear();
  }

  /** 成功した操作だけ（呼ばれた順）。「書けたキー」「消せたキー」を数えるのに使う。 */
  succeeded(): StorageCall[] {
    return this.log.filter((call) => call.failed !== true);
  }

  /** 保存されている中身を、キー順の普通のオブジェクトにして返す（deepEqual で比べやすくする）。 */
  snapshot(): Record<string, string> {
    return Object.fromEntries(
      [...this.data].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    );
  }
}

// いま置いている偽物（置いた順）と、最初の install の前の localStorage
const installed: PropertyDescriptor[] = [];
let before: PropertyDescriptor | undefined;

function replaceLocalStorage(descriptor: PropertyDescriptor): () => void {
  if (installed.length === 0) {
    before = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  }
  const entry: PropertyDescriptor = { ...descriptor, configurable: true };
  installed.push(entry);
  Object.defineProperty(globalThis, "localStorage", entry);
  return () => {
    const at = installed.indexOf(entry);
    if (at === -1) return; // 2 回目の呼び出しは何もしない
    installed.splice(at, 1);
    const top = installed.at(-1) ?? before;
    if (top) Object.defineProperty(globalThis, "localStorage", top);
    else Reflect.deleteProperty(globalThis, "localStorage");
  };
}

/** globalThis.localStorage に storage を置く。戻り値を呼ぶと元の状態へ戻る（t.after に渡す）。 */
export function installLocalStorage(
  storage: FakeStorage | undefined,
): () => void {
  return replaceLocalStorage({ value: storage, writable: true });
}

/** localStorage を取り出すこと自体が例外になる環境にする。戻り値を呼ぶと元の状態へ戻る。 */
export function installThrowingLocalStorage(): () => void {
  return replaceLocalStorage({
    get() {
      throw new Error("SecurityError: localStorage にアクセスできません");
    },
  });
}
