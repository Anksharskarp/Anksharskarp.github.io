export function initToolWindows(root) {
  if (!root?.querySelectorAll) {
    throw new Error("Tool windows require a workspace element.");
  }

  const dialogs = new Map(
    [...root.querySelectorAll("dialog.ode-window[id]")].map((dialog) => [
      dialog.id,
      dialog,
    ]),
  );
  const openers = new Map();
  let current = null;

  function getDialog(id) {
    const dialog = dialogs.get(id);
    if (!dialog?.isConnected) {
      throw new Error(`The tool window "${id}" is unavailable.`);
    }
    return dialog;
  }

  function canFocus(element) {
    return (
      element?.isConnected &&
      typeof element.focus === "function" &&
      !element.matches(":disabled, [aria-disabled='true']")
    );
  }

  function finishClose(dialog) {
    if (current === dialog) current = null;
    if (!openers.has(dialog)) return;
    const opener = openers.get(dialog);
    openers.delete(dialog);
    for (const target of [opener, root.querySelector("[data-window-fallback]")]) {
      if (!canFocus(target)) continue;
      target.focus({ preventScroll: true });
      if (root.ownerDocument.activeElement === target) break;
    }
  }

  function closeDialog(dialog) {
    if (dialog.open) dialog.close();
    finishClose(dialog);
  }

  function closeAll() {
    for (const dialog of dialogs.values()) {
      if (dialog.open || openers.has(dialog)) closeDialog(dialog);
    }
  }

  function openWindow(id, opener = root.ownerDocument.activeElement) {
    const dialog = getDialog(id);
    if (typeof dialog.showModal !== "function") {
      throw new Error("This browser does not support tool windows.");
    }
    if (current === dialog && dialog.open) return dialog;
    closeAll();
    try {
      dialog.showModal();
    } catch {
      throw new Error(`The tool window "${id}" could not be opened.`);
    }
    openers.set(dialog, opener);
    current = dialog;
    dialog.dispatchEvent(
      new CustomEvent("toolwindowopen", {
        bubbles: true,
        detail: { id },
      }),
    );
    return dialog;
  }

  function reportError(error) {
    root.dispatchEvent(
      new CustomEvent("toolwindowerror", {
        bubbles: true,
        detail: { message: error.message || "The tool window is unavailable." },
      }),
    );
  }

  root.addEventListener("click", (event) => {
    const trigger = event.target.closest?.(
      "[data-open-window], [data-close-window]",
    );
    if (!trigger || !root.contains(trigger)) return;
    event.preventDefault();
    try {
      if (trigger.hasAttribute("data-open-window")) {
        openWindow(trigger.dataset.openWindow, trigger);
      } else {
        const dialog = trigger.closest("dialog.ode-window");
        if (dialog && dialogs.get(dialog.id) === dialog) closeDialog(dialog);
      }
    } catch (error) {
      reportError(error);
    }
  });

  for (const dialog of dialogs.values()) {
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeDialog(dialog);
    });
    dialog.addEventListener("close", () => {
      // Native close events are queued; an earlier event may follow a reopen.
      if (!dialog.open) finishClose(dialog);
    });
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      ) {
        closeDialog(dialog);
      }
    });
  }

  return {
    open: (id) => openWindow(id),
    close: (id) => closeDialog(getDialog(id)),
    closeAll,
    active: () => (current?.open ? current : null),
  };
}
