// ui/ の部品が使う見た目の値（トークン）と、それを部品へ渡す React の context。
//
// 色・余白・角丸・文字の大きさは各アプリの theme が正本で、パッケージは theme を import できない。
// そこで部品が参照する値だけをこの型に集め、各アプリはアプリの根で 1 回だけ
// <PiyoUiProvider tokens={...}> に自分の theme から値を詰めて渡す。
// Provider を置き忘れたときに既定の色で黙って動くと、別のアプリの色で出ても気付けない。
// だから既定値は持たず、型（必須のキー）と実行時のエラー（Provider 無し・キーの欠け）の両方で止める。
import {
  createContext,
  createElement,
  useContext,
  type ReactNode,
} from "react";

export interface PiyoUiTokens {
  colors: {
    // カードの地（街へのリンク・色を指定しない大ボタン）
    surface: string;
    // 文字の色（街へのリンク・色を指定しない大ボタン）
    text: string;
    // 色つきの大ボタンの文字の色
    white: string;
    // 街へのリンクの枠と、押したときの地
    townBorder: string;
    townPressed: string;
    // 色つきの大ボタンを押したときの地
    buttonPressed: string;
    // 色を指定しない（白い）大ボタンを押したときの地
    cardButtonPressed: string;
    // 進捗ドット: いまの問題・まだの問題
    progressNow: string;
    progressOff: string;
    // 紙吹雪の小片の色（順に使い回す）
    confetti: readonly string[];
  };
  font: { huge: number; title: number; big: number; body: number };
  space: { xs: number; sm: number; md: number; lg: number };
  radius: { md: number; lg: number; pill: number };
}

// "群.キー" の形の、型 PiyoUiTokens の葉の一覧。
type TokenPath = {
  [G in keyof PiyoUiTokens]: `${G}.${keyof PiyoUiTokens[G] & string}`;
}[keyof PiyoUiTokens];

// 実行時に検査する必須キーの一覧。型と同じ集合であることは型検査（tsc）が止める:
// 余りや綴りの誤りは下の satisfies で、欠けは KEYS_COVER_TYPE で型エラーになる。
// 中身の検査（欠けたら止まる・全部あれば通る）は tests/ui-tokens.test.mjs。
export const PIYO_UI_TOKEN_KEYS = [
  "colors.surface",
  "colors.text",
  "colors.white",
  "colors.townBorder",
  "colors.townPressed",
  "colors.buttonPressed",
  "colors.cardButtonPressed",
  "colors.progressNow",
  "colors.progressOff",
  "colors.confetti",
  "font.huge",
  "font.title",
  "font.big",
  "font.body",
  "space.xs",
  "space.sm",
  "space.md",
  "space.lg",
  "radius.md",
  "radius.lg",
  "radius.pill",
] as const satisfies readonly TokenPath[];

type SameSet<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const KEYS_COVER_TYPE: SameSet<TokenPath, (typeof PIYO_UI_TOKEN_KEYS)[number]> =
  true;
void KEYS_COVER_TYPE;

function readPath(value: unknown, path: string): unknown {
  let current: unknown = value;
  for (const part of path.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

// 欠けている（または型の合わない）キーの一覧。空なら全部そろっている。
export function missingTokenKeys(tokens: unknown): string[] {
  return PIYO_UI_TOKEN_KEYS.filter((path) => {
    const v = readPath(tokens, path);
    if (path === "colors.confetti") {
      return !Array.isArray(v) || v.length === 0;
    }
    if (path.startsWith("colors.")) return typeof v !== "string" || v === "";
    return typeof v !== "number" || !Number.isFinite(v);
  });
}

export function assertPiyoUiTokens(
  tokens: unknown,
): asserts tokens is PiyoUiTokens {
  const missing = missingTokenKeys(tokens);
  if (missing.length > 0) {
    throw new Error(
      `piyo-assets/ui: PiyoUiProvider の tokens に足りない値があります: ${missing.join(", ")}`,
    );
  }
}

// context の中身を部品へ返す。Provider の外（undefined）なら止める。
export function readTokens(value: PiyoUiTokens | undefined): PiyoUiTokens {
  if (value === undefined) {
    throw new Error(
      "piyo-assets/ui: 部品が PiyoUiProvider の外で使われました。アプリの根で <PiyoUiProvider tokens={...}> で包んでください。",
    );
  }
  return value;
}

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
