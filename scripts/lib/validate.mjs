import { parse } from "parse5";
import { existsSync } from "node:fs";
import { posix, resolve, sep } from "node:path";
export function walk(node, visit) {
  visit(node);
  for (const child of node.childNodes || []) walk(child, visit);
}
export function validateSite(root, pages) {
  const documents = new Map();
  for (const [name, html] of pages) {
    const errors = [];
    const tree = parse(html, {
      onParseError: (error) => errors.push(error.code),
    });
    if (errors.length)
      throw new Error(`${name}: invalid HTML (${errors.join(", ")})`);
    const ids = new Set(),
      links = [];
    let h1 = 0;
    walk(tree, (node) => {
      const attrs = Object.fromEntries(
        (node.attrs || []).map((a) => [a.name, a.value]),
      );
      if (node.tagName === "h1") h1++;
      if (attrs.id) {
        if (ids.has(attrs.id))
          throw new Error(`${name}: duplicate id ${attrs.id}`);
        ids.add(attrs.id);
      }
      if (node.tagName === "img" && !Object.hasOwn(attrs, "alt"))
        throw new Error(`${name}: image requires alt text`);
      for (const key of Object.keys(attrs))
        if (/^on/i.test(key))
          throw new Error(
            `${name}: inline event handler ${key} is not allowed`,
          );
      for (const key of ["href", "src"]) if (attrs[key]) links.push(attrs[key]);
    });
    if (h1 !== 1) throw new Error(`${name}: expected one h1, found ${h1}`);
    documents.set(name, { ids, links });
  }
  for (const [name, { links }] of documents) {
    for (const link of links) {
      if (/^(https?:|mailto:|data:)/i.test(link)) continue;
      if (/^[a-z][a-z\d+.-]*:/i.test(link) || link.startsWith("//"))
        throw new Error(`${name}: unsupported URL ${link}`);
      const url = new URL(link, `https://portfolio.invalid/${name}`);
      let target = decodeURIComponent(url.pathname).slice(1);
      if (target.endsWith("/") || !target) target += "index.html";
      const local = resolve(root, target);
      if (!local.startsWith(resolve(root) + sep))
        throw new Error(`${name}: URL escapes site root ${link}`);
      if (!pages.has(target) && !existsSync(local))
        throw new Error(`${name}: missing local file ${link}`);
      if (
        url.hash &&
        documents.has(target) &&
        !documents.get(target).ids.has(decodeURIComponent(url.hash.slice(1)))
      )
        throw new Error(`${name}: broken anchor ${link}`);
    }
  }
  return {
    pages: pages.size,
    links: [...documents.values()].reduce((sum, p) => sum + p.links.length, 0),
  };
}
