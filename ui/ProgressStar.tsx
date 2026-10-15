// 進捗ドット 1 つぶん。ふつうは丸ドットだが、その問題をクリアすると⭐に変わる。
// 'star' に切り替わった瞬間だけ「ぽんっ」と小さくポップする（ごほうび獲得の演出）。
// 数字スコアではなく、集めた⭐が並んでいくのを見せる。マイナス表示は一切なし。
// ⭐の出し方は mark（必須）で受ける: 文字の EMOJI_MARK（この入口から出す）か、
// 画像の STICKER_MARK（入口 ./ui/ProgressStarSticker）。ここでは絵を require しない
// （文字で出すアプリの書き出しに hoshi.svg を入れないため。mark の検査と大きさは ui/progressStarMark.ts）。
// ドットの色は tokens の colors.progressNow・progressOff（ProgressStar の群）。描くときに readProgressTokens が
// 検査し、渡していなければ分かりやすい例外で止める（ProgressStar を使わないアプリは渡さなくてよい）。

import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import {
  EMOJI_MARK_STYLE,
  progressStarMarkView,
  STICKER_MARK_STYLE,
  type ProgressStarMark,
  type StarState,
} from "./progressStarMark";
import { readProgressTokens } from "./tokenChecks";
import { usePiyoUiTokens } from "./tokens";

export {
  EMOJI_MARK,
  type ProgressStarMark,
  type StarState,
} from "./progressStarMark";

export function ProgressStar({
  state,
  mark,
}: {
  state: StarState;
  mark: ProgressStarMark;
}) {
  const { progressNow, progressOff } = readProgressTokens(usePiyoUiTokens());
  const view = progressStarMarkView(mark);
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
            state === "now"
              ? [styles.dotNow, { backgroundColor: progressNow }]
              : { backgroundColor: progressOff },
          ]}
        />
      ) : view.kind === "image" ? (
        <Animated.Image
          source={view.source}
          resizeMode="contain"
          style={[styles.sticker, popStyle]}
        />
      ) : (
        <Animated.Text style={[styles.emoji, popStyle]}>
          {view.glyph}
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
  // 書き出した定数そのものを渡すと、開発時の StyleSheet.create が凍結する（使う側の定数まで凍る）ので写しを渡す。
  sticker: { ...STICKER_MARK_STYLE },
  emoji: { ...EMOJI_MARK_STYLE },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  dotNow: {
    transform: [{ scale: 1.25 }],
  },
});
