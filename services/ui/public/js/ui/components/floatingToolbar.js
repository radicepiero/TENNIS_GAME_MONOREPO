export function enableFloatingToolbar({ toolbarId = "floating-toolbar", storageKey = "floatingToolbar" } = {}) {
  const toolbar = document.getElementById(toolbarId);
  if (!toolbar) return { reset: () => {} };

  const handle = toolbar.querySelector(".floating-toolbar__handle") || toolbar;
  const isSmallScreen = () => window.matchMedia && window.matchMedia("(max-width: 640px)").matches;

  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

  function applyPosition(pos) {
    if (!pos) return;
    if (typeof pos.left === "number") {
      toolbar.style.left = `${pos.left}px`;
      toolbar.style.right = "auto";
    }
    if (typeof pos.top === "number") {
      toolbar.style.top = `${pos.top}px`;
      toolbar.style.bottom = "auto";
    }
  }

  function loadPosition() {
    try {
      const raw = window.localStorage ? window.localStorage.getItem(storageKey) : null;
      if (!raw) return null;
      const pos = JSON.parse(raw);
      if (!pos || typeof pos !== "object") return null;
      return pos;
    } catch (_) {
      return null;
    }
  }

  function savePosition(pos) {
    try {
      if (!window.localStorage) return;
      window.localStorage.setItem(storageKey, JSON.stringify(pos));
    } catch (_) {}
  }

  if (!isSmallScreen()) {
    applyPosition(loadPosition());
  } else {
    toolbar.style.left = "auto";
    toolbar.style.top = "auto";
    toolbar.style.right = "10px";
    toolbar.style.bottom = "10px";
  }

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  const onPointerDown = (e) => {
    if (isSmallScreen()) return;
    if (!e || (e.button !== undefined && e.button !== 0)) return;

    const rect = toolbar.getBoundingClientRect();
    dragging = true;
    toolbar.classList.add("dragging");

    startX = e.clientX;
    startY = e.clientY;
    startLeft = rect.left;
    startTop = rect.top;

    toolbar.style.right = "auto";
    toolbar.style.bottom = "auto";
    toolbar.style.left = `${rect.left}px`;
    toolbar.style.top = `${rect.top}px`;

    try {
      handle.setPointerCapture && handle.setPointerCapture(e.pointerId);
    } catch (_) {}

    e.preventDefault();
  };

  const onPointerMove = (e) => {
    if (!dragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const w = toolbar.offsetWidth || 0;
    const h = toolbar.offsetHeight || 0;

    const maxLeft = Math.max(0, window.innerWidth - w);
    const maxTop = Math.max(0, window.innerHeight - h);

    const left = clamp(startLeft + dx, 0, maxLeft);
    const top = clamp(startTop + dy, 0, maxTop);

    toolbar.style.left = `${left}px`;
    toolbar.style.top = `${top}px`;
  };

  const onPointerUp = () => {
    if (!dragging) return;
    dragging = false;
    toolbar.classList.remove("dragging");

    const rect = toolbar.getBoundingClientRect();
    savePosition({ left: rect.left, top: rect.top });
  };

  handle.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);

  const reset = () => {
    toolbar.style.left = "";
    toolbar.style.top = "";
    toolbar.style.right = "16px";
    toolbar.style.bottom = "auto";
    try {
      window.localStorage && window.localStorage.removeItem(storageKey);
    } catch (_) {}
  };

  return { reset };
}
