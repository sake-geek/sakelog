export const TAG_TEMPLATES = ["辛口", "甘口", "フルーティ", "濃醇", "淡麗"];
export const DEFAULT_DRINKING_STYLES = ["冷酒", "常温", "ぬる燗", "熱燗"];
export const MAX_PHOTOS = 5;

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
