// Firebase Console (https://console.firebase.google.com/) でプロジェクトを作成し、
// 「プロジェクトの設定」→「全般」→ 「マイアプリ」→ ウェブアプリを追加して取得した
// 設定値を、下の firebaseConfig にそのまま貼り付けてください。
// また Authentication で「Google」サインインを有効化し、
// Firestore Database を作成しておく必要があります(README参照)。
// 写真もFirestoreに保存する方式のため、Firebase Storage(Blazeプラン必須)は使いません。

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  enableIndexedDbPersistence,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAGMK4k5zUR993PLv_pZA-xv0nB3tIAYvc",
  authDomain: "sake-diary-77d4e.firebaseapp.com",
  projectId: "sake-diary-77d4e",
  storageBucket: "sake-diary-77d4e.firebasestorage.app",
  messagingSenderId: "842543010205",
  appId: "1:842543010205:web:405821518c99ccaf6c9f74",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// オフラインでも読み書きできるようにローカルキャッシュを有効化(複数タブ同時起動時は失敗するが無視してよい)。
enableIndexedDbPersistence(db).catch(() => {});
