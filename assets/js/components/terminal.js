import { resolveAlias } from "./navigation.js";
export const destinations = Object.freeze({
  work: "#work",
  experience: "#experience",
  about: "#about",
  blog: "blog/",
  tools: "tools/",
  writing: "#writing",
  contact: "#contact",
  resume: "assets/documents/william-zhang-resume-august-2026.pdf",
});
export function commandDestination(command) {
  const key = resolveAlias(command);
  return Object.hasOwn(destinations, key) ? destinations[key] : null;
}
export function initTerminal() {
  const form = document.getElementById("command-form");
  if (!form) return;
  const input = document.getElementById("command-input"),
    feedback = document.getElementById("command-feedback");
  if (!input || !feedback) return;
  const entries = [];
  let index = 0,
    draft = "";
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const raw = input.value.trim();
    if (!raw) return;
    entries.push(raw);
    if (entries.length > 100) entries.shift();
    index = entries.length;
    draft = "";
    input.value = "";
    const command = raw.toLowerCase().replace(/^\//, "");
    if (command === "help") {
      feedback.textContent =
        "Commands: /work, /experience, /about, /blog, /tools, /writing, /contact, /resume, /clear. ↑ and ↓ browse command history.";
      return;
    }
    if (command === "clear") {
      feedback.textContent = "Ready.";
      return;
    }
    const destination = commandDestination(command);
    if (!destination) {
      feedback.textContent = `Unknown command: ${raw}. Try /help.`;
      return;
    }
    if (destination.startsWith("#")) {
      const target = document.getElementById(destination.slice(1));
      if (!target) {
        feedback.textContent = "This section is unavailable.";
        return;
      }
      location.hash = destination;
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      target.scrollIntoView();
    } else location.assign(destination);
    feedback.textContent = `Opening ${command}…`;
  });
  input.addEventListener("keydown", (event) => {
    if (!["ArrowUp", "ArrowDown"].includes(event.key) || !entries.length)
      return;
    event.preventDefault();
    if (index === entries.length) draft = input.value;
    index = Math.max(
      0,
      Math.min(entries.length, index + (event.key === "ArrowUp" ? -1 : 1)),
    );
    input.value = entries[index] ?? draft;
  });
}
