import { el } from "../helpers.js";
import { store } from "../store.js";
import { toggleFavorite } from "../dataStore.js";
import { matchPrefecture, PREFECTURE_SHAPES, PREF_MAP_WIDTH, PREF_MAP_HEIGHT } from "../prefectures.js";
import { recordRowNode } from "../components.js";
import { push, pop } from "../router.js";
import { RecordDetailScreen } from "./detail.js";

export function PrefectureMapScreen(records) {
  return {
    render() {
      const byPref = new Map();
      for (const r of records) {
        const pref = matchPrefecture(r.origin);
        if (!pref) continue;
        if (!byPref.has(pref)) byPref.set(pref, []);
        byPref.get(pref).push(r);
      }

      const screen = el(`
        <div class="screen">
          <div class="topbar">
            <button class="icon-btn" data-action="back">←</button>
            <h1>都道府県マップ</h1>
            <button class="icon-btn" data-action="info">ⓘ</button>
          </div>
          <div class="map-caption">飲んだ日本酒の産地を都道府県別に表示しています(タップすると登録したお酒の一覧を表示します)</div>
          <div class="map-canvas-wrap"><canvas id="prefCanvas"></canvas></div>
        </div>
      `);

      screen.querySelector('[data-action="back"]').addEventListener("click", () => pop());
      screen.querySelector('[data-action="info"]').addEventListener("click", () => {
        alert("出典: 国土交通省 国土数値情報(行政区域データ)を簡略化");
      });

      const wrap = screen.querySelector(".map-canvas-wrap");
      const canvas = screen.querySelector("#prefCanvas");

      // レイアウト確定後にcanvasサイズを決める(コンテナ幅に合わせる)。
      requestAnimationFrame(() => {
        const width = Math.min(wrap.clientWidth, 480);
        const height = (width * PREF_MAP_HEIGHT) / PREF_MAP_WIDTH;
        const dpr = window.devicePixelRatio || 1;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        const mapScale = (width * dpr) / PREF_MAP_WIDTH;

        const ctx = canvas.getContext("2d");
        const accent = getComputedStyle(document.documentElement).getPropertyValue("--chart-accent").trim() || "#2F6FA0";
        const emptyFill = getComputedStyle(document.documentElement).getPropertyValue("--surface-2").trim() || "#eee";
        const strokeColor = getComputedStyle(document.documentElement).getPropertyValue("--border").trim() || "#ccc";

        const shapePaths = new Map();

        function draw() {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          for (const [pref, flat] of Object.entries(PREFECTURE_SHAPES)) {
            const path = new Path2D();
            for (let i = 0; i + 1 < flat.length; i += 2) {
              const x = flat[i] * mapScale;
              const y = flat[i + 1] * mapScale;
              if (i === 0) path.moveTo(x, y);
              else path.lineTo(x, y);
            }
            path.closePath();
            shapePaths.set(pref, path);

            const count = byPref.get(pref)?.length || 0;
            ctx.fillStyle = count > 0 ? accent : emptyFill;
            ctx.fill(path);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 0.8 * dpr;
            ctx.stroke(path);

            if (count > 0) {
              const centroid = centroidOf(flat);
              ctx.fillStyle = "#ffffff";
              ctx.font = `bold ${11 * dpr}px sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(String(count), centroid.x * mapScale, centroid.y * mapScale);
            }
          }
        }
        draw();

        // ピンチズーム/パンはCSS transformで行う。クリック判定はgetBoundingClientRect()を
        // 使うことで、変形後の見た目のサイズから逆算するのでズーム倍率を気にせず計算できる。
        let scale = 1;
        let offsetX = 0;
        let offsetY = 0;
        const pointers = new Map();
        let dragStart = null;
        let pinchStart = null;
        let moved = false;

        function applyTransform() {
          canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
        }

        function dist(a, b) {
          return Math.hypot(a.x - b.x, a.y - b.y);
        }

        canvas.addEventListener("pointerdown", (ev) => {
          canvas.setPointerCapture(ev.pointerId);
          pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
          moved = false;
          if (pointers.size === 1) {
            const p = [...pointers.values()][0];
            dragStart = { x: p.x, y: p.y, offsetX, offsetY };
            pinchStart = null;
          } else if (pointers.size === 2) {
            const [a, b] = [...pointers.values()];
            pinchStart = { dist: dist(a, b), scale };
            dragStart = null;
          }
        });

        canvas.addEventListener("pointermove", (ev) => {
          if (!pointers.has(ev.pointerId)) return;
          pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
          if (pointers.size === 1 && dragStart) {
            const p = [...pointers.values()][0];
            offsetX = dragStart.offsetX + (p.x - dragStart.x);
            offsetY = dragStart.offsetY + (p.y - dragStart.y);
            if (Math.abs(p.x - dragStart.x) > 4 || Math.abs(p.y - dragStart.y) > 4) moved = true;
            applyTransform();
          } else if (pointers.size === 2 && pinchStart) {
            const [a, b] = [...pointers.values()];
            const newDist = dist(a, b);
            scale = Math.max(1, Math.min(6, pinchStart.scale * (newDist / pinchStart.dist)));
            moved = true;
            applyTransform();
          }
        });

        function endPointer(ev) {
          pointers.delete(ev.pointerId);
          if (pointers.size === 1) {
            const p = [...pointers.values()][0];
            dragStart = { x: p.x, y: p.y, offsetX, offsetY };
            pinchStart = null;
          } else if (pointers.size === 0) {
            dragStart = null;
            pinchStart = null;
          }
        }
        canvas.addEventListener("pointerup", endPointer);
        canvas.addEventListener("pointercancel", endPointer);

        canvas.addEventListener("click", (ev) => {
          if (moved) return;
          const rect = canvas.getBoundingClientRect();
          const cx = ((ev.clientX - rect.left) / rect.width) * canvas.width;
          const cy = ((ev.clientY - rect.top) / rect.height) * canvas.height;
          for (const [pref, path] of shapePaths.entries()) {
            if (ctx.isPointInPath(path, cx, cy)) {
              const list = byPref.get(pref);
              if (list && list.length > 0) openPrefSheet(pref, list);
              return;
            }
          }
        });
      });

      return screen;
    },
  };
}

function centroidOf(flat) {
  let sx = 0,
    sy = 0,
    n = 0;
  for (let i = 0; i + 1 < flat.length; i += 2) {
    sx += flat[i];
    sy += flat[i + 1];
    n += 1;
  }
  return n > 0 ? { x: sx / n, y: sy / n } : { x: 0, y: 0 };
}

function openPrefSheet(pref, records) {
  const overlay = el(`
    <div class="sheet-overlay">
      <div class="sheet">
        <div class="sheet-header">
          <span>${pref}(${records.length}本)</span>
          <button data-action="close">閉じる</button>
        </div>
        <div id="pref-sheet-list"></div>
      </div>
    </div>
  `);
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (ev) => {
    if (ev.target === overlay) overlay.remove();
  });
  overlay.querySelector('[data-action="close"]').addEventListener("click", () => overlay.remove());
  const list = overlay.querySelector("#pref-sheet-list");
  records.forEach((record) => {
    list.appendChild(
      recordRowNode(record, {
        onClick: (r) => {
          overlay.remove();
          push(RecordDetailScreen(r.id));
        },
        onToggleFavorite: (r) => toggleFavorite(store.uid, r),
      })
    );
  });
}
