// expo と expo-status-bar の差し替え（testing/register.mjs が、アプリが差し替えを渡さない expo・expo-status-bar を
// ここへ向ける）。置くのは、知育アプリの App.tsx が共通に使う expo-status-bar の StatusBar だけ（何も描かない）。
// ほかの expo-*（expo-av など）はここへ向けない（無い名前を import すると、何が足りないのか分からない形で落ちるため）。
// アプリが使う expo-* は、アプリの stub に足して register({ stubs: { "expo-*": … } }) で渡す。

export function StatusBar(): null {
  return null;
}
