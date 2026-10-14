// 進捗ドット 1 つぶん。ふつうは丸ドットだが、その問題をクリアすると⭐に変わる。
// 'star' に切り替わった瞬間だけ「ぽんっ」と小さくポップする（ごほうび獲得の演出）。
// 数字スコアではなく、集めた⭐が並んでいくのを見せる。マイナス表示は一切なし。
// ⭐の出し方（variant: 素材の画像 / 絵文字）は ui/progressStarMark.ts。

import React, { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import {
  EMOJI_MARK_STYLE,
  progressStarMark,
  STICKER_MARK_STYLE,
  type ProgressStarVariant,
  type StarState,
} from "./progressStarMark";
import { usePiyoUiTokens } from "./tokens";

// eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro が画像を素材として書き出すのは require だけ
const HOSHI = require("../svg/hoshi.svg");

export default function ProgressStar({
  state,
  variant,
}: {
  state: StarState;
  variant: ProgressStarVariant;
}) {
  const { colors } = usePiyoUiTokens();
  const mark = progressStarMark(variant);
  const dotColors = useMemo(
    () =>
      StyleSheet.create({
        now: { backgroundColor: colors.progressNow },
        off: { backgroundColor: colors.progressOff },
      }),
    [colors.progressNow, colors.progressOff],
  );
  // pop: 0=これから出る / 1=定位置。'star' に変わった瞬間に 0→1 でポップさせる。
  const pop = useRef(new Animated.Value(state === "star" ? 1 : 0)).current;
  const prev = useRef<StarState>(state);

  useEffect(() => {
    if (state === "star" && prev.current !== "star") {
      pop.setValue(0);
      Animated.spring(pop, {
        toValue: 1,
        friction: 4,
        tension: 140,
        useNativeDriver: false,
      }).start();
    }
    prev.current = state;
  }, [state, pop]);

  // spring のオーバーシュートで軽く弾む（extend 補間）。
  const popStyle = {
    transform: [
      {
        scale: pop.interpolate({
          inputRange: [0, 1],
          outputRange: [0.2, 1],
        }),
      },
    ],
  };

  return (
    <View style={styles.slot}>
      {state !== "star" ? (
        <View
          style={[
            styles.dot,
            state === "now" ? [styles.dotNow, dotColors.now] : dotColors.off,
          ]}
        />
      ) : mark.kind === "image" ? (
        <Animated.Image
          source={HOSHI}
          resizeMode="contain"
          style={[styles.sticker, popStyle]}
        />
      ) : (
        <Animated.Text style={[styles.emoji, popStyle]}>
          {mark.glyph}
        </Animated.Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // すべてのドット/星を同じ枠に収め、丸⇔星が混在しても横並びの間隔がぶれないようにする。
  slot: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  sticker: STICKER_MARK_STYLE,
  emoji: EMOJI_MARK_STYLE,
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  dotNow: {
    transform: [{ scale: 1.25 }],
  },
});
