import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { generate, root } from "./generate.mjs";
generate();
const dist = join(root, "dist");
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
for (const name of [
  "index.html",
  "blog",
  "assets",
  "images",
  "LICENSE",
  ".nojekyll",
]) {
  const source = join(root, name);
  if (existsSync(source)) cpSync(source, join(dist, name), { recursive: true });
}
console.log("Build complete → dist/");
