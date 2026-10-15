// ui/ の部品が使う見た目の値（トークン）を部品へ渡す React の context（入口 ./ui/tokens）。
//
// 色・余白・角丸・文字の大きさは各アプリの theme が正本で、パッケージは theme を import できない。
// そこで部品が参照する値だけを型 PiyoUiTokens（ui/tokenChecks.ts）に集め、各アプリはアプリの根で 1 回だけ
// <PiyoUiProvider tokens={...}> に自分の theme から値を詰めて渡す。
// Provider を置き忘れたときに既定の色で黙って動くと、別のアプリの色で出ても気付けない。
// だから既定値は持たず、値の欠けは型（必須のキー）と実行時のエラーで、Provider の外は実行時のエラーで止める。
// この入口が出すのは PiyoUiProvider・usePiyoUiTokens・PIYO_UI_TOKEN_KEYS・型 PiyoUiTokens だけ
// （検査の関数は ui/tokenChecks.ts に置き、入口にしない）。
import {
  createContext,
  createElement,
  useContext,
  type ReactNode,
} from "react";

import {
  assertPiyoUiTokens,
  readTokens,
  type PiyoUiTokens,
} from "./tokenChecks";

export { PIYO_UI_TOKEN_KEYS, type PiyoUiTokens } from "./tokenChecks";

const PiyoUiContext = createContext<PiyoUiTokens | undefined>(undefined);

export function PiyoUiProvider({
  tokens,
  children,
}: {
  tokens: PiyoUiTokens;
  children?: ReactNode;
}) {
  assertPiyoUiTokens(tokens);
  return createElement(PiyoUiContext.Provider, { value: tokens }, children);
}

export function usePiyoUiTokens(): PiyoUiTokens {
  return readTokens(useContext(PiyoUiContext));
}
