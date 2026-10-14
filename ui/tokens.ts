// ui/ の部品が使う見た目の値（トークン）と、それを部品へ渡す React の context。
//
// 色・余白・角丸・文字の大きさは各アプリの theme が正本で、パッケージは theme を import できない。
// そこで部品が参照する値だけをこの型に集め、各アプリはアプリの根で 1 回だけ
// <PiyoUiProvider tokens={...}> に自分の theme から値を詰めて渡す。
// Provider を置き忘れたときに既定の色で黙って動くと、別のアプリの色で出ても気付けない。
// だから既定値は持たず、値の欠けは型（必須のキー）と実行時のエラーで、Provider の外は実行時のエラーで止める。
//
// 必須は群ごと:
//   全体の群（PIYO_UI_TOKEN_KEYS）   = どの部品も使い得る値。型で必須、PiyoUiProvider が検査する
//   ProgressStar の群（PIYO_UI_PROGRESS_TOKEN_KEYS） = 進捗ドットの 2 色。型では省けて、ProgressStar を描くときに
//                                   readProgressTokens が検査する（ProgressStar を使わないアプリは渡さなくてよい）
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
    // 進捗ドット: いまの問題・まだの問題（ProgressStar の群。ProgressStar を使うアプリだけが渡す）
    progressNow?: string;
    progressOff?: string;
    // 紙吹雪の小片の色（順に使い回す）
    confetti: readonly string[];
  };
  font: { huge: number; title: number; big: number; body: number };
  space: { xs: number; sm: number; md: number; lg: number };
  radius: { md: number; lg: number; pill: number };
}

type Group = keyof PiyoUiTokens;
type Leaf<G extends Group> = keyof PiyoUiTokens[G] & string;

// "群.キー" の形の、型 PiyoUiTokens の葉の一覧（Optional = true なら省ける葉、false なら必須の葉）。
type TokenPathWhere<Optional extends boolean> = {
  [G in Group]: {
    [K in Leaf<G>]-?: (
      undefined extends PiyoUiTokens[G][K] ? true : false
    ) extends Optional
      ? `${G}.${K}`
      : never;
  }[Leaf<G>];
}[Group];
type TokenPath = TokenPathWhere<boolean>;

// 実行時に検査するキーの一覧（群ごと）。型と同じ集合であることは型検査（tsc）が止める:
// 余りや綴りの誤りは下の satisfies で、欠けは *_COVER_TYPE で型エラーになる。
// 必須の葉を省ける側の一覧に入れる（またはその逆）と、どちらかが型エラーになる。
// 中身の検査（欠けたら止まる・全部あれば通る）は tests/ui-tokens.test.mjs。
export const PIYO_UI_TOKEN_KEYS = [
  "colors.surface",
  "colors.text",
  "colors.white",
  "colors.townBorder",
  "colors.townPressed",
  "colors.buttonPressed",
  "colors.cardButtonPressed",
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
] as const satisfies readonly TokenPathWhere<false>[];

export const PIYO_UI_PROGRESS_TOKEN_KEYS = [
  "colors.progressNow",
  "colors.progressOff",
] as const satisfies readonly TokenPathWhere<true>[];

type SameSet<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const REQUIRED_COVER_TYPE: SameSet<
  TokenPathWhere<false>,
  (typeof PIYO_UI_TOKEN_KEYS)[number]
> = true;
const PROGRESS_COVER_TYPE: SameSet<
  TokenPathWhere<true>,
  (typeof PIYO_UI_PROGRESS_TOKEN_KEYS)[number]
> = true;
void REQUIRED_COVER_TYPE;
void PROGRESS_COVER_TYPE;

// 葉ごとの値の種類。種類が型と合っていることも tsc が止める（string の葉に "number" と書くと型エラー）。
type ValueAt<P extends TokenPath> =
  P extends `${infer G extends Group}.${infer K}`
    ? K extends keyof PiyoUiTokens[G]
      ? Exclude<PiyoUiTokens[G][K], undefined>
      : never
    : never;
type KindOf<V> = V extends readonly string[]
  ? "colorList"
  : V extends string
    ? "color"
    : V extends number
      ? "number"
      : never;
const TOKEN_KINDS: { [P in TokenPath]: KindOf<ValueAt<P>> } = {
  "colors.surface": "color",
  "colors.text": "color",
  "colors.white": "color",
  "colors.townBorder": "color",
  "colors.townPressed": "color",
  "colors.buttonPressed": "color",
  "colors.cardButtonPressed": "color",
  "colors.progressNow": "color",
  "colors.progressOff": "color",
  "colors.confetti": "colorList",
  "font.huge": "number",
  "font.title": "number",
  "font.big": "number",
  "font.body": "number",
  "space.xs": "number",
  "space.sm": "number",
  "space.md": "number",
  "space.lg": "number",
  "radius.md": "number",
  "radius.lg": "number",
  "radius.pill": "number",
};

function readPath(value: unknown, path: string): unknown {
  let current: unknown = value;
  for (const part of path.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

const isColor = (v: unknown) => typeof v === "string" && v !== "";

function hasKind(v: unknown, kind: "color" | "colorList" | "number"): boolean {
  switch (kind) {
    case "color":
      return isColor(v);
    case "colorList":
      return Array.isArray(v) && v.length > 0 && v.every(isColor);
    case "number":
      return typeof v === "number" && Number.isFinite(v);
  }
}

// keys（既定は全体の群）のうち、欠けている（または種類の合わない）キーの一覧。空なら全部そろっている。
export function missingTokenKeys(
  tokens: unknown,
  keys: readonly TokenPath[] = PIYO_UI_TOKEN_KEYS,
): string[] {
  return keys.filter(
    (path) => !hasKind(readPath(tokens, path), TOKEN_KINDS[path]),
  );
}

// 全体の群を検査する（PiyoUiProvider が呼ぶ）。
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

// ProgressStar の群を検査して 2 色を返す（ProgressStar が描くときに呼ぶ）。
export function readProgressTokens(tokens: PiyoUiTokens): {
  progressNow: string;
  progressOff: string;
} {
  const missing = missingTokenKeys(tokens, PIYO_UI_PROGRESS_TOKEN_KEYS);
  const { progressNow, progressOff } = tokens.colors;
  if (
    missing.length > 0 ||
    progressNow === undefined ||
    progressOff === undefined
  ) {
    throw new Error(
      `piyo-assets/ui: ProgressStar を使うには、PiyoUiProvider の tokens に進捗ドットの色（${PIYO_UI_PROGRESS_TOKEN_KEYS.join("・")}）が要ります。足りない値: ${missing.join(", ")}`,
    );
  }
  return { progressNow, progressOff };
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
