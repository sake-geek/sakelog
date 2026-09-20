import { el, escapeHtml, formatDate, formatNumber, formatSakeMeter, createStarRating, ICONS } from "../helpers.js";
import { store } from "../store.js";
import { deleteRecord, toggleFavorite, updateRecord } from "../dataStore.js";
import { deletePhoto, getPhotoURL } from "../photoStore.js";
import { confirmDialog, openLightbox, folderPickerSheet } from "../modals.js";
import { push, pop } from "../router.js";

export function RecordDetailScreen(recordId) {
  return {
    render() {
      const record = store.records.find((r) => r.id === recordId);
      if (!record) {
        const empty = el(`
          <div class="screen">
            <div class="topbar"><button class="icon-btn" data-action="back">←</button><h1>記録の詳細</h1></div>
            <div class="content"><div class="empty-state">この記録は削除されました。</div></div>
          </div>
        `);
        empty.querySelector('[data-action="back"]').addEventListener("click", () => pop());
        return empty;
      }

      const folder = store.folders.find((f) => f.id === record.folderId);

      const screen = el(`
        <div class="screen">
          <div class="topbar">
            <button class="icon-btn" data-action="back">←</button>
            <h1>記録の詳細</h1>
            <button class="icon-btn ${record.isFavorite ? "active" : ""}" data-action="favorite">${record.isFavorite ? "♥" : "♡"}</button>
            <button class="icon-btn" data-action="move-folder">${ICONS.folder}</button>
            <button class="icon-btn" data-action="delete">${ICONS.trash}</button>
            <button class="icon-btn" data-action="edit">${ICONS.edit}</button>
          </div>
          <div class="content" id="detail-content"></div>
        </div>
      `);

      const content = screen.querySelector("#detail-content");

      if (record.photoPaths && record.photoPaths.length > 0) {
        const photoRow = el(`<div class="detail-photos"></div>`);
        record.photoPaths.forEach((path, i) => {
          const img = document.createElement("img");
          getPhotoURL(path).then((url) => (img.src = url)).catch(() => {});
          img.addEventListener("click", () => openLightbox(record.photoPaths, i));
          photoRow.appendChild(img);
        });
        content.appendChild(photoRow);
      }

      const header = el(`
        <div class="detail-header">
          <p class="brand">${escapeHtml(record.brandName || "(銘柄未入力)")}</p>
          ${record.breweryName ? `<p class="brewery">${escapeHtml(record.breweryName)}</p>` : ""}
        </div>
      `);
      content.appendChild(header);

      const starsWrap = el(`<div style="padding:0 16px;"></div>`);
      starsWrap.appendChild(createStarRating({ rating: record.rating || 0, size: 26 }));
      content.appendChild(starsWrap);

      content.appendChild(el(`<div class="divider"></div>`));

      addInfoRow(content, "産地", record.origin);
      if (folder) addInfoRow(content, "フォルダ", folder.name);

      const entries = record.polishingEntries || [];
      if (entries.length > 0) {
        const box = el(`<div class="info-row"><div class="label">精米歩合</div><div class="value"></div></div>`);
        const valueEl = box.querySelector(".value");
        entries.forEach((entry) => {
          const variety = entry.riceVariety || "品種名未入力";
          const ratio = entry.ratio != null ? `${formatNumber(entry.ratio)}%` : "未入力";
          valueEl.appendChild(el(`<div>${escapeHtml(variety)}: ${escapeHtml(ratio)}</div>`));
        });
        content.appendChild(box);
      }

      addInfoRow(content, "アルコール度数", record.alcoholPercentage != null ? `${formatNumber(record.alcoholPercentage)}%` : null);
      addInfoRow(content, "日本酒度", formatSakeMeter(record.sakeMeterValue));
      addInfoRow(content, "購入日", formatDate(record.purchaseDate));
      addInfoRow(content, "最後に飲んだ日", formatDate(record.drankDate));

      addScaleRow(content, "淡麗 〜 濃醇", record.richness);
      addScaleRow(content, "辛口 〜 甘口", record.sweetness);
      addScaleRow(content, "香り(弱 〜 強)", record.aroma);

      const styleEntries = Object.entries(record.drinkingStyleRatings || {}).filter(([, v]) => v > 0);
      if (styleEntries.length > 0) {
        content.appendChild(el(`<div class="section-label" style="padding-left:16px;">飲み方ごとの評価</div>`));
        for (const [style, value] of styleEntries) {
          const row = el(`<div class="info-row"><div class="label">${escapeHtml(style)}</div><div class="value stars-slot"></div></div>`);
          row.querySelector(".stars-slot").appendChild(createStarRating({ rating: value, size: 18 }));
          content.appendChild(row);
        }
      }

      if (record.tags && record.tags.length > 0) {
        const tagsWrap = el(`<div class="tags-wrap"></div>`);
        record.tags.forEach((tag) => tagsWrap.appendChild(el(`<span class="tag-pill">${escapeHtml(tag)}</span>`)));
        content.appendChild(tagsWrap);
      }

      addInfoRow(content, "価格", record.price != null ? `¥${Math.round(record.price)}` : null);
      addInfoRow(content, "飲んだ場所", record.place);

      if (record.memo) {
        content.appendChild(el(`<div class="memo-box">${escapeHtml(record.memo)}</div>`));
      }

      screen.querySelector('[data-action="back"]').addEventListener("click", () => pop());
      screen.querySelector('[data-action="favorite"]').addEventListener("click", async () => {
        await toggleFavorite(store.uid, record);
      });
      screen.querySelector('[data-action="move-folder"]').addEventListener("click", async () => {
        const selected = await folderPickerSheet(store.folders, record.folderId || null);
        if (selected === undefined) return;
        try {
          await updateRecord(store.uid, record.id, { folderId: selected });
        } catch (err) {
          alert("フォルダの変更に失敗しました: " + (err?.message || err));
        }
      });
      screen.querySelector('[data-action="delete"]').addEventListener("click", async () => {
        const ok = await confirmDialog({
          title: "削除の確認",
          message: "この記録を削除しますか?この操作は取り消せません。",
          confirmLabel: "削除",
          destructive: true,
        });
        if (ok) {
          for (const path of record.photoPaths || []) await deletePhoto(path);
          await deleteRecord(store.uid, record.id);
          pop();
        }
      });
      screen.querySelector('[data-action="edit"]').addEventListener("click", async () => {
        const { RecordFormScreen } = await import("./form.js");
        push(RecordFormScreen(record.id));
      });

      return screen;
    },
  };
}

function addInfoRow(container, label, value) {
  if (value === null || value === undefined || String(value).trim() === "") return;
  container.appendChild(
    el(`<div class="info-row"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div></div>`)
  );
}

function addScaleRow(container, label, value) {
  const v = Number(value || 0);
  container.appendChild(
    el(`
      <div class="scale-row">
        <div class="label">${escapeHtml(label)}: ${formatNumber(v)}</div>
        <div class="scale-bar"><div class="fill" style="width:${(v / 5) * 100}%;"></div></div>
      </div>
    `)
  );
}
