import { el } from "../helpers.js";
import { store } from "../store.js";
import { matchPrefecture } from "../prefectures.js";
import { push, pop, rerender } from "../router.js";
import { PrefectureMapScreen } from "./map.js";

const TABS = [
  { id: "preference", label: "好みマップ" },
  { id: "ranking", label: "産地ランキング" },
  { id: "polishing", label: "精米度×評価" },
  { id: "alcohol", label: "アルコール度数×評価" },
];

let activeTab = "preference";
let favoritesOnly = false;
let currentChart = null;

export function StatsScreen() {
  return {
    render() {
      const records = favoritesOnly ? store.records.filter((r) => r.isFavorite) : store.records;

      const screen = el(`
        <div class="screen">
          <div class="topbar">
            <button class="icon-btn" data-action="back">←</button>
            <h1>統計・分析</h1>
            <button class="icon-btn ${favoritesOnly ? "active" : ""}" data-action="fav">${favoritesOnly ? "♥" : "♡"}</button>
            <button class="icon-btn" data-action="map">🗺</button>
          </div>
          <div class="tabbar">
            ${TABS.map((t) => `<button class="tab-btn ${t.id === activeTab ? "active" : ""}" data-tab="${t.id}">${t.label}</button>`).join("")}
          </div>
          <div class="content" id="stats-content"></div>
        </div>
      `);

      screen.querySelector('[data-action="back"]').addEventListener("click", () => pop());
      screen.querySelector('[data-action="fav"]').addEventListener("click", () => {
        favoritesOnly = !favoritesOnly;
        rerender();
      });
      screen.querySelector('[data-action="map"]').addEventListener("click", () => push(PrefectureMapScreen(records)));

      screen.querySelectorAll("[data-tab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          activeTab = btn.getAttribute("data-tab");
          rerender();
        });
      });

      const content = screen.querySelector("#stats-content");

      if (records.length === 0) {
        content.appendChild(el(`<div class="empty-state">${favoritesOnly ? "お気に入りの記録がまだありません。" : "まだ記録がありません。"}</div>`));
        return screen;
      }

      if (currentChart) {
        currentChart.destroy();
        currentChart = null;
      }

      if (activeTab === "preference") renderPreferenceMap(content, records);
      else if (activeTab === "ranking") renderRanking(content, records);
      else if (activeTab === "polishing") renderPolishing(content, records);
      else if (activeTab === "alcohol") renderAlcohol(content, records);

      return screen;
    },
  };
}

function chartAccent() {
  return getComputedStyle(document.documentElement).getPropertyValue("--chart-accent").trim() || "#2F6FA0";
}
function textColor() {
  return getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#232019";
}
function gridColor() {
  return getComputedStyle(document.documentElement).getPropertyValue("--border").trim() || "#E5E0D3";
}

function renderPreferenceMap(content, records) {
  content.appendChild(el(`<div class="chart-caption">淡麗・濃醇 × 甘口・辛口(色が濃いほど記録が多い)</div>`));
  const wrap = el(`<div class="chart-wrap" style="height:320px;"><canvas></canvas></div>`);
  content.appendChild(wrap);
  content.appendChild(el(`
    <div class="quad-labels"><span>淡麗甘口</span><span>濃醇甘口</span></div>
  `));
  content.appendChild(el(`<div class="quad-labels" style="margin-top:280px;position:relative;top:-320px;"><span>淡麗辛口</span><span>濃醇辛口</span></div>`));

  const counts = new Map();
  for (const r of records) {
    const key = `${r.richness}_${r.sweetness}`;
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { richness: r.richness, sweetness: r.sweetness, count: 1 });
  }
  const maxCount = Math.max(1, ...[...counts.values()].map((v) => v.count));
  const points = [...counts.values()].map((v) => ({
    x: v.richness,
    y: v.sweetness,
    r: 10 + (v.count / maxCount) * 8,
    opacity: 0.3 + (v.count / maxCount) * 0.7,
  }));

  const accent = chartAccent();
  // ChartはcanvasがDOMに実際に挿入された後でないとgetComputedStyleに失敗するため、
  // 描画後の次フレームまで初期化を遅らせる(都道府県マップのcanvasと同じ対策)。
  requestAnimationFrame(() => {
    currentChart = new Chart(wrap.querySelector("canvas"), {
      type: "bubble",
      data: {
        datasets: [
          {
            data: points,
            backgroundColor: points.map((p) => hexWithAlpha(accent, p.opacity)),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { min: 0, max: 5.5, title: { display: true, text: "淡麗 〜 濃醇", color: textColor() }, ticks: { color: textColor() }, grid: { color: gridColor() } },
          y: { min: 0, max: 5.5, title: { display: true, text: "辛口 〜 甘口", color: textColor() }, ticks: { color: textColor() }, grid: { color: gridColor() } },
        },
        plugins: { legend: { display: false } },
      },
    });
  });
}

