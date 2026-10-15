// expo・expo-* の差し替え（testing/register.mjs が expo と expo-* をここへ向ける）。
// 置くのは、知育アプリの App.tsx が共通に使う expo-status-bar の StatusBar だけ（何も描かない）。
// アプリだけが使う名前は、アプリの stub に足して register({ stubs: { "expo-*": … } }) で渡す。

export function StatusBar() {
  return null;
}
