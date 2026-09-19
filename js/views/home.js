import { el, escapeHtml } from "../helpers.js";
import { store } from "../store.js";
import { createFolder, renameFolder, deleteFolder, toggleFavorite } from "../dataStore.js";
import { confirmDialog, promptDialog } from "../modals.js";
import { recordRowNode } from "../components.js";
import { push, rerender } from "../router.js";
import { signOutUser } from "../auth.js";
import { RecordDetailScreen } from "./detail.js";
import { RecordFormScreen } from "./form.js";
import { SearchScreen } from "./search.js";
import { StatsScreen } from "./stats.js";
import { AdminRequestsScreen } from "./admin.js";

const expandedFolders = new Set();
let favoritesOnly = false;

export function HomeScreen() {
  return {
    render() {
      const displayRecords = favoritesOnly ? store.records.filter((r) => r.isFavorite) : store.records;
      const unfiled = displayRecords.filter((r) => !r.folderId);
      const foldersWithItems = store.folders.filter((f) =>
        displayRecords.some((r) => r.folderId === f.id)
      );

      const screen = el(`
        <div class="screen">
          <div class="topbar">
            <h1>日本酒手帳</h1>
            <button class="icon-btn ${favoritesOnly ? "active" : ""}" data-action="fav-filter">${favoritesOnly ? "♥" : "♡"}</button>
            <button class="icon-btn" data-action="new-folder"><span class="folder-add-icon">📁<span class="folder-add-badge">＋</span></span></button>
            <button class="icon-btn" data-action="search">🔍</button>
            <button class="icon-btn" data-action="stats">📊</button>
            ${store.isAdmin ? '<button class="icon-btn" data-action="admin">🛎</button>' : ""}
            <button class="icon-btn" data-action="account">👤</button>
          </div>
          <div class="content" id="list-content"></div>
        </div>
      `);

      const content = screen.querySelector("#list-content");

      if (!store.ready) {
        content.appendChild(el(`<div class="empty-state">読み込み中...</div>`));
      } else if (displayRecords.length === 0) {
        content.appendChild(
          el(`<div class="empty-state">${favoritesOnly ? "お気に入りの記録がありません。" : "まだ記録がありません。右下の + から追加しましょう。"}</div>`)
        );
      } else {
        for (const folder of foldersWithItems) {
          const items = displayRecords.filter((r) => r.folderId === folder.id);
          const isExpanded = expandedFolders.has(folder.id);

          const header = el(`
            <div class="folder-header">
              <span>${isExpanded ? "▾" : "▸"}</span>
              <span>📁 ${escapeHtml(folder.name)} (${items.length})</span>
              <button class="menu-btn" data-action="folder-menu">⋯</button>
            </div>
          `);
          header.addEventListener("click", (ev) => {
            if (ev.target.closest('[data-action="folder-menu"]')) return;
            if (expandedFolders.has(folder.id)) expandedFolders.delete(folder.id);
            else expandedFolders.add(folder.id);
            rerender();
          });
          header.querySelector('[data-action="folder-menu"]').addEventListener("click", async (ev) => {
            ev.stopPropagation();
            await showFolderMenu(folder);
          });
          content.appendChild(header);

          const body = el(`<div class="folder-body ${isExpanded ? "" : "collapsed"}"></div>`);
          if (items.length === 0) {
            body.appendChild(el(`<div class="empty-state" style="height:auto;padding:16px;">このフォルダにはまだ記録がありません。</div>`));
          } else {
            for (const record of items) {
              body.appendChild(
                recordRowNode(record, {
                  onClick: (r) => push(RecordDetailScreen(r.id)),
                  onToggleFavorite: (r) => toggleFavorite(store.uid, r),
                })
              );
            }
          }
          content.appendChild(body);
        }

        if (unfiled.length > 0) {
          if (foldersWithItems.length > 0) {
            content.appendChild(el(`<div class="section-label">フォルダなし</div>`));
          }
          for (const record of unfiled) {
            content.appendChild(
              recordRowNode(record, {
                onClick: (r) => push(RecordDetailScreen(r.id)),
                onToggleFavorite: (r) => toggleFavorite(store.uid, r),
              })
            );
          }
        }
      }

      const fab = el(`<button class="fab" aria-label="追加">＋</button>`);
      fab.addEventListener("click", () => push(RecordFormScreen(null)));
      screen.appendChild(fab);

      screen.querySelector('[data-action="fav-filter"]').addEventListener("click", () => {
        favoritesOnly = !favoritesOnly;
        rerender();
      });
      screen.querySelector('[data-action="new-folder"]').addEventListener("click", async () => {
        const name = await promptDialog({ title: "新しいフォルダ", placeholder: "フォルダ名" });
        if (name) await createFolder(store.uid, name);
      });
      screen.querySelector('[data-action="search"]').addEventListener("click", () => {
        push(SearchScreen());
      });
      screen.querySelector('[data-action="stats"]').addEventListener("click", () => {
        push(StatsScreen());
      });
      if (store.isAdmin) {
        screen.querySelector('[data-action="admin"]').addEventListener("click", () => {
          push(AdminRequestsScreen());
        });
      }
      screen.querySelector('[data-action="account"]').addEventListener("click", async () => {
        const ok = await confirmDialog({ title: "ログアウト", message: "ログアウトしますか?", confirmLabel: "ログアウト", destructive: true });
        if (ok) await signOutUser();
      });

      return screen;
    },
  };
}

async function showFolderMenu(folder) {
  const choice = await pickerDialog(folder.name, ["名前を変更", "フォルダを削除"]);
  if (choice === "名前を変更") {
    const name = await promptDialog({ title: "フォルダ名を変更", initialValue: folder.name });
    if (name) await renameFolder(store.uid, folder.id, name);
  } else if (choice === "フォルダを削除") {
    const ok = await confirmDialog({
      title: "フォルダの削除",
      message: `「${folder.name}」を削除しますか?中の記録は「フォルダなし」に移動します。`,
      confirmLabel: "削除",
      destructive: true,
    });
    if (ok) await deleteFolder(store.uid, folder.id);
  }
}

function pickerDialog(title, options) {
  return new Promise((resolve) => {
    const overlay = el(`
      <div class="alert-overlay">
        <div class="alert-box">
          <h3>${escapeHtml(title)}</h3>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${options.map((o) => `<button data-opt="${escapeHtml(o)}" class="primary-btn" style="background:var(--surface-2);color:var(--text);">${escapeHtml(o)}</button>`).join("")}
          </div>
          <div class="alert-actions"><button data-action="cancel">キャンセル</button></div>
        </div>
      </div>
    `);
    document.body.appendChild(overlay);
    overlay.querySelectorAll("[data-opt]").forEach((btn) => {
      btn.addEventListener("click", () => {
        overlay.remove();
        resolve(btn.getAttribute("data-opt"));
      });
    });
    overlay.querySelector('[data-action="cancel"]').addEventListener("click", () => {
      overlay.remove();
      resolve(null);
    });
  });
}
