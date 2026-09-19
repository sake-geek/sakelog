import { el, escapeHtml, formatDate } from "../helpers.js";
import { subscribeAllAccessRequests, setAccessRequestStatus } from "../dataStore.js";
import { pop } from "../router.js";
import { confirmDialog } from "../modals.js";

const STATUS_LABEL = {
  pending: "保留中",
  approved: "承認済み",
  denied: "却下",
};

export function AdminRequestsScreen() {
  let requests = [];
  let unsub = null;

  return {
    render() {
      const screen = el(`
        <div class="screen">
          <div class="topbar">
            <button class="icon-btn" data-action="back">←</button>
            <h1>利用申請の管理</h1>
          </div>
          <div class="content" id="admin-content"></div>
        </div>
      `);

      screen.querySelector('[data-action="back"]').addEventListener("click", () => {
        if (unsub) unsub();
        pop();
      });

      const content = screen.querySelector("#admin-content");

      function paint() {
        content.innerHTML = "";
        if (requests.length === 0) {
          content.appendChild(el(`<div class="empty-state">まだ利用申請はありません。</div>`));
          return;
        }
        const pending = requests.filter((r) => r.status === "pending");
        const others = requests.filter((r) => r.status !== "pending");

        if (pending.length > 0) {
          content.appendChild(el(`<div class="section-label">保留中(${pending.length}件)</div>`));
          pending.forEach((r) => content.appendChild(requestRow(r)));
        }
        if (others.length > 0) {
          content.appendChild(el(`<div class="section-label">対応済み</div>`));
          others.forEach((r) => content.appendChild(requestRow(r)));
        }
      }

      function requestRow(r) {
        const row = el(`
          <div class="record-row" style="cursor:default;">
            <div class="thumb-placeholder">👤</div>
            <div class="info">
              <div class="brand">${escapeHtml(r.displayName || "(名前未取得)")}</div>
              <div class="subtitle">${escapeHtml(r.email || "")} ・ ${STATUS_LABEL[r.status] || r.status} ・ ${formatDate(r.requestedAt?.toMillis ? r.requestedAt.toMillis() : r.requestedAt) || ""}</div>
            </div>
          </div>
        `);
        const actions = el(`<div style="display:flex; gap:8px; padding: 0 12px 8px;"></div>`);
        if (r.status !== "approved") {
          const approveBtn = el(`<button class="primary-btn" style="width:auto; padding:8px 16px; font-size:13px;">承認</button>`);
          approveBtn.addEventListener("click", async () => {
            await setAccessRequestStatus(r.id, "approved");
          });
          actions.appendChild(approveBtn);
        }
        if (r.status !== "denied") {
          const denyBtn = el(`<button class="primary-btn" style="width:auto; padding:8px 16px; font-size:13px; background:var(--danger);">却下</button>`);
          denyBtn.addEventListener("click", async () => {
            const ok = await confirmDialog({
              title: "却下の確認",
              message: `${r.email || "このアカウント"} の利用を却下しますか?`,
              confirmLabel: "却下する",
              destructive: true,
            });
            if (ok) await setAccessRequestStatus(r.id, "denied");
          });
          actions.appendChild(denyBtn);
        }
        const wrap = el(`<div></div>`);
        wrap.appendChild(row);
        wrap.appendChild(actions);
        return wrap;
      }

      unsub = subscribeAllAccessRequests((list) => {
        requests = list;
        paint();
      });

      paint();
      return screen;
    },
  };
}
