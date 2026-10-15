// react-native の差し替え（testing/register.mjs が "react-native" をここへ向ける）。本物は Flow 記法で Node では読めない。
// 置くのは、知育 3 本のテストが共通に使う Platform.OS（"web" から始まる。テストが書き換えて native の動きを見る）と、
// このパッケージの ui/ の部品を import するのに要る名前だけ。描画はしないので、部品は何も描かない関数、
// Animated・Easing は空の入れ物。アプリだけが使う名前は、アプリの stub（.ts）に
//   export * from "@kerokero-1245/piyo-assets/testing/stubs/react-native";
// と書いて足し、register({ stubs: { "react-native": … } }) で渡す（.ts なので、アプリの tsc もそのまま型を読む）。

export const Platform: { OS: string } = { OS: "web" };

export const StyleSheet = {
  create: <T>(styles: T): T => styles,
};

const renderNothing = (): null => null;
export const View = renderNothing;
export const Text = renderNothing;
export const Pressable = renderNothing;
export const Image = renderNothing;

export const Animated: Record<string, unknown> = {};
export const Easing: Record<string, unknown> = {};
