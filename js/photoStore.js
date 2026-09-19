// Firebase StorageはBlaze(従量課金)プランが必要なため使わず、
// 写真はFirestoreの users/{uid}/photos サブコレクションにBase64文字列として保存する。
// Firestoreの無料枠(Sparkプラン)だけで完結する。1ドキュメントの上限が1MiBなので、
// imageCrop.js側で書き出しサイズを制限し、余裕を持たせている。

import { db } from "./firebase-init.js";
import { store } from "./store.js";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const urlCache = new Map();

/** JPEG blobをFirestoreにBase64保存し、記録に保存する「ドキュメントID」を返す。 */
export async function uploadPhoto(uid, blob) {
  const dataUrl = await blobToDataURL(blob);
  const ref = await addDoc(collection(db, "users", uid, "photos"), {
    dataUrl,
    createdAt: serverTimestamp(),
  });
  urlCache.set(ref.id, dataUrl);
  return ref.id;
}

export async function getPhotoURL(photoId) {
  if (urlCache.has(photoId)) return urlCache.get(photoId);
  const snap = await getDoc(doc(db, "users", store.uid, "photos", photoId));
  const url = snap.exists() ? snap.data().dataUrl : "";
  urlCache.set(photoId, url);
  return url;
}

export async function deletePhoto(photoId) {
  urlCache.delete(photoId);
  try {
    await deleteDoc(doc(db, "users", store.uid, "photos", photoId));
  } catch (e) {
    // 既に削除済みなどは無視
  }
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
