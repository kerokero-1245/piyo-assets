// 進捗の⭐の出し方（React に依存しない純関数。tests/ui-progressstar.test.mjs が確かめる）。
//
// sticker = シールポップ画風の素材（svg/hoshi.svg）を画像で出す
// emoji   = ⭐ の文字で出す
// どちらを使うかはアプリが決める。既定は置かない（取り違えを型で止めるため必須の props）。

export type ProgressStarVariant = "emoji" | "sticker";

export const PROGRESS_STAR_VARIANTS: readonly ProgressStarVariant[] = [
  "emoji",
  "sticker",
];

export type StarState = "off" | "now" | "star";

// 画像（sticker）と文字（emoji）の大きさ。部品は StyleSheet に登録して使う。
export const STICKER_MARK_STYLE = { width: 24, height: 24 };
export const EMOJI_MARK_STYLE = {
  fontSize: 22,
  lineHeight: 26,
  textAlign: "center",
} as const;

export type ProgressStarMark =
  | { kind: "image"; style: typeof STICKER_MARK_STYLE }
  | { kind: "text"; glyph: string; style: typeof EMOJI_MARK_STYLE };

export function progressStarMark(
  variant: ProgressStarVariant,
): ProgressStarMark {
  switch (variant) {
    case "sticker":
      return { kind: "image", style: STICKER_MARK_STYLE };
    case "emoji":
      return { kind: "text", glyph: "⭐", style: EMOJI_MARK_STYLE };
    default:
      throw new Error(
        `piyo-assets/ui: ProgressStar の variant が不正です: ${String(variant)}`,
      );
  }
}
