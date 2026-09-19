import { subscribeFolders, subscribeRecords } from "./dataStore.js";

/** サインイン中のユーザーの記録・フォルダを保持する共有ストア。Firestoreとリアルタイム同期する。 */
export const store = {
  uid: null,
  records: [],
  folders: [],
  ready: false,
  accessDenied: false,
  isAdmin: false,
};

let unsubRecords = null;
let unsubFolders = null;
let onUpdate = () => {};

export function setOnUpdate(cb) {
  onUpdate = cb;
}

export function startListening(uid) {
  stopListening();
  store.uid = uid;
  const handleError = (err) => {
    if (err?.code === "permission-denied") {
      store.accessDenied = true;
      onUpdate();
    }
  };
  unsubRecords = subscribeRecords(
    uid,
    (records) => {
      store.records = records;
      store.ready = true;
      onUpdate();
    },
    handleError
  );
  unsubFolders = subscribeFolders(
    uid,
    (folders) => {
      store.folders = folders;
      onUpdate();
    },
    handleError
  );
}

export function stopListening() {
  if (unsubRecords) unsubRecords();
  if (unsubFolders) unsubFolders();
  unsubRecords = null;
  unsubFolders = null;
  store.uid = null;
  store.records = [];
  store.folders = [];
  store.ready = false;
  store.accessDenied = false;
  store.isAdmin = false;
}
