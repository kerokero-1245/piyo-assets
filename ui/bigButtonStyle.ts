// 大ボタンの大きさ・色の決め方（React に依存しない純関数。tests/ui-bigbutton.test.mjs が確かめる）。
//
// big   = 既定。こども側の大きなボタン
// huge  = タイトルの「あそぶ」など、いちばん目立たせるボタン
// small = おとなモード用。親ゲートの奥は普通のアプリの UI でよいので、長いラベル
//         （「しゃしんを ふやす」など）が折り返さない大きさにする（それでも高さ 64 以上を確保）。

export type BigButtonSize = "small" | "big" | "huge";

export const BIG_BUTTON_DEFAULT_SIZE: BigButtonSize = "big";

interface StyleTokens {
  font: { huge: number; title: number; big: number; body: number };
  space: { xs: number; sm: number; md: number; lg: number };
  radius: { md: number; lg: number };
}

interface ColorTokens {
  colors: {
    surface: string;
    text: string;
    white: string;
    buttonPressed: string;
    cardButtonPressed: string;
  };
}

export function bigButtonStyles(size: BigButtonSize, t: StyleTokens) {
  const base = {
    minHeight: 76,
    borderRadius: t.radius.lg,
    paddingVertical: t.space.md,
    paddingHorizontal: t.space.lg,
    justifyContent: "center",
    alignItems: "center",
    // やわらかい影で押せそうな見た目に。
    shadowColor: "#00000040",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 3,
  } as const;
  const emoji = { fontSize: t.font.title, marginRight: t.space.sm };
  const label = { fontSize: t.font.big, fontWeight: "800" } as const;

  switch (size) {
    case "huge":
      return {
        button: { ...base, minHeight: 104, borderRadius: t.radius.lg },
        emoji: { ...emoji, fontSize: t.font.huge },
        label: { ...label, fontSize: t.font.huge },
        numberOfLines: undefined,
      };
    case "small":
      return {
        button: {
          ...base,
          minHeight: 64,
          paddingVertical: t.space.sm,
          paddingHorizontal: t.space.md,
          borderRadius: t.radius.md,
        },
        emoji: { ...emoji, fontSize: t.font.big, marginRight: t.space.xs },
        label: { ...label, fontSize: t.font.body },
        numberOfLines: 1,
      };
    case "big":
      return { button: base, emoji, label, numberOfLines: undefined };
  }
}

// 地・押したときの地・文字の色。色を指定しないボタンは白いカード（surface）で、押すと cardButtonPressed。
// 色を指定したボタンは押すと buttonPressed、文字は白。どちらも props で個別に上書きできる。
export function bigButtonColors(
  props: { color?: string; pressedColor?: string; textColor?: string },
  t: ColorTokens,
) {
  const { color, pressedColor, textColor } = props;
  return {
    background: color ?? t.colors.surface,
    pressedBackground:
      pressedColor ??
      (color ? t.colors.buttonPressed : t.colors.cardButtonPressed),
    text: textColor ?? (color ? t.colors.white : t.colors.text),
  };
}
