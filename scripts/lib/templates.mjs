import { readFileSync } from "node:fs";
import { join } from "node:path";
export function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );
}
export function template(root, name, values = {}) {
  return readFileSync(
    join(root, "src/templates", `${name}.html`),
    "utf8",
  ).replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!Object.hasOwn(values, key))
      throw new Error(`Missing template value ${key} in ${name}`);
    return values[key];
  });
}
export function safeHref(href) {
  if (
    typeof href !== "string" ||
    !href ||
    /[\s<>"'\\]/.test(href) ||
    /^(?:\/\/|#?$)/.test(href)
  )
    throw new Error(`Invalid link: ${href}`);
  const scheme = href.match(/^([a-z][a-z\d+.-]*):/i)?.[1];
  if (scheme && !["https", "http", "mailto"].includes(scheme.toLowerCase()))
    throw new Error(`Unsupported link: ${href}`);
  return escapeHtml(href);
}
export function dateLabel(date) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date
  )
    throw new Error(`Invalid post date: ${date}`);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
