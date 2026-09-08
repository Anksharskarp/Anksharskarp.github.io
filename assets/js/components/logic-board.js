export function initLogicBoard() {
  const root = document.querySelector("[data-logic-board]");
  if (!root) return;
  let started = false;
  async function load() {
    if (started) return;
    started = true;
    try {
      const { mountViewer } = await import("../model/viewer.js");
      mountViewer(root);
    } catch {
      root.dataset.boardState = "fallback";
      root.querySelector("[data-board-description]").textContent =
        "Diagram shown. The interactive view is unavailable.";
    }
  }
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          load();
        }
      },
      { rootMargin: "100px" },
    );
    observer.observe(root);
  } else load();
}
