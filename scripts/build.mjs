import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");

const include = [
  "index.html",
  "blog",
  "assets",
  "images",
  "LICENSE",
  "README.md",
  ".nojekyll",
];

if (existsSync(dist)) {
  rmSync(dist, { recursive: true, force: true });
}
mkdirSync(dist, { recursive: true });

for (const name of include) {
  const source = join(root, name);
  if (!existsSync(source)) {
    continue;
  }
  cpSync(source, join(dist, name), { recursive: true });
}

console.log("Build complete -> dist/");
