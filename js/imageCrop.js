function canvasToBlob(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

async function exportWithSizeLimit(canvas, maxBytes) {
  const qualities = [0.85, 0.7, 0.55, 0.4, 0.25];
  let last = null;
  for (const q of qualities) {
    const blob = await canvasToBlob(canvas, q);
    last = blob;
    if (blob.size <= maxBytes) return blob;
  }
  return last;
}

/**
 * 画像ファイルを受け取り、ピンチズーム/ドラッグで画角を調整するモーダルを表示する。
 * 完了時はJPEG Blob、キャンセル時はnullでresolveする。
 */
export function openImageCrop(file) {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const probeImg = new Image();

    probeImg.onload = () => {
      const naturalW = probeImg.naturalWidth;
      const naturalH = probeImg.naturalHeight;
      const FRAME = 300;
      const baseScale = Math.max(FRAME / naturalW, FRAME / naturalH);

      let scale = 1;
      let offsetX = 0;
      let offsetY = 0;

      const overlay = document.createElement("div");
      overlay.className = "crop-overlay";
      overlay.innerHTML = `
        <div class="crop-top">
          <button data-action="cancel">キャンセル</button>
          <span>画像を調整</span>
          <button data-action="done">完了</button>
        </div>
        <div class="crop-stage-wrap">
          <div class="crop-frame">
            <img src="${objectUrl}" draggable="false" alt="" />
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const frame = overlay.querySelector(".crop-frame");
      const imgEl = overlay.querySelector(".crop-frame img");
      imgEl.style.width = `${naturalW * baseScale}px`;
      imgEl.style.height = `${naturalH * baseScale}px`;

      function applyTransform() {
        imgEl.style.transform = `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
      }
      applyTransform();

      const pointers = new Map();
      let dragStart = null;
      let pinchStart = null;

      function dist(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
      }

      frame.addEventListener("pointerdown", (ev) => {
        frame.setPointerCapture(ev.pointerId);
        pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
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

      frame.addEventListener("pointermove", (ev) => {
        if (!pointers.has(ev.pointerId)) return;
        pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        if (pointers.size === 1 && dragStart) {
          const p = [...pointers.values()][0];
          offsetX = dragStart.offsetX + (p.x - dragStart.x);
          offsetY = dragStart.offsetY + (p.y - dragStart.y);
          applyTransform();
        } else if (pointers.size === 2 && pinchStart) {
          const [a, b] = [...pointers.values()];
          const newDist = dist(a, b);
          scale = Math.max(1, Math.min(5, pinchStart.scale * (newDist / pinchStart.dist)));
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
      frame.addEventListener("pointerup", endPointer);
      frame.addEventListener("pointercancel", endPointer);

      // デスクトップ用にホイールでもズームできるようにする。
      frame.addEventListener(
        "wheel",
        (ev) => {
          ev.preventDefault();
          scale = Math.max(1, Math.min(5, scale - ev.deltaY * 0.002));
          applyTransform();
        },
        { passive: false }
      );

      function cleanup() {
        overlay.remove();
        URL.revokeObjectURL(objectUrl);
      }

      overlay.querySelector('[data-action="cancel"]').addEventListener("click", () => {
        cleanup();
        resolve(null);
      });

      overlay.querySelector('[data-action="done"]').addEventListener("click", async () => {
        const EXPORT = 600;
        const ratio = EXPORT / FRAME;
        const canvas = document.createElement("canvas");
        canvas.width = EXPORT;
        canvas.height = EXPORT;
        const ctx = canvas.getContext("2d");
        ctx.save();
        ctx.translate(EXPORT / 2 + offsetX * ratio, EXPORT / 2 + offsetY * ratio);
        ctx.scale(baseScale * scale * ratio, baseScale * scale * ratio);
        ctx.drawImage(probeImg, -naturalW / 2, -naturalH / 2);
        ctx.restore();

        // Firestoreの1ドキュメント上限(1MiB)にBase64化しても収まるよう、
        // 品質を段階的に下げながら約700KB以下になるまで書き出す。
        const blob = await exportWithSizeLimit(canvas, 700_000);
        cleanup();
        resolve(blob);
      });
    };

    probeImg.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    probeImg.src = objectUrl;
  });
}
