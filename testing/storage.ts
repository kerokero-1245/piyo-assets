// 知育アプリのテストの偽の localStorage。Node には localStorage が無いので、保存（⭐の累計・設定）が見る
// globalThis.localStorage の場所へ置き、読み書きの記録と失敗のさせ方をテストから操作する。
// 3 本の使い方で要るものだけを置く:
//   FakeStorage                  … Storage と同じ getItem・setItem・removeItem・clear・key・length。
//                                  data（中身の Map）・log（呼ばれた操作。失敗した操作も残る）・
//                                  failGet・failSet・failRemove（その操作を例外にする）・snapshot（キー順の中身）
//   installLocalStorage(storage) … globalThis.localStorage に置く（undefined も置ける）。戻り値を呼ぶと元に戻る
//   installThrowingLocalStorage() … localStorage を取り出すだけで例外になる環境（サンドボックスの iframe・
//                                  プライベートモード）。戻り値を呼ぶと元に戻る

export type StorageCall =
  | { op: "get"; key: string }
  | { op: "set"; key: string; value: string }
  | { op: "remove"; key: string }
  | { op: "clear" };

export class FakeStorage {
  readonly data: Map<string, string>;
  /** 呼ばれた操作（呼ばれた順）。「このキーには触っていない」を確かめるのに使う。 */
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
    this.log.push({ op: "get", key });
    if (this.failGet) throw new Error("FakeStorage: getItem で読めません");
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: unknown): void {
    const text = String(value);
    this.log.push({ op: "set", key, value: text });
    if (this.failSet) throw new Error("FakeStorage: setItem で書けません");
    this.data.set(key, text);
  }

  removeItem(key: string): void {
    this.log.push({ op: "remove", key });
    if (this.failRemove)
      throw new Error("FakeStorage: removeItem で消せません");
    this.data.delete(key);
  }

  clear(): void {
    this.log.push({ op: "clear" });
    this.data.clear();
  }

  /** 保存されている中身を、キー順の普通のオブジェクトにして返す（deepEqual で比べやすくする）。 */
  snapshot(): Record<string, string> {
    return Object.fromEntries(
      [...this.data].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    );
  }
}

function replaceLocalStorage(descriptor: PropertyDescriptor): () => void {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    ...descriptor,
    configurable: true,
  });
  return () => {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
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
