import { el, toDateInputValue, escapeHtml } from "./helpers.js";
import { getPhotoURL } from "./photoStore.js";

export function confirmDialog({ title, message, confirmLabel = "OK", cancelLabel = "キャンセル", destructive = false }) {
  return new Promise((resolve) => {
    const overlay = el(`
      <div class="alert-overlay">
        <div class="alert-box">
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(message)}</p>
          <div class="alert-actions">
            <button data-action="cancel">${escapeHtml(cancelLabel)}</button>
            <button data-action="confirm" class="${destructive ? "destructive" : ""}">${escapeHtml(confirmLabel)}</button>
          </div>
        </div>
      </div>
    `);
    document.body.appendChild(overlay);
    overlay.querySelector('[data-action="cancel"]').addEventListener("click", () => {
      overlay.remove();
      resolve(false);
    });
    overlay.querySelector('[data-action="confirm"]').addEventListener("click", () => {
      overlay.remove();
      resolve(true);
    });
  });
}

export function promptDialog({ title, message = "", placeholder = "", initialValue = "", confirmLabel = "OK" }) {
  return new Promise((resolve) => {
    const overlay = el(`
      <div class="alert-overlay">
        <div class="alert-box">
          <h3>${escapeHtml(title)}</h3>
          ${message ? `<p>${escapeHtml(message)}</p>` : ""}
          <input type="text" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(initialValue)}" />
          <div class="alert-actions">
            <button data-action="cancel">キャンセル</button>
            <button data-action="confirm">${escapeHtml(confirmLabel)}</button>
          </div>
        </div>
      </div>
    `);
    document.body.appendChild(overlay);
    const input = overlay.querySelector("input");
    input.focus();
    overlay.querySelector('[data-action="cancel"]').addEventListener("click", () => {
      overlay.remove();
      resolve(null);
    });
    overlay.querySelector('[data-action="confirm"]').addEventListener("click", () => {
      const value = input.value.trim();
      overlay.remove();
      resolve(value || null);
    });
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") overlay.querySelector('[data-action="confirm"]').click();
    });
  });
}

/** 日付を選ぶシート。「未設定にする」でnullを返せる。 */
export function datePickerSheet(initialValue) {
  return new Promise((resolve) => {
    const overlay = el(`
      <div class="sheet-overlay">
        <div class="sheet">
          <div class="sheet-header">
            <button data-action="clear">未設定にする</button>
            <button data-action="done">完了</button>
          </div>
          <input type="date" value="${toDateInputValue(initialValue)}" />
        </div>
      </div>
    `);
    document.body.appendChild(overlay);
    const input = overlay.querySelector("input");
    overlay.addEventListener("click", (ev) => {
      if (ev.target === overlay) {
        overlay.remove();
        resolve(undefined);
      }
    });
    overlay.querySelector('[data-action="clear"]').addEventListener("click", () => {
      overlay.remove();
      resolve(null);
    });
    overlay.querySelector('[data-action="done"]').addEventListener("click", () => {
      const value = input.value;
      overlay.remove();
      resolve(value ? new Date(value + "T00:00:00").getTime() : null);
    });
  });
}

/**
 * 記録の移動先フォルダを選ぶシート。「フォルダなし」も選択肢に含む。
 * 選んだフォルダのid(未分類ならnull)を返す。閉じただけならundefinedを返す。
 */
export function folderPickerSheet(folders, currentFolderId) {
  return new Promise((resolve) => {
    const overlay = el(`
      <div class="sheet-overlay">
        <div class="sheet">
          <div class="sheet-header">
            <span>フォルダを選択</span>
            <button data-action="cancel">キャンセル</button>
          </div>
          <div id="folder-picker-list"></div>
        </div>
      </div>
    `);
    document.body.appendChild(overlay);
    const list = overlay.querySelector("#folder-picker-list");

    function optionRow(id, label) {
      const isCurrent = id === (currentFolderId || null);
      const row = el(`
        <div class="record-row" style="margin:8px 0;">
          <div class="info"><div class="brand">${escapeHtml(label)}</div></div>
          ${isCurrent ? '<span style="color:var(--chart-accent);font-weight:700;">✓</span>' : ""}
        </div>
      `);
      row.addEventListener("click", () => {
        overlay.remove();
        resolve(id);
      });
      return row;
    }

    list.appendChild(optionRow(null, "フォルダなし"));
    folders.forEach((f) => list.appendChild(optionRow(f.id, f.name)));

    overlay.addEventListener("click", (ev) => {
      if (ev.target === overlay) {
        overlay.remove();
        resolve(undefined);
      }
    });
    overlay.querySelector('[data-action="cancel"]').addEventListener("click", () => {
      overlay.remove();
      resolve(undefined);
    });
  });
}

export async function openLightbox(photoPaths, initialIndex) {
  let index = initialIndex;
  const overlay = el(`
    <div class="lightbox">
      <div class="lb-top">
        <span id="lb-count"></span>
        <button class="lb-close" data-action="close">✕</button>
      </div>
      <div class="lb-stage"><img id="lb-img" alt="" /></div>
    </div>
  `);
  document.body.appendChild(overlay);
  const imgEl = overlay.querySelector("#lb-img");
  const countEl = overlay.querySelector("#lb-count");

  async function show(i) {
    index = (i + photoPaths.length) % photoPaths.length;
    countEl.textContent = photoPaths.length > 1 ? `${index + 1} / ${photoPaths.length}` : "";
    try {
      imgEl.src = await getPhotoURL(photoPaths[index]);
    } catch {
      imgEl.src = "";
    }
  }

  let startX = null;
  overlay.querySelector(".lb-stage").addEventListener("pointerdown", (ev) => (startX = ev.clientX));
  overlay.querySelector(".lb-stage").addEventListener("pointerup", (ev) => {
    if (startX === null) return;
    const dx = ev.clientX - startX;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    startX = null;
  });

  overlay.querySelector('[data-action="close"]').addEventListener("click", () => overlay.remove());
  await show(initialIndex);
}
