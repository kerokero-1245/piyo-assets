// 4〜5 歳でも押しやすい大きなボタン。絵文字＋ひらがな（装飾程度）を大きく取る。
// 大きさ（size）と色の決め方は ui/bigButtonStyle.ts。
// 大きさは tokens（文字・余白・角丸）で決まるので、StyleSheet に登録せず、その値の style をそのまま渡す
// （描画のたびに StyleSheet.create を呼ばない）。tokens に依らない並びだけ下の StyleSheet に置く。

import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  BIG_BUTTON_DEFAULT_SIZE,
  bigButtonColors,
  bigButtonStyles,
  type BigButtonSize,
} from "./bigButtonStyle";
import { usePiyoUiTokens } from "./tokens";

export { BIG_BUTTON_DEFAULT_SIZE, type BigButtonSize } from "./bigButtonStyle";

interface Props {
  onPress: () => void;
  emoji?: string;
  label?: string;
  color?: string; // 背景色（省略時は白カード）
  pressedColor?: string; // 押下時の色
  textColor?: string;
  size?: BigButtonSize;
}

export function BigButton({
  onPress,
  emoji,
  label,
  color,
  pressedColor,
  textColor,
  size = BIG_BUTTON_DEFAULT_SIZE,
}: Props) {
  const tokens = usePiyoUiTokens();
  const s = useMemo(() => bigButtonStyles(size, tokens), [size, tokens]);
  const c = bigButtonColors({ color, pressedColor, textColor }, tokens);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label ?? emoji}
      style={({ pressed }) => [
        s.button,
        { backgroundColor: pressed ? c.pressedBackground : c.background },
      ]}
    >
      <View style={styles.row}>
        {emoji ? <Text style={s.emoji}>{emoji}</Text> : null}
        {label ? (
          <Text
            style={[s.label, { color: c.text }]}
            numberOfLines={s.numberOfLines}
          >
            {label}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
