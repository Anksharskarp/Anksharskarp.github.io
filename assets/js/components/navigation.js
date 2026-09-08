export const aliases = Object.freeze({
  overview: "about",
  education: "about",
  skills: "about",
  courses: "about",
  awards: "about",
  timeline: "experience",
  activities: "experience",
  projects: "work",
});
export function resolveAlias(value) {
  return Object.hasOwn(aliases, value) ? aliases[value] : value;
}
export function initNavigation() {
  function legacyAnchor() {
    const key = location.hash.slice(1);
    const resolved = resolveAlias(key);
    if (key === resolved) return;
    const target = document.getElementById(resolved);
    if (target) {
      history.replaceState(null, "", `#${resolved}`);
      target.scrollIntoView();
    }
  }
  legacyAnchor();
  window.addEventListener("hashchange", legacyAnchor);
  const links = [...document.querySelectorAll('.main-nav a[href^="#"]')];
  const sections = links
    .map((link) => document.getElementById(link.hash.slice(1)))
    .filter(Boolean);
  if (!sections.length || !("IntersectionObserver" in window)) return;
  const visible = new Set();
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) =>
        entry.isIntersecting
          ? visible.add(entry.target.id)
          : visible.delete(entry.target.id),
      );
      const current = sections.find((section) => visible.has(section.id));
      links.forEach((link) => {
        if (current && link.hash === `#${current.id}`)
          link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    },
    { rootMargin: "-120px 0px -50% 0px", threshold: 0 },
  );
  sections.forEach((section) => observer.observe(section));
}
