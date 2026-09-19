import { el } from "../helpers.js";
import { signInWithGoogle, signOutUser } from "../auth.js";

function googleButtonHtml(id = "google-signin") {
  return `
    <button class="google-btn" id="${id}">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.85 2.09-1.81 2.73v2.27h2.92c1.71-1.57 2.69-3.88 2.69-6.64z"/>
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.17l-2.92-2.27c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.34C2.44 15.98 5.48 18 9 18z"/>
        <path fill="#FBBC05" d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.34z"/>
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.95l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"/>
      </svg>
      <span>Googleでログイン</span>
    </button>
  `;
}

export function AuthScreen() {
  return {
    render() {
      const node = el(`
        <div class="screen auth-screen">
          <div class="auth-hero">
            <div class="auth-decor auth-decor-1"></div>
            <div class="auth-decor auth-decor-2"></div>
            <div class="auth-decor auth-decor-3"></div>
            <span class="auth-eyebrow">SAKE DIARY</span>
            <h1>日本酒手帳</h1>
            <p class="auth-tagline">飲んだ日本酒を、記憶より記録に。</p>
            <img class="auth-illustration" src="icons/icon-512.png" alt="日本酒手帳" />
          </div>
          <div class="auth-panel">
            <ul class="auth-points">
              <li><span class="auth-point-icon">📝</span><span class="auth-point-text">銘柄・産地・味わいを手早く記録</span></li>
              <li><span class="auth-point-icon">☁️</span><span class="auth-point-text">Googleアカウントでどの端末からも同期</span></li>
              <li><span class="auth-point-icon">📊</span><span class="auth-point-text">好みの傾向をグラフと地図で可視化</span></li>
            </ul>
            ${googleButtonHtml()}
            <p class="auth-fineprint">ログインすると、記録データはご自身のGoogleアカウントに安全に保存されます。</p>
          </div>

          <div class="feature-list">
            <div class="feature-eyebrow">FEATURES</div>
            <h2 class="feature-heading">日本酒手帳でできること</h2>

            <section class="feature-card">
              <div class="feature-icon-tile" style="background:linear-gradient(150deg,#FFD166,var(--yamabuki));">📝</div>
              <h3>飲んだ記録を、サクサク残せる</h3>
              <p>銘柄・酒蔵・産地はもちろん、精米歩合や日本酒度、香り・甘辛度・淡濃度まで。星評価と写真も添えて、飲んだその場でサッと記録できます。</p>
            </section>

            <section class="feature-card feature-card-alt">
              <div class="feature-icon-tile" style="background:linear-gradient(150deg,#8FD3C8,var(--chart-accent));">☁️</div>
              <h3>どの端末でも、同じ記録が見られる</h3>
              <p>Googleアカウントでログインするだけ。スマホで記録した内容が、そのままPCやタブレットでも見られます。機種変更してもデータはそのまま引き継がれます。</p>
            </section>

            <section class="feature-card">
              <div class="feature-icon-tile" style="background:linear-gradient(150deg,#FFB86B,var(--yamabuki-deep));">📊</div>
              <h3>自分の「好み」が見えてくる</h3>
              <p>淡麗〜濃醇・辛口〜甘口の好みマップ、精米歩合やアルコール度数と評価の関係をグラフで振り返れます。記録が増えるほど、自分の好みの輪郭がはっきりしてきます。</p>
            </section>

            <section class="feature-card feature-card-alt">
              <div class="feature-icon-tile" style="background:linear-gradient(150deg,#9FB8E8,var(--chart-accent));">🗾</div>
              <h3>産地を地図でふりかえる</h3>
              <p>飲んだ日本酒の産地を都道府県ごとに色分け表示。気になる県をタップすれば、その土地のお酒だけを一覧できます。旅先のお土産選びにも便利です。</p>
            </section>

            <div class="feature-cta">
              ${googleButtonHtml("google-signin-2")}
            </div>
          </div>
        </div>
      `);

      function wireButton(id) {
        const btn = node.querySelector(`#${id}`);
        if (!btn) return;
        btn.addEventListener("click", async (ev) => {
          const target = ev.target.closest("button");
          target.disabled = true;
          try {
            await signInWithGoogle();
          } catch (err) {
            alert("ログインに失敗しました: " + (err?.message || err));
            target.disabled = false;
          }
        });
      }
      wireButton("google-signin");
      wireButton("google-signin-2");

      return node;
    },
  };
}

/** 利用申請を送った直後、管理者の承認待ちの間に表示する画面。 */
export function PendingApprovalScreen() {
  return {
    render() {
      const node = el(`
        <div class="screen auth-screen">
          <div class="auth-card">
            <div class="auth-emblem">⏳</div>
            <h1>承認をお待ちください</h1>
            <p class="auth-desc">
              このアプリは招待制です。利用申請を送信しました。<br />
              管理者が承認すると、自動的に使えるようになります。
            </p>
            <button class="google-btn" id="signout-btn"><span>ログアウトする</span></button>
          </div>
        </div>
      `);
      node.querySelector("#signout-btn").addEventListener("click", () => signOutUser());
      return node;
    },
  };
}

/** 管理者に却下された場合の画面。 */
export function DeniedScreen() {
  return {
    render() {
      const node = el(`
        <div class="screen auth-screen">
          <div class="auth-card">
            <div class="auth-emblem">🔒</div>
            <h1>利用が承認されませんでした</h1>
            <p class="auth-desc">
              このGoogleアカウントでの利用は許可されていません。<br />
              心当たりがない場合は、管理者に確認してください。
            </p>
            <button class="google-btn" id="signout-btn"><span>ログアウトする</span></button>
          </div>
        </div>
      `);
      node.querySelector("#signout-btn").addEventListener("click", () => signOutUser());
      return node;
    },
  };
}
