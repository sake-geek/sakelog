import { db } from "./firebase-init.js";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
  getDocs,
  getDoc,
  setDoc,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const foldersCol = (uid) => collection(db, "users", uid, "folders");
const recordsCol = (uid) => collection(db, "users", uid, "records");

export function subscribeFolders(uid, onChange, onError) {
  const q = query(foldersCol(uid), orderBy("name"));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

export function subscribeRecords(uid, onChange, onError) {
  const q = query(recordsCol(uid), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

export async function createFolder(uid, name) {
  const ref = await addDoc(foldersCol(uid), { name });
  return ref.id;
}

export async function renameFolder(uid, folderId, name) {
  await updateDoc(doc(db, "users", uid, "folders", folderId), { name });
}

export async function deleteFolder(uid, folderId) {
  const batch = writeBatch(db);
  const affected = await getDocs(query(recordsCol(uid), where("folderId", "==", folderId)));
  affected.forEach((d) => batch.update(d.ref, { folderId: null }));
  batch.delete(doc(db, "users", uid, "folders", folderId));
  await batch.commit();
}

/** 名前でフォルダを検索し、なければ新規作成してidを返す。空文字ならnull(未分類)。 */
export async function resolveFolderId(uid, folders, name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return null;
  const existing = folders.find((f) => f.name === trimmed);
  if (existing) return existing.id;
  return await createFolder(uid, trimmed);
}

export async function createRecord(uid, data) {
  const ref = await addDoc(recordsCol(uid), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateRecord(uid, recordId, data) {
  await updateDoc(doc(db, "users", uid, "records", recordId), data);
}

export async function deleteRecord(uid, recordId) {
  await deleteDoc(doc(db, "users", uid, "records", recordId));
}

export async function toggleFavorite(uid, record) {
  await updateRecord(uid, record.id, { isFavorite: !record.isFavorite });
}

// ---- 利用申請(招待制アクセス) ----
const requestsCol = () => collection(db, "accessRequests");
const requestDoc = (uid) => doc(db, "accessRequests", uid);

/** 初回ログイン時に、申請ドキュメントがなければ「保留中」として作成する。 */
export async function ensureAccessRequest(uid, email, displayName) {
  const ref = requestDoc(uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email: email || "",
      displayName: displayName || "",
      status: "pending",
      requestedAt: serverTimestamp(),
    });
  }
}

/** 自分の申請状況をリアルタイムで監視する。 */
export function subscribeAccessRequest(uid, onChange) {
  return onSnapshot(requestDoc(uid), (snap) => {
    onChange(snap.exists() ? snap.data().status : "pending");
  });
}

/** (管理者用)すべての申請をリアルタイムで監視する。 */
export function subscribeAllAccessRequests(onChange) {
  const q = query(requestsCol(), orderBy("requestedAt", "desc"));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/** (管理者用)申請を承認・却下する。 */
export async function setAccessRequestStatus(uid, status) {
  await updateDoc(requestDoc(uid), { status, respondedAt: serverTimestamp() });
}
