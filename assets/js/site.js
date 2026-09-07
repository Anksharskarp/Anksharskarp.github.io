(() => {
  "use strict";

  // Content and links work without JavaScript; this only adds navigation feedback.
  const sectionLinks = [...document.querySelectorAll('.main-nav a[href^="#"]')];
  const sections = sectionLinks
    .map((link) => document.querySelector(link.hash))
    .filter(Boolean);
  if (sections.length && "IntersectionObserver" in window) {
    const visible = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) =>
          entry.isIntersecting
            ? visible.add(entry.target.id)
            : visible.delete(entry.target.id),
        );
        const current = sections.find((section) => visible.has(section.id));
        sectionLinks.forEach((link) => {
          if (current && link.hash === `#${current.id}`)
            link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      },
      { rootMargin: "-120px 0px -50% 0px", threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
  }

  // Preserve links from the previous terminal portfolio.
  const aliases = {
    overview: "about",
    education: "about",
    skills: "about",
    courses: "about",
    awards: "about",
    timeline: "experience",
    activities: "experience",
    projects: "work",
  };
  function resolveLegacyAnchor() {
    const legacyTarget = aliases[location.hash.slice(1)];
    if (legacyTarget && document.getElementById(legacyTarget)) {
      history.replaceState(null, "", `#${legacyTarget}`);
      document.getElementById(legacyTarget).scrollIntoView();
    }
  }
  resolveLegacyAnchor();
  window.addEventListener("hashchange", resolveLegacyAnchor);

  const form = document.getElementById("command-form");
  if (!form) return;
  const input = document.getElementById("command-input");
  const feedback = document.getElementById("command-feedback");
  const destinations = {
    work: "#work",
    experience: "#experience",
    about: "#about",
    blog: "blog/",
    writing: "#writing",
    contact: "#contact",
    resume: "assets/documents/william-zhang-resume-august-2026.pdf",
  };
  const historyEntries = [];
  let historyIndex = 0;
  let draft = "";
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const raw = input.value.trim();
    if (!raw) return;
    historyEntries.push(raw);
    historyIndex = historyEntries.length;
    draft = "";
    const command = raw.toLowerCase().replace(/^\//, "");
    input.value = "";
    if (command === "help") {
      feedback.textContent =
        "Commands: /work, /experience, /about, /blog, /writing, /contact, /resume, /clear. ↑ and ↓ browse command history.";
      return;
    }
    if (command === "clear") {
      feedback.textContent = "Ready.";
      return;
    }
    const destination = destinations[aliases[command] || command];
    if (!destination) {
      feedback.textContent = `Unknown command: ${raw}. Try /help.`;
      return;
    }
    feedback.textContent = `Opening ${command}…`;
    if (destination.startsWith("#")) {
      location.hash = destination;
      const target = document.querySelector(destination);
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      target.scrollIntoView();
    } else location.assign(destination);
  });
  input.addEventListener("keydown", (event) => {
    if (!["ArrowUp", "ArrowDown"].includes(event.key) || !historyEntries.length)
      return;
    event.preventDefault();
    if (historyIndex === historyEntries.length) draft = input.value;
    historyIndex = Math.max(
      0,
      Math.min(
        historyEntries.length,
        historyIndex + (event.key === "ArrowUp" ? -1 : 1),
      ),
    );
    input.value = historyEntries[historyIndex] ?? draft;
  });
})();
