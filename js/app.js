import { onAuthChange, completeRedirectSignIn } from "./auth.js";
import { store, startListening, stopListening, setOnUpdate } from "./store.js";
import { initRouter, replaceAll, rerender } from "./router.js";
import { AuthScreen } from "./views/auth.js";
import { HomeScreen } from "./views/home.js";

const root = document.getElementById("app");
initRouter(root);
replaceAll({ render: () => { const d = document.createElement("div"); d.className = "screen"; return d; } });

setOnUpdate(() => rerender());

await completeRedirectSignIn();

onAuthChange((user) => {
  if (user) {
    startListening(user.uid);
    replaceAll(HomeScreen());
  } else {
    stopListening();
    replaceAll(AuthScreen());
  }
});
