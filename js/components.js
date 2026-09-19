import { el, formatDate, escapeHtml } from "./helpers.js";
import { getPhotoURL } from "./photoStore.js";

/** 一覧・検索・都道府県マップで共通利用する記録の行。 */
export function recordRowNode(record, { onClick, onToggleFavorite } = {}) {
  const subtitleParts = [];
  if (record.breweryName) subtitleParts.push(record.breweryName);
  const drankDate = formatDate(record.drankDate);
  if (drankDate) subtitleParts.push(drankDate);

  const node = el(`
    <div class="record-row">
      <div class="thumb-slot"></div>
      <div class="info">
        <div class="brand">${escapeHtml(record.brandName || "(銘柄未入力)")}</div>
        <div class="subtitle">${escapeHtml(subtitleParts.join(" ・ "))}</div>
      </div>
      ${onToggleFavorite ? `<button class="heart-btn ${record.isFavorite ? "active" : ""}" data-action="favorite">${record.isFavorite ? "♥" : "♡"}</button>` : ""}
      <div class="rating-chip">★ ${Number(record.rating || 0).toFixed(1)}</div>
    </div>
  `);

  const thumbSlot = node.querySelector(".thumb-slot");
  if (record.photoPaths && record.photoPaths.length > 0) {
    const img = document.createElement("img");
    img.className = "thumb";
    getPhotoURL(record.photoPaths[0]).then((url) => (img.src = url)).catch(() => {});
    thumbSlot.replaceWith(img);
  } else {
    const ph = el(`<div class="thumb-placeholder">🍶</div>`);
    thumbSlot.replaceWith(ph);
  }

  if (onClick) {
    node.addEventListener("click", (ev) => {
      if (ev.target.closest('[data-action="favorite"]')) return;
      onClick(record);
    });
  }
  const favBtn = node.querySelector('[data-action="favorite"]');
  if (favBtn && onToggleFavorite) {
    favBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      onToggleFavorite(record);
    });
  }

  return node;
}
