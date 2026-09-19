import { el } from "../helpers.js";
import { signInWithGoogle } from "../auth.js";

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
            <button class="google-btn" id="google-signin">
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.85 2.09-1.81 2.73v2.27h2.92c1.71-1.57 2.69-3.88 2.69-6.64z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.17l-2.92-2.27c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.34C2.44 15.98 5.48 18 9 18z"/>
                <path fill="#FBBC05" d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.34z"/>
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.95l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"/>
              </svg>
              <span>Googleでログイン</span>
            </button>
            <p class="auth-fineprint">ログインすると、記録データはご自身のGoogleアカウントに安全に保存されます。</p>
          </div>
        </div>
      `);
      node.querySelector("#google-signin").addEventListener("click", async (ev) => {
        ev.target.closest("button").disabled = true;
        try {
          await signInWithGoogle();
        } catch (err) {
          alert("ログインに失敗しました: " + (err?.message || err));
          ev.target.closest("button").disabled = false;
        }
      });
      return node;
    },
  };
}
