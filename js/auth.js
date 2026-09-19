import { auth, googleProvider } from "./firebase-init.js";
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle() {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    // ポップアップがブロックされる環境(一部のホーム画面PWAなど)ではリダイレクト方式にフォールバック。
    if (err && (err.code === "auth/popup-blocked" || err.code === "auth/cancelled-popup-request")) {
      await signInWithRedirect(auth, googleProvider);
    } else {
      throw err;
    }
  }
}

export async function completeRedirectSignIn() {
  try {
    await getRedirectResult(auth);
  } catch (err) {
    // リダイレクト結果がない場合は無視
  }
}

export function signOutUser() {
  return signOut(auth);
}
