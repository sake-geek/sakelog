import { el, escapeHtml, formatDate, TAG_TEMPLATES, DEFAULT_DRINKING_STYLES, MAX_PHOTOS, createStarRating } from "../helpers.js";
import { store } from "../store.js";
import { createRecord, updateRecord, deleteRecord, resolveFolderId } from "../dataStore.js";
import { uploadPhoto, deletePhoto, getPhotoURL } from "../photoStore.js";
import { openImageCrop } from "../imageCrop.js";
import { confirmDialog, datePickerSheet } from "../modals.js";
import { pop } from "../router.js";

function toNumberOrNull(text) {
  const trimmed = (text || "").trim();
  if (trimmed === "") return null;
  const value = parseFloat(trimmed);
  return Number.isNaN(value) ? null : value;
}

export function RecordFormScreen(recordId) {
  const isEditing = !!recordId;
  const original = isEditing ? store.records.find((r) => r.id === recordId) : null;

  const state = {
    photoPaths: original ? [...(original.photoPaths || [])] : [],
    folderText: original ? store.folders.find((f) => f.id === original.folderId)?.name || "" : "",
    brandName: original?.brandName || "",
    breweryName: original?.breweryName || "",
    origin: original?.origin || "",
    polishingRows:
      original && original.polishingEntries && original.polishingEntries.length
        ? original.polishingEntries.map((e) => ({ riceVariety: e.riceVariety || "", ratio: e.ratio != null ? String(e.ratio) : "" }))
        : [{ riceVariety: "", ratio: "" }],
    alcoholText: original?.alcoholPercentage != null ? String(original.alcoholPercentage) : "",
    sakeMeterText: original?.sakeMeterValue != null ? String(original.sakeMeterValue) : "",
    purchaseDate: original?.purchaseDate ?? null,
    drankDate: original?.drankDate ?? null,
    sweetness: original?.sweetness ?? 3,
    aroma: original?.aroma ?? 3,
    richness: original?.richness ?? 3,
    rating: original?.rating ?? 0,
    drinkingStyleOrder: (() => {
      const styles = [...DEFAULT_DRINKING_STYLES];
      for (const key of Object.keys(original?.drinkingStyleRatings || {})) {
        if (!styles.includes(key)) styles.push(key);
      }
      return styles;
    })(),
    drinkingStyleRatings: { ...(original?.drinkingStyleRatings || {}) },
    tags: new Set(original?.tags || []),
    price: original?.price != null ? String(original.price) : "",
    place: original?.place || "",
    memo: original?.memo || "",
    isFavorite: original?.isFavorite || false,
    showBrandError: false,
    uploading: false,
  };

  return {
    render() {
      const screen = el(`
        <div class="screen">
          <div class="topbar">
            <button class="icon-btn" data-action="cancel">✕</button>
            <h1>${isEditing ? "記録を編集" : "記録を追加"}</h1>
            <button class="icon-btn" data-action="favorite"></button>
            ${isEditing ? '<button class="icon-btn" data-action="delete">🗑</button>' : ""}
            <button class="icon-btn" data-action="save">✓</button>
          </div>
          <div class="content" id="form-content"></div>
        </div>
      `);

      const content = screen.querySelector("#form-content");

      // テキスト入力中に他の場所を「タップ」したらキーボードを閉じる。
      // ただし下にスクロールしようとして指が動いた場合(タップではない)はキーボードを閉じない。
      let kbTouchStartX = null;
      let kbTouchStartY = null;
      content.addEventListener("pointerdown", (ev) => {
        kbTouchStartX = ev.clientX;
        kbTouchStartY = ev.clientY;
      });
      content.addEventListener("pointerup", (ev) => {
        if (kbTouchStartX === null) return;
        const moved = Math.hypot(ev.clientX - kbTouchStartX, ev.clientY - kbTouchStartY) > 10;
        kbTouchStartX = null;
        kbTouchStartY = null;
        if (moved) return;

        const active = document.activeElement;
        if (!active || active === document.body) return;
        const isTextLike = active.tagName === "INPUT" || active.tagName === "TEXTAREA";
        if (!isTextLike) return;
        if (active === ev.target || active.contains(ev.target)) return;
        active.blur();
      });
      content.addEventListener("pointercancel", () => {
        kbTouchStartX = null;
        kbTouchStartY = null;
      });

      const favBtn = screen.querySelector('[data-action="favorite"]');
      const updateFavBtn = () => {
        favBtn.textContent = state.isFavorite ? "♥" : "♡";
        favBtn.classList.toggle("active", state.isFavorite);
      };
      updateFavBtn();
      favBtn.addEventListener("click", () => {
        state.isFavorite = !state.isFavorite;
        updateFavBtn();
      });

      screen.querySelector('[data-action="cancel"]').addEventListener("click", () => pop());

      if (isEditing) {
        screen.querySelector('[data-action="delete"]').addEventListener("click", async () => {
          const ok = await confirmDialog({
            title: "削除の確認",
            message: "この記録を削除しますか?この操作は取り消せません。",
            confirmLabel: "削除",
            destructive: true,
          });
          if (ok) {
            for (const path of original.photoPaths || []) await deletePhoto(path);
            await deleteRecord(store.uid, original.id);
            pop();
          }
        });
      }

      screen.querySelector('[data-action="save"]').addEventListener("click", () => save());

      function renderContent() {
        content.innerHTML = "";
        content.appendChild(buildPhotoSection());
        content.appendChild(buildBasicSection());
        content.appendChild(buildPolishingSection());
        content.appendChild(buildAlcoholSection());
        content.appendChild(buildDateSection());
        content.appendChild(buildSliderSection());
        content.appendChild(buildRatingSection());
        content.appendChild(buildDrinkingStyleSection());
        content.appendChild(buildTagSection());
        content.appendChild(buildMiscSection());
      }

      function buildPhotoSection() {
        const section = el(`<div class="form-section"><h3>写真 (${state.photoPaths.length}/${MAX_PHOTOS})</h3><div class="photo-strip"></div></div>`);
        const strip = section.querySelector(".photo-strip");
        state.photoPaths.forEach((path, i) => {
          const wrap = el(`<div class="photo-thumb-wrap"><img alt="" /><button class="photo-remove">✕</button></div>`);
          getPhotoURL(path).then((url) => (wrap.querySelector("img").src = url)).catch(() => {});
          wrap.querySelector(".photo-remove").addEventListener("click", async () => {
            const removed = state.photoPaths.splice(i, 1)[0];
            renderContent();
            await deletePhoto(removed);
          });
          strip.appendChild(wrap);
        });
        if (state.photoPaths.length < MAX_PHOTOS) {
          const addBtn = el(`<button class="photo-add">${state.uploading ? "…" : "📷"}</button>`);
          const fileInput = el(`<input type="file" accept="image/*" style="display:none;" />`);
          addBtn.addEventListener("click", () => fileInput.click());
          fileInput.addEventListener("change", async () => {
            const file = fileInput.files?.[0];
            if (!file) return;
            const blob = await openImageCrop(file);
            if (!blob) return;
            state.uploading = true;
            renderContent();
            try {
              const path = await uploadPhoto(store.uid, blob);
              state.photoPaths.push(path);
            } finally {
              state.uploading = false;
              renderContent();
            }
          });
          strip.appendChild(addBtn);
          strip.appendChild(fileInput);
        }
        return section;
      }

      function buildBasicSection() {
        const section = el(`<div class="form-section"></div>`);
        section.appendChild(textRow("フォルダ", state.folderText, (v) => (state.folderText = v), "folder"));
        const hint = el(`<div class="hint" style="margin:-6px 0 8px;">空欄なら未分類。新しい名前を入力すると新規作成されます</div>`);
        section.appendChild(hint);
        const query = state.folderText.trim().toLowerCase();
        if (query) {
          const matches = store.folders.filter((f) => f.name.toLowerCase().includes(query) && f.name !== state.folderText).slice(0, 5);
          if (matches.length > 0) {
            const suggestWrap = el(`<div class="folder-suggest"></div>`);
            matches.forEach((f) => {
              const btn = el(`<button>${escapeHtml(f.name)}</button>`);
              btn.addEventListener("click", () => {
                state.folderText = f.name;
                renderContent();
              });
              suggestWrap.appendChild(btn);
            });
            section.appendChild(suggestWrap);
          }
        }
        section.appendChild(textRow("銘柄名", state.brandName, (v) => (state.brandName = v), "brand"));
        if (state.showBrandError) section.appendChild(el(`<div class="error-text">銘柄名を入力してください</div>`));
        section.appendChild(textRow("酒蔵名", state.breweryName, (v) => (state.breweryName = v), "brewery"));
        section.appendChild(textRow("産地", state.origin, (v) => (state.origin = v), "origin"));
        return section;
      }

      function buildPolishingSection() {
        const section = el(`<div class="form-section"><h3>精米歩合(%)</h3></div>`);
        section.appendChild(el(`<div class="hint" style="margin-bottom:8px;">複数の米(麹米・掛米など)を使う場合は「+」で追加できます</div>`));
        state.polishingRows.forEach((row, i) => {
          const rowEl = el(`
            <div class="polish-row">
              <input type="text" placeholder="米の品種名 ${i + 1}" value="${escapeHtml(row.riceVariety)}" />
              <input type="text" placeholder="精米歩合(%)" inputmode="decimal" value="${escapeHtml(row.ratio)}" />
              ${state.polishingRows.length > 1 ? '<button class="remove-row-btn">✕</button>' : ""}
            </div>
          `);
          const inputs = rowEl.querySelectorAll("input");
          inputs[0].addEventListener("input", (ev) => (row.riceVariety = ev.target.value));
          inputs[1].addEventListener("input", (ev) => (row.ratio = ev.target.value));
          const removeBtn = rowEl.querySelector(".remove-row-btn");
          if (removeBtn) {
            removeBtn.addEventListener("click", () => {
              state.polishingRows.splice(i, 1);
              renderContent();
            });
          }
          section.appendChild(rowEl);
        });
        const addBtn = el(`<button class="add-link-btn">+ 精米歩合を追加</button>`);
        addBtn.addEventListener("click", () => {
          state.polishingRows.push({ riceVariety: "", ratio: "" });
          renderContent();
        });
        section.appendChild(addBtn);
        return section;
      }

      function buildAlcoholSection() {
        const section = el(`<div class="form-section"></div>`);
        section.appendChild(textRow("アルコール度数(%)", state.alcoholText, (v) => (state.alcoholText = v), "alcohol", "decimal"));
        section.appendChild(textRow("日本酒度 (例: +3.5, -2)", state.sakeMeterText, (v) => (state.sakeMeterText = v), "sakemeter", "text"));
        section.appendChild(el(`<div class="hint">マイナス=甘口、プラス=辛口(ラベル記載の数値)</div>`));
        return section;
      }

      function buildDateSection() {
        const section = el(`<div class="form-section"></div>`);
        section.appendChild(dateRow("購入日", state.purchaseDate, (v) => (state.purchaseDate = v)));
        section.appendChild(dateRow("最後に飲んだ日", state.drankDate, (v) => (state.drankDate = v)));
        return section;
      }

      function dateRow(label, value, onSet) {
        const row = el(`
          <div class="form-row" style="flex-direction:row;justify-content:space-between;align-items:center;cursor:pointer;">
            <label style="margin:0;">${escapeHtml(label)}</label>
            <span style="color:var(--text-secondary);">${formatDate(value) || "未設定"}</span>
          </div>
        `);
        row.addEventListener("click", async () => {
          const result = await datePickerSheet(value);
          if (result !== undefined) {
            onSet(result);
            renderContent();
          }
        });
        return row;
      }

      function buildSliderSection() {
        const section = el(`<div class="form-section"></div>`);
        section.appendChild(sliderRow("甘辛度(辛口〜甘口)", state.sweetness, (v) => (state.sweetness = v)));
        section.appendChild(sliderRow("香り(弱〜強)", state.aroma, (v) => (state.aroma = v)));
        section.appendChild(sliderRow("淡濃度(淡麗〜濃醇)", state.richness, (v) => (state.richness = v)));
        return section;
      }

      function sliderRow(label, value, onSet) {
        const row = el(`
          <div class="slider-row">
            <div class="slider-label">${escapeHtml(label)}: <span class="val">${value.toFixed(1)}</span></div>
            <input type="range" min="0.5" max="5" step="0.5" value="${value}" />
          </div>
        `);
        const input = row.querySelector("input");
        const valSpan = row.querySelector(".val");

        // 縦スクロール中にスライダーへ触れてしまっても値が変わらないようにする。
        // 動き始めの方向を見て、縦方向優勢なら「スクロールのつもり」と判定し、値を元に戻す。
        let gestureStartValue = value;
        let gestureStartX = null;
        let gestureStartY = null;
        let gestureIsVertical = false;

        input.addEventListener("pointerdown", (ev) => {
          gestureStartValue = parseFloat(input.value);
          gestureStartX = ev.clientX;
          gestureStartY = ev.clientY;
          gestureIsVertical = false;
        });
        input.addEventListener("pointermove", (ev) => {
          if (gestureStartX === null || gestureIsVertical) return;
          const dx = ev.clientX - gestureStartX;
          const dy = ev.clientY - gestureStartY;
          if (Math.hypot(dx, dy) > 12 && Math.abs(dy) > Math.abs(dx) * 1.3) {
            gestureIsVertical = true;
            input.value = gestureStartValue;
            valSpan.textContent = gestureStartValue.toFixed(1);
          }
        });
        const endGesture = () => {
          gestureStartX = null;
          gestureStartY = null;
          gestureIsVertical = false;
        };
        input.addEventListener("pointerup", endGesture);
        input.addEventListener("pointercancel", endGesture);

        input.addEventListener("input", () => {
          if (gestureIsVertical) {
            input.value = gestureStartValue;
            return;
          }
          const v = parseFloat(input.value);
          onSet(v);
          valSpan.textContent = v.toFixed(1);
        });
        return row;
      }

      function buildRatingSection() {
        const section = el(`<div class="form-section"><h3>総合評価</h3></div>`);
        const stars = createStarRating({
          rating: state.rating,
          size: 30,
          onChange: (v) => {
            state.rating = v;
            stars.updateRating(v);
          },
        });
        section.appendChild(stars);
        return section;
      }

      function buildDrinkingStyleSection() {
        const section = el(`<div class="form-section"><h3>飲み方ごとの評価</h3></div>`);
        state.drinkingStyleOrder.forEach((styleName) => {
          const value = state.drinkingStyleRatings[styleName] || 0;
          const row = el(`
            <div class="style-row">
              <span class="style-name">${escapeHtml(styleName)}</span>
              <span class="stars-slot"></span>
              <span style="flex:1;"></span>
              ${value > 0 ? '<button class="reset-link">リセット</button>' : ""}
              ${DEFAULT_DRINKING_STYLES.includes(styleName) ? "" : '<button class="remove-style">✕</button>'}
            </div>
          `);
          const stars = createStarRating({
            rating: value,
            size: 22,
            onChange: (v) => {
              state.drinkingStyleRatings[styleName] = v;
              renderContent();
            },
          });
          row.querySelector(".stars-slot").replaceWith(stars);
          const resetBtn = row.querySelector(".reset-link");
          if (resetBtn) {
            resetBtn.addEventListener("click", () => {
              state.drinkingStyleRatings[styleName] = 0;
              renderContent();
            });
          }
          const removeBtn = row.querySelector(".remove-style");
          if (removeBtn) {
            removeBtn.addEventListener("click", () => {
              state.drinkingStyleOrder = state.drinkingStyleOrder.filter((s) => s !== styleName);
              delete state.drinkingStyleRatings[styleName];
              renderContent();
            });
          }
          section.appendChild(row);
        });

        const inlineAdd = el(`
          <div class="add-inline">
            <input type="text" placeholder="飲み方を自由追加" />
            <button>+</button>
          </div>
        `);
        const input = inlineAdd.querySelector("input");
        const commit = () => {
          const text = input.value.trim();
          if (!text) return;
          if (!state.drinkingStyleOrder.includes(text)) state.drinkingStyleOrder.push(text);
          if (state.drinkingStyleRatings[text] === undefined) state.drinkingStyleRatings[text] = 0;
          renderContent();
        };
        inlineAdd.querySelector("button").addEventListener("click", commit);
        input.addEventListener("keydown", (ev) => ev.key === "Enter" && commit());
        section.appendChild(inlineAdd);
        return section;
      }

      function buildTagSection() {
        const section = el(`<div class="form-section"><h3>印象タグ</h3></div>`);
        const cloud = el(`<div class="tag-cloud"></div>`);
        const allTags = [...TAG_TEMPLATES, ...[...state.tags].filter((t) => !TAG_TEMPLATES.includes(t)).sort()];
        allTags.forEach((tag) => {
          const chip = el(`<span class="tag-chip ${state.tags.has(tag) ? "selected" : ""}">${escapeHtml(tag)}</span>`);
          chip.addEventListener("click", () => {
            if (state.tags.has(tag)) state.tags.delete(tag);
            else state.tags.add(tag);
            renderContent();
          });
          cloud.appendChild(chip);
        });
        section.appendChild(cloud);

        const inlineAdd = el(`
          <div class="add-inline">
            <input type="text" placeholder="タグを自由追加" />
            <button>+</button>
          </div>
        `);
        const input = inlineAdd.querySelector("input");
        const commit = () => {
          const text = input.value.trim();
          if (!text) return;
          state.tags.add(text);
          renderContent();
        };
        inlineAdd.querySelector("button").addEventListener("click", commit);
        input.addEventListener("keydown", (ev) => ev.key === "Enter" && commit());
        section.appendChild(inlineAdd);
        return section;
      }

      function buildMiscSection() {
        const section = el(`<div class="form-section"></div>`);
        section.appendChild(textRow("価格", state.price, (v) => (state.price = v), "price", "decimal"));
        section.appendChild(textRow("飲んだ場所", state.place, (v) => (state.place = v), "place"));
        const row = el(`
          <div class="form-row">
            <label>メモ・感想</label>
            <textarea rows="4">${escapeHtml(state.memo)}</textarea>
          </div>
        `);
        row.querySelector("textarea").addEventListener("input", (ev) => (state.memo = ev.target.value));
        section.appendChild(row);
        return section;
      }

      function textRow(label, value, onInput, key, inputMode) {
        const row = el(`
          <div class="form-row">
            <label>${escapeHtml(label)}</label>
            <input type="text" data-key="${key}" value="${escapeHtml(value)}" ${inputMode ? `inputmode="${inputMode}"` : ""} />
          </div>
        `);
        row.querySelector("input").addEventListener("input", (ev) => onInput(ev.target.value));
        return row;
      }

      async function save() {
        const trimmedBrand = state.brandName.trim();
        if (!trimmedBrand) {
          state.showBrandError = true;
          renderContent();
          return;
        }

        const entries = state.polishingRows
          .map((row) => {
            const variety = row.riceVariety.trim();
            const ratio = row.ratio.trim() === "" ? null : parseFloat(row.ratio);
            if (!variety && ratio === null) return null;
            return { riceVariety: variety, ratio: Number.isNaN(ratio) ? null : ratio };
          })
          .filter(Boolean);

        const folderId = await resolveFolderId(store.uid, store.folders, state.folderText);
        const cleanedStyles = Object.fromEntries(Object.entries(state.drinkingStyleRatings).filter(([, v]) => v > 0));

        const payload = {
          brandName: trimmedBrand,
          breweryName: state.breweryName.trim(),
          origin: state.origin.trim(),
          polishingEntries: entries,
          purchaseDate: state.purchaseDate,
          drankDate: state.drankDate,
          sweetness: state.sweetness,
          aroma: state.aroma,
          richness: state.richness,
          alcoholPercentage: toNumberOrNull(state.alcoholText),
          sakeMeterValue: toNumberOrNull(state.sakeMeterText),
          tags: [...state.tags],
          price: toNumberOrNull(state.price),
          place: state.place.trim(),
          memo: state.memo.trim(),
          photoPaths: state.photoPaths,
          rating: state.rating,
          drinkingStyleRatings: cleanedStyles,
          folderId,
          isFavorite: state.isFavorite,
        };

        if (isEditing) {
          await updateRecord(store.uid, original.id, payload);
        } else {
          await createRecord(store.uid, payload);
        }
        pop();
      }

      renderContent();
      return screen;
    },
  };
}
