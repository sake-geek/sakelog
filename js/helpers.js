export const TAG_TEMPLATES = ["辛口", "甘口", "フルーティ", "濃醇", "淡麗"];
export const DEFAULT_DRINKING_STYLES = ["冷酒", "常温", "ぬる燗", "熱燗"];
export const MAX_PHOTOS = 5;

/** OS絵文字ではなく見た目を揃えるための、線画スタイルのアイコン(currentColorで色を継承)。 */
export const ICONS = {
  search: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  stats: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="20" x2="4" y2="12"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="20" y1="20" x2="20" y2="14"/></svg>`,
  map: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
  folder: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>`,
};

/** HTML文字列から要素を1つ作る(ルートは1タグのみ想定)。 */
export function el(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

export function formatDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}

export function toDateInputValue(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Number(value).toFixed(digits);
}

/** 日本酒度はプラスが辛口なので符号を明示する。 */
export function formatSakeMeter(value) {
  const formatted = formatNumber(value);
  if (formatted === null) return null;
  return value > 0 ? `+${formatted}` : formatted;
}

export function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/**
 * 星評価コンポーネントを生成する。
 * onChange を渡すと編集可能(タップ位置の左右半分で0.5刻み判定)、省略すると読み取り専用になる。
 */
export function createStarRating({ rating = 0, size = 24, onChange = null } = {}) {
  const wrap = document.createElement("div");
  wrap.className = "star-rating" + (onChange ? "" : " readonly");

  function iconFor(starValue, value) {
    if (value >= starValue) return "★";
    if (value >= starValue - 0.5) return "⯨"; // 半分埋め代替(フォント依存を避けるため下でCSSグラデーションに置換)
    return "☆";
  }

  function render(value) {
    wrap.innerHTML = "";
    for (let i = 1; i <= 5; i++) {
      const starBox = document.createElement("span");
      starBox.className = "star";
      starBox.style.position = "relative";
      starBox.style.display = "inline-block";
      starBox.style.width = `${size}px`;
      starBox.style.height = `${size}px`;
      starBox.style.fontSize = `${size}px`;
      starBox.style.lineHeight = 1;

      const fillRatio = Math.max(0, Math.min(1, value - (i - 1)));
      starBox.innerHTML = `
        <span style="position:absolute;inset:0;color:var(--border);overflow:hidden;white-space:nowrap;">★</span>
        <span style="position:absolute;inset:0;color:#F5A623;overflow:hidden;white-space:nowrap;width:${fillRatio * 100}%;">★</span>
      `;

      if (onChange) {
        starBox.addEventListener("click", (ev) => {
          const rect = starBox.getBoundingClientRect();
          const isHalf = ev.clientX - rect.left < rect.width / 2;
          onChange(isHalf ? i - 0.5 : i);
        });
      }
      wrap.appendChild(starBox);
    }
  }

  render(rating);
  wrap.updateRating = render;
  return wrap;
}

export function debounce(fn, wait = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
