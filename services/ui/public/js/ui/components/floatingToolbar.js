export function enableFloatingToolbar({ toolbarId = "floating-toolbar", storageKey = "floatingToolbar" } = {}) {
  const toolbar = document.getElementById(toolbarId);
  if (!toolbar) return { reset: () => {} };

  const handle = toolbar.querySelector(".floating-toolbar__handle") || toolbar;

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
      const rect = toolbar.getBoundingClientRect();
      const w = rect.width || toolbar.offsetWidth || 0;
      const h = rect.height || toolbar.offsetHeight || 0;

      const maxLeft = Math.max(0, window.innerWidth - w);
      const maxTop = Math.max(0, window.innerHeight - h);

      const left = typeof pos.left === "number" ? clamp(pos.left, 0, maxLeft) : undefined;
      const top = typeof pos.top === "number" ? clamp(pos.top, 0, maxTop) : undefined;
      return { ...pos, left, top };
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

  applyPosition(loadPosition());

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  const onPointerDown = (e) => {
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

    if (e && typeof e.preventDefault === "function") e.preventDefault();
  };

  const onPointerUp = () => {
    if (!dragging) return;
    dragging = false;
    toolbar.classList.remove("dragging");

    const rect = toolbar.getBoundingClientRect();
    savePosition({ left: rect.left, top: rect.top });
  };

  handle.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove, { passive: false });
  window.addEventListener("pointerup", onPointerUp);

  const content = toolbar.querySelector(".floating-toolbar__content");
  let observer;
  if (content && typeof MutationObserver !== "undefined") {
    const hasVisibleActions = () => {
      const items = content.querySelectorAll("button, a, #filter-bar");
      for (const el of items) {
        if (el && !el.classList.contains("hidden")) return true;
      }
      return false;
    };

    const ensureExpandedIfNeeded = () => {
      if (!toolbar.classList.contains("collapsed")) return;
      if (!hasVisibleActions()) return;

      const toggle = toolbar.querySelector("#floating-toolbar-toggle");
      if (toggle && typeof toggle.click === "function") toggle.click();
      else toolbar.classList.remove("collapsed");
    };

    observer = new MutationObserver(ensureExpandedIfNeeded);
    observer.observe(content, { attributes: true, subtree: true, attributeFilter: ["class"], childList: true });
    ensureExpandedIfNeeded();
  }

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
