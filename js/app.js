import { onAuthChange, completeRedirectSignIn } from "./auth.js";
import { store, startListening, stopListening, setOnUpdate } from "./store.js";
import { initRouter, replaceAll, rerender } from "./router.js";
import { ensureAccessRequest, subscribeAccessRequest } from "./dataStore.js";
import { AuthScreen, PendingApprovalScreen, DeniedScreen } from "./views/auth.js";
import { HomeScreen } from "./views/home.js";

// 管理者(あなた)のGoogleアカウントのメールアドレス。ここに設定した本人はいつでも無条件で使えます。
// それ以外の人がログインすると、自動的に利用申請が送られ、あなたの承認待ちになります。
const ADMIN_EMAIL = "kuma.rad.bkw.mwam.10969@gmail.com";

const root = document.getElementById("app");
initRouter(root);
replaceAll({ render: () => { const d = document.createElement("div"); d.className = "screen"; return d; } });

setOnUpdate(() => rerender());

let unsubAccessRequest = null;

function stopWatchingAccessRequest() {
  if (unsubAccessRequest) {
    unsubAccessRequest();
    unsubAccessRequest = null;
  }
}

await completeRedirectSignIn();

onAuthChange(async (user) => {
  stopWatchingAccessRequest();

  if (!user) {
    stopListening();
    replaceAll(AuthScreen());
    return;
  }

  if (user.email === ADMIN_EMAIL) {
    startListening(user.uid);
    store.isAdmin = true;
    replaceAll(HomeScreen());
    return;
  }

  replaceAll(PendingApprovalScreen());
  await ensureAccessRequest(user.uid, user.email, user.displayName);
  unsubAccessRequest = subscribeAccessRequest(user.uid, (status) => {
    if (status === "approved") {
      startListening(user.uid);
      replaceAll(HomeScreen());
    } else if (status === "denied") {
      stopListening();
      replaceAll(DeniedScreen());
    } else {
      stopListening();
      replaceAll(PendingApprovalScreen());
    }
  });
});
