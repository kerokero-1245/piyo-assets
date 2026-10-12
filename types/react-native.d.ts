// bgm/engine.ts が import する react-native の、型の検査に要る分だけの宣言。
// react-native は利用側アプリの依存（将来の peer）で、このリポジトリには入れない。
// ここでは型の検査のための最小の宣言だけを置く（配布物には入れない）。
// 実物の型での検査は、利用側アプリの typecheck が担う。
// ui/ を足す第 2 段で react / react-native を devDependencies に入れたら、このファイルは消す。
declare module "react-native" {
  export const Platform: { OS: string };
}
