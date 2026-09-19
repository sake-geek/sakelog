import { el, toDateInputValue } from "./helpers.js";
import { getPhotoURL } from "./photoStore.js";

export function confirmDialog({ title, message, confirmLabel = "OK", cancelLabel = "キャンセル", destructive = false }) {
  return new Promise((resolve) => {
    const overlay = el(`
      <div class="alert-overlay">
        <div class="alert-box">
          <h3>${title}</h3>
          <p>${message}</p>
          <div class="alert-actions">
            <button data-action="cancel">${cancelLabel}</button>
            <button data-action="confirm" class="${destructive ? "destructive" : ""}">${confirmLabel}</button>
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
          <h3>${title}</h3>
          ${message ? `<p>${message}</p>` : ""}
          <input type="text" placeholder="${placeholder}" value="${initialValue}" />
          <div class="alert-actions">
            <button data-action="cancel">キャンセル</button>
            <button data-action="confirm">${confirmLabel}</button>
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
