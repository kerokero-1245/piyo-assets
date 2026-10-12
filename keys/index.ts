// 街の燃料（⭐の累計）を入れる localStorage のキー。知育 3 本（おつかいめいろ・ぴよぴよさんすう・ぴよぴよことば）が
// 書き、街（ぴよぴよランド）が読む。
//
// 値の正本はこのファイル（コード）。台帳の文書は kerokero-1245.github.io の docs/WORLD.md §7（localStorage キー台帳）。
// 街の静的 HTML は TypeScript を読めないので、同じ 3 つの値を keys/keys.js（window.PIYO_KEYS）にも持つ。
// 2 つの値の一致は tests/keys.test.mjs が見る。片方だけ直さない。
//
// bgm のキー（<app>.bgm）は入れない。各アプリが自分のキーを自分の中だけで読むので、共有する理由がない。
// 複数のアプリが同じキーを読み書きするようになったら足す。
export const TOTAL_STARS = {
  meiro: "meiro.totalStars",
  sansu: "sansu.totalStars",
  kotoba: "kotoba.totalStars",
} as const;
