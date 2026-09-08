import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { root } from "./generate.mjs";
import { renderSite } from "./lib/site.mjs";
import { compileStyles } from "./lib/styles.mjs";
import { validateSite } from "./lib/validate.mjs";

// Read-only check for branch/root Pages deployments. Source edits alone do not
// update public HTML, so run this before committing or pushing the site.
const pages = renderSite(root);
const expected = new Map([
  ...pages,
  ["assets/css/site.css", compileStyles(root)],
]);
const stale = [...expected]
  .filter(([name, content]) => {
    const path = join(root, name);
    return !existsSync(path) || readFileSync(path, "utf8") !== content;
  })
  .map(([name]) => name);
if (stale.length) {
  console.error(
    `Public output is missing or out of date:\n${stale.map((name) => `  ${name}`).join("\n")}\nRun npm run build and include the generated files in your commit.`,
  );
  process.exitCode = 1;
} else {
  validateSite(root, pages);
  console.log(
    `Public output matches the sources (${pages.size} pages and the stylesheet).`,
  );
}
