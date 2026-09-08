import { cpSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderSite } from "./lib/site.mjs";
import { validateSite } from "./lib/validate.mjs";
import { compileStyles } from "./lib/styles.mjs";
export const root = fileURLToPath(new URL("../", import.meta.url));
export function generate() {
  const pages = renderSite(root);
  const stylesheet = compileStyles(root);
  const vendor = join(root, "assets/vendor/three");
  mkdirSync(vendor, { recursive: true });
  for (const file of ["three.module.min.js", "three.core.min.js"])
    cpSync(join(root, "node_modules/three/build", file), join(vendor, file));
  cpSync(join(root, "node_modules/three/LICENSE"), join(vendor, "LICENSE"));
  const version = JSON.parse(
    readFileSync(join(root, "node_modules/three/package.json"), "utf8"),
  ).version;
  writeFileSync(join(vendor, "VERSION"), `${version}\n`);
  const report = validateSite(root, pages);
  writeFileSync(join(root, "assets/css/site.css"), stylesheet);
  for (const [name, html] of pages) {
    const output = join(root, name);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, html);
  }
  console.log(
    `Generated ${report.pages} pages; checked ${report.links} links.`,
  );
  return pages;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  generate();
