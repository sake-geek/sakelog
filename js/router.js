// シンプルな画面スタック方式のルーター。push/pop/replaceでスタックを操作し、
// 常に一番上の画面をrootに描画する。ブラウザの戻る操作ともhistory APIで連動する。

let root = null;
const stack = [];
let suppressPop = false;

export function initRouter(rootEl) {
  root = rootEl;
  window.addEventListener("popstate", () => {
    if (suppressPop) {
      suppressPop = false;
      return;
    }
    if (stack.length > 1) {
      stack.pop();
      render();
    }
  });
}

export function push(screen) {
  stack.push(screen);
  history.pushState({ depth: stack.length }, "");
  render();
}

export function pop() {
  if (stack.length <= 1) return;
  stack.pop();
  suppressPop = true;
  history.back();
  render();
}

export function replaceAll(screen) {
  stack.length = 0;
  stack.push(screen);
  history.replaceState({ depth: 1 }, "");
  render();
}

export function rerender() {
  render();
}

export function currentScreen() {
  return stack[stack.length - 1];
}

function render() {
  if (!root) return;
  root.innerHTML = "";
  const screen = stack[stack.length - 1];
  if (!screen) return;
  const node = screen.render();
  root.appendChild(node);
}
