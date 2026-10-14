// 長押しで 1 回だけ発火させるタイマー（親ゲート: タイトルの ⚙️ を 3 秒押すと おとなモード）。
//
// 押したらタイマーを始め、離したら止める。押し直しは前のタイマーを止めてから始め直す。
// 画面を離れたとき（アンマウント）も dispose で止める。止めないと、押したまま別の操作で画面が移った
// 3 秒後に おとなモードへ飛び、親ゲートの意図に反する。react-native-web の Pressable は外れるときに
// onPressOut を呼ぶのでタイマーは消えるが、ネイティブで呼ばれない場合に備える。
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

// getFire は発火の時点で呼ぶ関数を返す（React 側は最新の onFire を返す）。
export function createLongPress(
  getFire: () => () => void,
  ms: number = LONG_PRESS_MS,
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
    }, ms);
  };
  return { onPressIn: start, onPressOut: clear, dispose: clear };
}
