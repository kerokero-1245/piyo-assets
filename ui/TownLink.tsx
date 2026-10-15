// 「まちへ もどる」— ぴよぴよランド（街）へ帰る導線（導線はアイコン＋短いひらがな）。
// 街の 404 ページの「まちへ もどる」と同じ絵（svg/ki.svg。街の /assets/img/ki.svg と同じファイル）・
// 同じ並び（絵 → 文字）にする。枠と押したときの色は tokens の colors.townBorder・townPressed。
// tokens に依らない形は下の StyleSheet（モジュールの読み込み時に 1 回）に置き、tokens の値（色・余白・角丸）は
// style にそのまま重ねる（描画のたびに StyleSheet.create を呼ばない）。
//
// web では href="/" を持つ本物のリンク（<a>）として出す。街は同じオリジンのルート
// https://kerokero-1245.github.io/ にあり、アプリは /<アプリ名>/ で配っているので、"/" へ移れば街に戻る。
//   - マウス・タッチ・Enter はリンクの標準の動き（click → 移動）。onPress は移動の前の合図（効果音など）だけに使う。
//   - Space はリンクの標準では動かない（ページがスクロールする）ので、ボタンと同じく Space でも移るようにする。
// 街は web にしか無いので、native では何も出さない（SHOW_TOWN）。
// あそんでいる途中の画面には置かない（タイトルにだけ置く）。

import React, { useMemo } from "react";
import {
  Image,
  Platform,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { usePiyoUiTokens, type PiyoUiTokens } from "./tokens";

export const TOWN_URL = "/";
export const SHOW_TOWN = Platform.OS === "web";

// 行の高さ（押せる大きさ 44 を確保）。タイトル画面はこの高さの行を上に取り、題字以下はその下に流す。
export const TOWN_LINK_HEIGHT = 44;

// eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro が画像を素材として書き出すのは require だけ
const KI = require("../svg/ki.svg");

const FONT_SIZE = 18;
// 絵の一辺。404 ページ（文字 22px に絵 34px）と同じ比率。
const ICON_SIZE = Math.round((FONT_SIZE * 34) / 22);

interface Props {
  // 移る前に呼ぶ（効果音など）。移動そのものはリンクの標準の動き。
  onPress?: () => void;
}

type KeyEventLike = {
  key: string;
  repeat?: boolean;
  preventDefault(): void;
  currentTarget: unknown;
};
const isSpace = (key: string) => key === " " || key === "Spacebar";

// react-native-web だけが解釈する props（href・キー操作）。RN の型に無いので型だけ合わせる。
const WEB_LINK_PROPS = {
  href: TOWN_URL,
  onKeyDown: (e: KeyEventLike) => {
    if (isSpace(e.key)) e.preventDefault(); // ページのスクロールを止める
  },
  onKeyUp: (e: KeyEventLike) => {
    if (!isSpace(e.key)) return;
    e.preventDefault();
    (e.currentTarget as { click?: () => void }).click?.(); // ボタンと同じく、離したときに移る
  },
} as unknown as PressableProps;

export function TownLink({ onPress }: Props) {
  const tokens = usePiyoUiTokens();
  const themed = useMemo(() => themedStyles(tokens), [tokens]);
  if (!SHOW_TOWN) return null;
  return (
    <Pressable
      {...WEB_LINK_PROPS}
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel="まちへ もどる"
      style={({ pressed }) => [
        styles.link,
        themed.link,
        pressed && themed.linkPressed,
      ]}
    >
      <View style={styles.row}>
        <Image
          source={KI}
          resizeMode="contain"
          style={styles.icon}
          accessible={false}
          fadeDuration={0}
        />
        <Text style={[styles.text, themed.text]} numberOfLines={1}>
          まちへ もどる
        </Text>
      </View>
    </Pressable>
  );
}

// tokens の値で決まる部分（色・余白・角丸）。
function themedStyles({ colors, radius, space }: PiyoUiTokens) {
  return {
    link: {
      paddingLeft: space.xs + 2,
      paddingRight: space.sm + 2,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderColor: colors.townBorder,
    },
    linkPressed: {
      backgroundColor: colors.townPressed,
    },
    text: {
      color: colors.text,
    },
  };
}

const styles = StyleSheet.create({
  link: {
    minHeight: TOWN_LINK_HEIGHT,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: Math.round(FONT_SIZE * 0.4),
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  text: {
    fontSize: FONT_SIZE,
    fontWeight: "800",
  },
});
