// 長押しの React フック。ロジックは ui/longPress.ts（理由もそちら）。
// 返す onPressIn・onPressOut を Pressable に渡す。アンマウントで残りのタイマーを止める。
// ms を省くと createLongPress の既定（LONG_PRESS_MS = 3 秒）。既定値と不正な ms の扱いは longPress.ts の 1 か所だけに置く。
//
// タイマーを持つ handlers は useRef で 1 回だけ作る（useMemo はキャッシュを捨てることがあり、作り直すと
// 後始末で押下中のタイマーが消え、長押しが黙って取り消される）。onFire と ms は ref で最新を読む:
// onFire は発火の時点の最新（元の 3 本は押した時点の関数を閉じ込めていた）、ms は押した時点の最新。
import { useEffect, useRef } from "react";
import { createLongPress, type LongPressHandlers } from "./longPress";

export { LONG_PRESS_MS } from "./longPress";

export function useLongPress(
  onFire: () => void,
  ms?: number,
): { onPressIn: () => void; onPressOut: () => void } {
  const latest = useRef({ onFire, ms });
  useEffect(() => {
    latest.current = { onFire, ms };
  });
  const holder = useRef<LongPressHandlers | null>(null);
  if (holder.current === null) {
    holder.current = createLongPress(
      () => latest.current.onFire,
      () => latest.current.ms,
    );
  }
  const handlers = holder.current;
  useEffect(() => handlers.dispose, [handlers]);
  return { onPressIn: handlers.onPressIn, onPressOut: handlers.onPressOut };
}
