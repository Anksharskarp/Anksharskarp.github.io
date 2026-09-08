import { watch } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { generate, root } from "./generate.mjs";
generate();
const server = spawn(
  "python3",
  ["-m", "http.server", "4173", "--bind", "127.0.0.1"],
  { cwd: root, stdio: "inherit" },
);
let timer;
const watchers = ["content", "src/templates", "assets/css/modules"].map(
  (directory) =>
    watch(join(root, directory), { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          generate();
          console.log("Updated. Refresh the browser to see changes.");
        } catch (error) {
          console.error(error.message);
        }
      }, 100);
    }),
);
function close() {
  clearTimeout(timer);
  watchers.forEach((watcher) => watcher.close());
  server.kill();
}
server.on("error", (error) => {
  console.error(error.message);
  close();
  process.exitCode = 1;
});
server.on("exit", (code) => {
  close();
  process.exitCode = code ?? 0;
});
process.on("SIGINT", close);
process.on("SIGTERM", close);
