import { el } from "../helpers.js";
import { store } from "../store.js";
import { toggleFavorite } from "../dataStore.js";
import { recordRowNode } from "../components.js";
import { push, pop } from "../router.js";
import { RecordDetailScreen } from "./detail.js";

const SORT_OPTIONS = [
  { value: "newest", label: "追加順(新しい順)" },
  { value: "ratingDesc", label: "評価が高い順" },
  { value: "ratingAsc", label: "評価が低い順" },
  { value: "drankDateDesc", label: "最後に飲んだ日が新しい順" },
];

let searchText = "";
let selectedTags = new Set();
let sortOption = "newest";
let favoritesOnly = false;

export function SearchScreen() {
  return {
    render() {
      const screen = el(`
        <div class="screen">
          <div class="topbar">
            <button class="icon-btn" data-action="back">←</button>
            <h1>検索・絞り込み</h1>
            <button class="icon-btn ${favoritesOnly ? "active" : ""}" data-action="fav">${favoritesOnly ? "♥" : "♡"}</button>
          </div>
          <div class="content">
            <div class="search-bar"><input type="text" placeholder="銘柄名・産地・タグ・メモなどで検索" value="${escAttr(searchText)}" /></div>
            <div class="tag-cloud" id="search-tags" style="padding:0 12px 8px;"></div>
            <div class="filter-row">
              並び替え:
              <select id="sort-select">
                ${SORT_OPTIONS.map((o) => `<option value="${o.value}" ${o.value === sortOption ? "selected" : ""}>${o.label}</option>`).join("")}
              </select>
            </div>
            <div id="search-results"></div>
          </div>
        </div>
      `);

      const favBtn = screen.querySelector('[data-action="fav"]');
      const tagCloud = screen.querySelector("#search-tags");
      const results = screen.querySelector("#search-results");
      const searchInput = screen.querySelector(".search-bar input");

      // 検索文字・タグ・並び替えの変更は、画面全体を作り直す(=入力欄も作り直されてキーボードが
      // 閉じてしまう)router.rerender()を使わず、結果一覧だけをその場で更新する。
      function renderResults() {
        const query = searchText.trim().toLowerCase();
        let filtered = store.records.filter((record) => {
          const matchesText =
            !query ||
            [record.brandName, record.breweryName, record.origin, record.place, record.memo]
              .some((f) => (f || "").toLowerCase().includes(query)) ||
            (record.tags || []).some((t) => t.toLowerCase().includes(query));
          const matchesTags = selectedTags.size === 0 || [...selectedTags].every((t) => (record.tags || []).includes(t));
          const matchesFavorite = !favoritesOnly || record.isFavorite;
          return matchesText && matchesTags && matchesFavorite;
        });

        filtered = [...filtered].sort((a, b) => {
          switch (sortOption) {
            case "ratingDesc":
              return (b.rating || 0) - (a.rating || 0);
            case "ratingAsc":
              return (a.rating || 0) - (b.rating || 0);
            case "drankDateDesc": {
              if (!a.drankDate && !b.drankDate) return 0;
              if (!a.drankDate) return 1;
              if (!b.drankDate) return -1;
              return new Date(b.drankDate) - new Date(a.drankDate);
            }
            default: {
              const at = a.createdAt?.toMillis ? a.createdAt.toMillis() : a.createdAt || 0;
              const bt = b.createdAt?.toMillis ? b.createdAt.toMillis() : b.createdAt || 0;
              return bt - at;
            }
          }
        });

        results.innerHTML = "";
        if (filtered.length === 0) {
          results.appendChild(
            el(`<div class="empty-state">${favoritesOnly ? "お気に入りの記録が見つかりません。" : "該当する記録が見つかりません。"}</div>`)
          );
        } else {
          filtered.forEach((record) => {
            results.appendChild(
              recordRowNode(record, {
                onClick: (r) => push(RecordDetailScreen(r.id)),
                onToggleFavorite: (r) => toggleFavorite(store.uid, r),
              })
            );
          });
        }
      }

      function renderTags() {
        tagCloud.innerHTML = "";
        const availableTags = [...new Set(store.records.flatMap((r) => r.tags || []))].sort();
        availableTags.forEach((tag) => {
          const chip = el(`<span class="tag-chip ${selectedTags.has(tag) ? "selected" : ""}">${escAttr(tag)}</span>`);
          chip.addEventListener("click", () => {
            if (selectedTags.has(tag)) selectedTags.delete(tag);
            else selectedTags.add(tag);
            chip.classList.toggle("selected", selectedTags.has(tag));
            renderResults();
          });
          tagCloud.appendChild(chip);
        });
      }

      screen.querySelector('[data-action="back"]').addEventListener("click", () => pop());
      favBtn.addEventListener("click", () => {
        favoritesOnly = !favoritesOnly;
        favBtn.textContent = favoritesOnly ? "♥" : "♡";
        favBtn.classList.toggle("active", favoritesOnly);
        renderResults();
      });

      searchInput.addEventListener("input", (ev) => {
        searchText = ev.target.value;
        renderResults();
      });

      screen.querySelector("#sort-select").addEventListener("change", (ev) => {
        sortOption = ev.target.value;
        renderResults();
      });

      renderTags();
      renderResults();

      return screen;
    },
  };
}

function escAttr(str) {
  return String(str ?? "").replace(/"/g, "&quot;");
}
