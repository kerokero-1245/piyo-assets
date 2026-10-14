// 長押しの React フック。ロジックは ui/longPress.ts（理由もそちら）。
// 返す onPressIn・onPressOut を Pressable に渡す。アンマウントで残りのタイマーを止める。
// ms を省くと createLongPress の既定（LONG_PRESS_MS = 3 秒）。既定値は longPress.ts の 1 か所だけに置く。
import { useEffect, useMemo, useRef } from "react";
import { createLongPress } from "./longPress";

export function useLongPress(
  onFire: () => void,
  ms?: number,
): { onPressIn: () => void; onPressOut: () => void } {
  const fireRef = useRef(onFire);
  useEffect(() => {
    fireRef.current = onFire;
  });
  const handlers = useMemo(
    () => createLongPress(() => fireRef.current, ms),
    [ms],
  );
  useEffect(() => handlers.dispose, [handlers]);
  return { onPressIn: handlers.onPressIn, onPressOut: handlers.onPressOut };
}
