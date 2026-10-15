// 進捗の⭐を、シールポップ画風の素材（svg/hoshi.svg）の画像で出すときの mark。
// 入口は ./ui/ProgressStarSticker だけ。ProgressStar（./ui/ProgressStar）からは読まないので、
// 文字の ⭐（EMOJI_MARK）で出すアプリの書き出しには hoshi.svg が入らない。
//
//   import { ProgressStar } from "@kerokero-1245/piyo-assets/ui/ProgressStar";
//   import { STICKER_MARK } from "@kerokero-1245/piyo-assets/ui/ProgressStarSticker";
//   <ProgressStar state="star" mark={STICKER_MARK} />

import type { ProgressStarMark } from "./progressStarMark";

export const STICKER_MARK: ProgressStarMark = Object.freeze({
  kind: "image",
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro が画像を素材として書き出すのは require だけ
  source: require("../svg/hoshi.svg"),
});
