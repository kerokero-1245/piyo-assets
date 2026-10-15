// 進捗の⭐の出し方（React に依存しない純関数。tests/ui-progressstar.test.mjs が確かめる）。
//
// ⭐の出し方は ProgressStar の mark（必須の props）で受ける。どちらを使うかはアプリが決め、既定は置かない。
//   { kind: "text", glyph }   = 文字で出す。⭐ の文字は EMOJI_MARK（このファイル。絵を読まない）
//   { kind: "image", source } = 画像で出す。シールポップ画風の svg/hoshi.svg は STICKER_MARK
//                               （ui/ProgressStarSticker.ts。入口 ./ui/ProgressStarSticker）
// 絵の require を ProgressStar.tsx に置くと、文字で出すアプリでも Metro が hoshi.svg を書き出すので、
// 絵を読むのは STICKER_MARK を import したときだけにしてある。
// 型を外れた mark が来たら（kind が無い・source が無い・glyph が空）、黙って片方に倒さず止める。

import type { ImageSourcePropType } from "react-native";

export type StarState = "off" | "now" | "star";

export type ProgressStarMark =
  | { readonly kind: "text"; readonly glyph: string }
  | { readonly kind: "image"; readonly source: ImageSourcePropType };

// 文字の ⭐。絵を読まないので、ProgressStar と同じ入口（./ui/ProgressStar）から出す。
export const EMOJI_MARK: ProgressStarMark = Object.freeze({
  kind: "text",
  glyph: "⭐",
});

// 画像（image）と文字（text）の大きさ。部品は StyleSheet に登録して使う。
export const STICKER_MARK_STYLE = { width: 24, height: 24 };
export const EMOJI_MARK_STYLE = {
  fontSize: 22,
  lineHeight: 26,
  textAlign: "center",
} as const;

export type ProgressStarMarkView =
  | {
      kind: "image";
      source: ImageSourcePropType;
      style: typeof STICKER_MARK_STYLE;
    }
  | { kind: "text"; glyph: string; style: typeof EMOJI_MARK_STYLE };

export function progressStarMarkView(
  mark: ProgressStarMark,
): ProgressStarMarkView {
  const value: unknown = mark;
  if (typeof value === "object" && value !== null && "kind" in value) {
    if (
      value.kind === "image" &&
      "source" in value &&
      value.source !== undefined &&
      value.source !== null
    ) {
      return {
        kind: "image",
        source: value.source as ImageSourcePropType,
        style: STICKER_MARK_STYLE,
      };
    }
    if (
      value.kind === "text" &&
      "glyph" in value &&
      typeof value.glyph === "string" &&
      value.glyph !== ""
    ) {
      return { kind: "text", glyph: value.glyph, style: EMOJI_MARK_STYLE };
    }
  }
  throw new Error(
    `piyo-assets/ui: ProgressStar の mark が不正です: ${JSON.stringify(value) ?? String(value)}`,
  );
}
