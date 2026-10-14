// 長押しで 1 回だけ発火させるタイマー（親ゲート: タイトルの ⚙️ を 3 秒押すと おとなモード）。
//
// 押したらタイマーを始め、離したら止める。押し直しは前のタイマーを止めてから始め直す。
// 画面を離れたとき（アンマウント）も dispose で止める。止めないと、押したまま別の操作で画面が移った
// 3 秒後に おとなモードへ飛び、親ゲートの意図に反する。react-native-web の Pressable は外れるときに
// onPressOut を呼ぶのでタイマーは消えるが、ネイティブで呼ばれない場合に備える。
//
// ms は押した時点で読む。有限で 1 以上でない値（NaN・0・負・Infinity・数でないもの）は既定の LONG_PRESS_MS に倒す。
// そのまま setTimeout に渡すと押した直後に発火し、親ゲートが開いてしまうため（元の 3 本は定数 3000 だけを渡していた）。
//
// React に依存しない純粋なロジックにしてあり、tests/ui-longpress.test.mjs が偽の時計で確かめる。
// React から使う入口は ui/useLongPress.ts。

export const LONG_PRESS_MS = 3000;

export interface LongPressHandlers {
  onPressIn: () => void;
  onPressOut: () => void;
  // アンマウント時の後始末（残っているタイマーを止める）
  dispose: () => void;
}

// 長押しの長さ。有限で 1 以上の数だけを使い、それ以外は既定に倒す。
export function resolveLongPressMs(ms: unknown): number {
  return typeof ms === "number" && Number.isFinite(ms) && ms >= 1
    ? ms
    : LONG_PRESS_MS;
}

// getFire は発火の時点で呼ぶ関数を返す（React 側は最新の onFire を返す）。
// getMs は押した時点の ms を返す（省いたとき・undefined は既定）。
export function createLongPress(
  getFire: () => () => void,
  getMs: () => number | undefined = () => undefined,
): LongPressHandlers {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const clear = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
  const start = () => {
    clear();
    timer = setTimeout(() => {
      timer = null;
      getFire()();
    }, resolveLongPressMs(getMs()));
  };
  return { onPressIn: start, onPressOut: clear, dispose: clear };
}
