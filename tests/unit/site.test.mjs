import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  cpSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderSite } from "../../scripts/lib/site.mjs";
import { validateSite } from "../../scripts/lib/validate.mjs";
import {
  escapeHtml,
  safeHref,
  dateLabel,
} from "../../scripts/lib/templates.mjs";
import { commandDestination } from "../../assets/js/components/terminal.js";
import { resolveAlias } from "../../assets/js/components/navigation.js";
const root = fileURLToPath(new URL("../../", import.meta.url));
function fixture(t) {
  const folder = mkdtempSync(join(tmpdir(), "wz-content-"));
  for (const path of ["content", "src"])
    cpSync(join(root, path), join(folder, path), { recursive: true });
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  return folder;
}
const json = (root, name) =>
  JSON.parse(readFileSync(join(root, "content", `${name}.json`), "utf8"));
const save = (root, name, value) =>
  writeFileSync(join(root, "content", `${name}.json`), JSON.stringify(value));

test("the existing site renders with its public URLs and links intact", () => {
  const pages = renderSite(root);
  assert.deepEqual(
    [...pages.keys()],
    ["index.html", "blog/index.html", "blog/keeping-a-call-alive/index.html"],
  );
  assert.equal(validateSite(root, pages).pages, 3);
  const home = pages.get("index.html");
  for (const fact of [
    "Undergraduate AI Researcher",
    "83% test accuracy",
    "over 1,000 users",
    "Apr — Aug 2025",
    "3.93 / 4.00",
    "May 2028",
  ])
    assert(home.includes(fact), fact);
});
test("adding one post updates the article, index, and homepage without editing templates", (t) => {
  const folder = fixture(t),
    posts = json(folder, "posts");
  posts.forEach((post) => (post.featured = false));
  posts.push({
    slug: "new-article",
    title: "New article <title>",
    description: "A direct description.",
    deck: "A short introduction.",
    date: "2026-09-08",
    readMinutes: 2,
    context: "Project",
    topics: ["JavaScript"],
    featured: true,
  });
  save(folder, "posts", posts);
  writeFileSync(
    join(folder, "content/posts/new-article.html"),
    '<p>Article text.</p><h2 id="details">Details</h2><p>More details.</p>',
  );
  const pages = renderSite(folder);
  assert(pages.has("blog/new-article/index.html"));
  assert(pages.get("index.html").includes("blog/new-article/"));
  assert(pages.get("blog/index.html").includes("New article &lt;title&gt;"));
  assert(pages.get("blog/new-article/index.html").includes('href="#details"'));
});
test("adding experience and projects preserves their data and escapes plain text", (t) => {
  const folder = fixture(t),
    entries = json(folder, "experience"),
    projects = json(folder, "projects");
  entries.unshift({
    organization: "R&D <Lab>",
    role: "Researcher",
    dates: "2027",
    category: "Research",
    paragraphsHtml: ["Built <strong>a tool</strong>."],
  });
  save(folder, "experience", entries);
  projects.push({
    title: "New project",
    category: "Software",
    dates: "2027",
    description: "Tools & testing",
    stack: ["C++"],
    link: { href: "https://example.com/project", label: "View source" },
  });
  save(folder, "projects", projects);
  const home = renderSite(folder).get("index.html");
  assert(home.includes("R&amp;D &lt;Lab&gt;"));
  assert(home.includes("<strong>a tool</strong>"));
  assert(home.includes("Tools &amp; testing"));
});
test("invalid and duplicate article slugs fail before output can be generated", (t) => {
  const folder = fixture(t),
    posts = json(folder, "posts");
  posts.push({ ...posts[0], featured: false });
  save(folder, "posts", posts);
  assert.throws(() => renderSite(folder), /duplicate post slug/);
  posts.pop();
  posts[0].slug = "../escape";
  save(folder, "posts", posts);
  assert.throws(() => renderSite(folder), /post slug/);
});
test("two featured posts are rejected instead of silently choosing one", (t) => {
  const folder = fixture(t),
    posts = json(folder, "posts");
  posts.push({ ...posts[0], slug: "second-post" });
  save(folder, "posts", posts);
  assert.throws(() => renderSite(folder), /featured/);
});
test("date formatting is deterministic and impossible dates fail", () => {
  assert.equal(dateLabel("2026-09-07"), "September 7, 2026");
  assert.throws(() => dateLabel("2026-02-30"));
  assert.throws(() => dateLabel("not-a-date"));
});
test("plain strings are escaped and unsafe link schemes are rejected", () => {
  assert.equal(escapeHtml('<script>"&'), "&lt;script&gt;&quot;&amp;");
  for (const href of [
    "javascript:alert(1)",
    "data:text/html,test",
    "//example.com",
    'https://example.com/"bad',
  ])
    assert.throws(() => safeHref(href));
  assert.equal(safeHref("blog/a/"), "blog/a/");
  assert.equal(safeHref("mailto:a@example.com"), "mailto:a@example.com");
});
test("validation detects missing files, duplicate IDs, broken anchors, and event handlers", () => {
  const wrap = (body) =>
    `<!doctype html><html lang="en"><head><title>Test</title></head><body><h1>Test</h1>${body}</body></html>`;
  for (const body of [
    '<a href="missing.html">Link</a>',
    '<p id="same"></p><p id="same"></p>',
    '<a href="#missing">Link</a>',
    '<button onclick="alert(1)">Click</button>',
    '<a href="javascript:alert(1)">Link</a>',
  ])
    assert.throws(() =>
      validateSite(root, new Map([["index.html", wrap(body)]])),
    );
});
test("legacy commands resolve, but inherited properties and HTML are ordinary unknown input", () => {
  assert.equal(commandDestination("projects"), "#work");
  assert.equal(commandDestination("education"), "#about");
  assert.equal(resolveAlias("timeline"), "experience");
  for (const input of [
    "constructor",
    "__proto__",
    "toString",
    "hasOwnProperty",
    "<img src=x>",
  ])
    assert.equal(commandDestination(input), null);
});