function renderRanking(content, records) {
  const counts = new Map();
  let unmatched = 0;
  for (const r of records) {
    const pref = matchPrefecture(r.origin);
    if (pref) counts.set(pref, (counts.get(pref) || 0) + 1);
    else if ((r.origin || "").trim()) unmatched += 1;
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0 && unmatched === 0) {
    content.appendChild(el(`<div class="empty-state">産地が入力された記録がまだありません。</div>`));
    return;
  }
  const maxCount = sorted[0]?.[1] || 1;
  sorted.forEach(([pref, count], i) => {
    content.appendChild(rankRow(`${i + 1}. ${pref}`, count, count / maxCount));
  });
  if (unmatched > 0) {
    content.appendChild(rankRow("その他(都道府県が特定できない産地)", unmatched, unmatched / maxCount));
  }
}

function rankRow(label, count, ratio) {
  return el(`
    <div class="rank-row">
      <div class="rank-top"><span>${label}</span><span>${count}件</span></div>
      <div class="rank-bar-bg"><div class="rank-bar-fill" style="width:${Math.max(2, Math.min(100, ratio * 100))}%;"></div></div>
    </div>
  `);
}

function renderPolishing(content, records) {
  const points = records
    .map((r) => {
      const ratios = (r.polishingEntries || []).map((e) => e.ratio).filter((v) => v != null);
      if (ratios.length === 0) return null;
      return { x: Math.min(...ratios), y: r.rating || 0 };
    })
    .filter(Boolean);

  if (points.length === 0) {
    content.appendChild(el(`<div class="empty-state">精米歩合が入力された記録がまだありません。</div>`));
    return;
  }
  content.appendChild(el(`<div class="chart-caption">精米歩合(%) × 総合評価(複数の米を使う場合は最小値)</div>`));
  const wrap = el(`<div class="chart-wrap" style="height:320px;"><canvas></canvas></div>`);
  content.appendChild(wrap);
  requestAnimationFrame(() => {
    currentChart = new Chart(wrap.querySelector("canvas"), {
      type: "scatter",
      data: { datasets: [{ data: points, backgroundColor: chartAccent() }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { min: 0, max: 100, title: { display: true, text: "精米歩合(%)", color: textColor() }, ticks: { color: textColor() }, grid: { color: gridColor() } },
          y: { min: 0, max: 5.5, title: { display: true, text: "総合評価", color: textColor() }, ticks: { color: textColor() }, grid: { color: gridColor() } },
        },
        plugins: { legend: { display: false } },
      },
    });
  });
}

function renderAlcohol(content, records) {
  const points = records
    .filter((r) => r.alcoholPercentage != null)
    .map((r) => ({ x: r.alcoholPercentage, y: r.rating || 0 }));

  if (points.length === 0) {
    content.appendChild(el(`<div class="empty-state">アルコール度数が入力された記録がまだありません。</div>`));
    return;
  }
  content.appendChild(el(`<div class="chart-caption">アルコール度数(%) × 総合評価</div>`));
  const wrap = el(`<div class="chart-wrap" style="height:320px;"><canvas></canvas></div>`);
  content.appendChild(wrap);
  requestAnimationFrame(() => {
    currentChart = new Chart(wrap.querySelector("canvas"), {
      type: "scatter",
      data: { datasets: [{ data: points, backgroundColor: chartAccent() }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { min: 0, max: 25, title: { display: true, text: "アルコール度数(%)", color: textColor() }, ticks: { color: textColor() }, grid: { color: gridColor() } },
          y: { min: 0, max: 5.5, title: { display: true, text: "総合評価", color: textColor() }, ticks: { color: textColor() }, grid: { color: gridColor() } },
        },
        plugins: { legend: { display: false } },
      },
    });
  });
}

function hexWithAlpha(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
