(() => {
  "use strict";

  const root = document.documentElement;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const storageKey = "wz.portfolio.intro.v2";
  let seen = false;
  try {
    seen = sessionStorage.getItem(storageKey) === "seen";
  } catch {
    // Navigation still works when session storage is unavailable.
  }

  const firstVisit = !seen && !motion.matches && !location.hash;
  let dialog;
  let finishTimer;
  let previousFocus;
  let initialPending = firstVisit;

  function finish(moveFocus = false) {
    clearTimeout(finishTimer);
    root.removeAttribute("data-booting");
    if (dialog) {
      if (dialog.open) dialog.close();
      dialog.remove();
      dialog = null;
    }
    if (moveFocus) {
      const target =
        previousFocus instanceof HTMLElement && previousFocus !== document.body
          ? previousFocus
          : document.getElementById("main");
      if (target) {
        if (!target.matches("a, button, input, [tabindex]"))
          target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
    }
  }

  function start() {
    if (dialog || motion.matches) {
      if (motion.matches) finish();
      return;
    }
    // Always release the page, including if creating the dialog throws.
    clearTimeout(finishTimer);
    finishTimer = setTimeout(finish, 2200);
    previousFocus = document.activeElement;
    try {
      dialog = document.createElement("dialog");
      dialog.className = "boot-screen";
      dialog.setAttribute("aria-labelledby", "boot-title");
      dialog.innerHTML = `
        <div class="boot-titlebar"><span>~/portfolio</span><span aria-hidden="true">■ ■ ■</span></div>
        <div class="boot-content">
          <div class="boot-voxels" aria-hidden="true"><i></i><i></i><i></i></div>
          <h2 id="boot-title">Opening portfolio</h2>
          <div class="boot-output" aria-hidden="true">
            <p class="boot-command">&gt; open william-zhang<span class="boot-cursor">_</span></p>
            <p class="boot-log first"><span>[01]</span> Work &amp; experience</p>
            <p class="boot-log second"><span>[02]</span> Projects &amp; blog</p>
            <p class="boot-log third"><span>[ok]</span> Ready</p>
          </div>
          <div class="boot-progress" aria-hidden="true">${"<i></i>".repeat(12)}</div>
          <button class="pixel-button secondary boot-skip" type="button" autofocus>Skip animation <kbd>Esc</kbd></button>
        </div>`;
      document.body.append(dialog);
      dialog
        .querySelector(".boot-skip")
        .addEventListener("click", () => finish(true));
      dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        finish(true);
      });
      dialog.showModal();
      root.setAttribute("data-booting", "");
      try {
        sessionStorage.setItem(storageKey, "seen");
      } catch {
        // The short animation may replay next visit; it never blocks navigation.
      }
      clearTimeout(finishTimer);
      finishTimer = setTimeout(finish, 1650);
    } catch {
      finish();
    }
  }

  if (firstVisit) {
    root.setAttribute("data-booting", "");
    finishTimer = setTimeout(() => {
      initialPending = false;
      finish();
    }, 2600);
  }

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      if (initialPending) {
        initialPending = false;
        start();
      }
      document.querySelectorAll("[data-replay-boot]").forEach((button) => {
        button.hidden = false;
        button.addEventListener("click", start);
      });
    },
    { once: true },
  );

  motion.addEventListener("change", () => {
    if (motion.matches) finish(true);
  });
  window.addEventListener("pagehide", () => finish());
})();
