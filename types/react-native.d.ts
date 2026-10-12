// bgm/engine.ts が import する react-native のうち、型の検査に要る分だけの宣言。
// react-native は利用側アプリの依存（将来の peer）で、いまはこのリポジトリに入れていない。
// その代わりに最小の宣言を置いた（配布物には入れない）。
// OS は、利用側アプリの react-native 0.86.0 の Platform.OS と同じ値の合併型にしてある。
// 利用側アプリがこのパッケージを使うようになれば、実物の型での検査はアプリの typecheck でも行われる。
// ui/ を足す版で react・react-native を devDependencies に入れたら、このファイルは消す。
declare module "react-native" {
  export const Platform: {
    OS: "ios" | "android" | "web" | "windows" | "macos";
  };
}
