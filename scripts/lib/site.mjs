import { readFileSync } from "node:fs";
import { join } from "node:path";
import { escapeHtml as e, dateLabel, template } from "./templates.mjs";
import { experienceRow, projectCard, postCard, page } from "./components.mjs";
export function renderSite(root) {
  const read = (name) =>
    JSON.parse(readFileSync(join(root, "content", `${name}.json`), "utf8"));
  const site = read("site"),
    projects = read("projects"),
    experience = read("experience");
  const posts = read("posts").sort((a, b) => b.date.localeCompare(a.date));
  if (posts.filter((post) => post.featured).length > 1)
    throw new Error("Only one post can be featured");
  const slugs = new Set();
  for (const post of posts) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug) || slugs.has(post.slug))
      throw new Error(`Invalid or duplicate post slug: ${post.slug}`);
    if (
      !post.title ||
      !post.description ||
      !Array.isArray(post.topics) ||
      !Number.isInteger(post.readMinutes) ||
      post.readMinutes < 1
    )
      throw new Error(`Incomplete post: ${post.slug}`);
    dateLabel(post.date);
    slugs.add(post.slug);
  }
  if (!posts.length) throw new Error("At least one post is required");
  const featuredIndex = Math.max(
    0,
    posts.findIndex((p) => p.featured),
  );
  const parts = Object.fromEntries(
    ["hero", "about", "contact", "terminal"].map((name) => [
      name,
      template(
        root,
        `partials/${name}`,
        Object.fromEntries(
          Object.entries(site).map(([key, value]) => [key, e(value)]),
        ),
      ),
    ]),
  );
  const home = template(root, "home", {
    ...parts,
    featuredProject: template(root, "partials/featured-project"),
    projects: projects.map(projectCard).join("\n"),
    experience: experience.map(experienceRow).join("\n"),
    featuredPost: postCard(posts[featuredIndex], featuredIndex, "blog/", 3),
  });
  const output = new Map([
    [
      "index.html",
      page(root, site, {
        title: site.title,
        description: site.description,
        body: home,
      }),
    ],
  ]);
  output.set(
    "blog/index.html",
    page(root, site, {
      title: `Blog — ${site.name}`,
      description: `Technical writing by ${site.name} on mobile engineering, native video, and software development.`,
      prefix: "../",
      blog: true,
      body: `<header class="blog-header"><a class="back-link" href="../">← Back to portfolio</a><h1>Blog<span class="name-period">.</span></h1><p>Technical notes from my projects and research.</p></header><section class="blog-list" aria-label="Articles">${posts.map((p, i) => postCard(p, i)).join("\n")}</section>`,
    }),
  );
  for (const [index, post] of posts.entries()) {
    const body = readFileSync(
      join(root, "content/posts", `${post.slug}.html`),
      "utf8",
    );
    const toc =
      post.toc ||
      [...body.matchAll(/<h2\s+id="([\w-]+)"[^>]*>(.*?)<\/h2>/gs)].map((m) => ({
        id: m[1],
        label: m[2]
          .replace(/<[^>]*>/g, "")
          .replace(/\s+/g, " ")
          .trim(),
      }));
    const article = `<header class="article-header"><a class="back-link" href="../">← All articles</a><p class="eyebrow">${String(index + 1).padStart(3, "0")} / ${e(post.context)}</p><h1>${e(post.title)}</h1><p class="article-deck">${e(post.deck)}</p><div class="article-meta"><span>${e(site.name)}</span><time datetime="${e(post.date)}">${dateLabel(post.date)}</time><span>${e(post.readMinutes)} min read</span></div></header><div class="article-layout"><aside class="article-toc"><nav aria-label="On this page"><h2>In this article</h2><ol>${toc.map((item) => `<li><a href="#${e(item.id)}">${e(item.label)}</a></li>`).join("")}</ol></nav></aside><article class="article-body" aria-label="Article content">${body}</article></div>`;
    output.set(
      `blog/${post.slug}/index.html`,
      page(root, site, {
        title: post.pageTitle || `${post.title} — ${site.name}`,
        description: post.description,
        prefix: "../../",
        blog: true,
        article: true,
        body: article,
      }),
    );
  }
  output.set("tools/index.html", page(root, site, {
    title: `Differential equations — Tools — ${site.name}`,
    description: "Direction fields, phase planes, solution curves, and equilibrium analysis for ordinary differential equations.",
    prefix: "../",
    tools: true,
    body: template(root, "tools"),
  }));
  return output;
}
