import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const paths = ["/", "/blog/", "/blog/keeping-a-call-alive/"];
const skipBoot = (page) =>
  page.addInitScript(() =>
    sessionStorage.setItem("wz.portfolio.intro.v2", "seen"),
  );

test("all pages remain readable at phone, tablet, and desktop widths", async ({
  page,
}) => {
  await skipBoot(page);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [320, 375, 390, 560, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of paths) {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
  expect(errors).toEqual([]);
});
test("mobile anchors and legacy anchors are visible below the header", async ({
  page,
}) => {
  await skipBoot(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("link", { name: "Experience", exact: true }).click();
  await page.waitForTimeout(600);
  const section = await page.locator("#experience").boundingBox(),
    header = await page.locator(".site-header").boundingBox();
  expect(section.y).toBeGreaterThanOrEqual(header.height);
  await page.goto("/#education");
  await expect(page).toHaveURL(/#about$/);
});
test("terminal navigation, history, and invalid input remain safe", async ({
  page,
}) => {
  await skipBoot(page);
  await page.goto("/");
  await page.locator("#terminal summary").click();
  const input = page.locator("#command-input");
  for (const command of [
    "/help",
    "/constructor",
    "/__proto__",
    "<img src=x onerror=alert(1)>",
  ]) {
    await input.fill(command);
    await page.locator("#command-form button").click();
  }
  await expect(page.locator("#command-feedback img")).toHaveCount(0);
  await expect(page.locator("#command-feedback")).toContainText(
    "Unknown command",
  );
  await input.press("ArrowUp");
  await expect(input).toHaveValue("<img src=x onerror=alert(1)>");
  await input.fill("/projects");
  await page.locator("#command-form button").click();
  await expect(page).toHaveURL(/#work$/);
});
test("3D board rotates, resets, labels components, and falls back on context loss", async ({
  page,
}) => {
  await skipBoot(page);
  await page.goto("/");
  const board = page.locator("[data-logic-board]");
  await expect(board).toHaveAttribute("data-board-state", "ready");
  const canvas = board.locator("canvas");
  const original = await canvas.screenshot();
  await page.getByRole("button", { name: "Rotate left", exact: true }).click();
  await page.waitForTimeout(100);
  const rotated = await canvas.screenshot();
  expect(original.equals(rotated)).toBe(false);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.waitForTimeout(100);
  expect(original.equals(await canvas.screenshot())).toBe(true);
  await page.getByRole("button", { name: "DIMM slots", exact: true }).click();
  await expect(board).toHaveAttribute("data-selected-part", "memory");
  await expect(board.locator("[data-board-description]")).toContainText(
    "system RAM",
  );
  await canvas.focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(100);
  expect(original.equals(await canvas.screenshot())).toBe(false);
  await canvas.evaluate((element) =>
    element.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
  );
  await expect(board).toHaveAttribute("data-board-state", "fallback");
  await expect(board.locator(".board-fallback")).toBeVisible();
  await expect(board.locator(".board-controls")).toBeHidden();
});
test("unavailable WebGL and failed model downloads preserve the rest of the site", async ({
  page,
}) => {
  await skipBoot(page);
  await page.route("**/assets/js/components/logic-board.js", (route) =>
    route.abort(),
  );
  await page.goto("/");
  await expect(page.locator(".board-fallback")).toBeVisible();
  await page.locator("#terminal summary").click();
  await page.locator("#command-input").fill("/about");
  await page.locator("#command-form button").click();
  await expect(page).toHaveURL(/#about$/);
  await page.unroute("**/assets/js/components/logic-board.js");
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === "webgl2" ? null : original.call(this, type, ...args);
    };
  });
  await page.goto("/");
  await expect(page.locator("[data-board-description]")).toContainText(
    "unavailable",
  );
  await expect(page.locator(".board-fallback")).toBeVisible();
});
test("the loading screen is skippable and only appears once per tab", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("dialog[open]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog")).toHaveCount(0);
  await page.goto("/blog/");
  await expect(page.locator("dialog")).toHaveCount(0);
  const replay = page.getByRole("button", { name: "Replay loading screen" });
  await replay.click();
  await expect(page.locator("dialog")).toBeVisible();
  await page.getByRole("button", { name: /Skip animation/ }).click();
  await expect(replay).toBeFocused();
});
test("reduced motion skips the intro and the model stays still until interaction", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Replay loading screen" }),
  ).toBeHidden();
  await expect(page.locator("[data-logic-board]")).toHaveAttribute(
    "data-board-state",
    "ready",
  );
  const canvas = page.locator(".board-viewport canvas"),
    first = await canvas.screenshot();
  await page.waitForTimeout(400);
  expect(first.equals(await canvas.screenshot())).toBe(true);
});
test("pages, article links, and diagram work with JavaScript disabled", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4175/");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator(".board-fallback")).toBeVisible();
  await expect(page.locator(".board-controls")).toBeHidden();
  await page.getByRole("link", { name: "Blog", exact: true }).click();
  await page.getByRole("link", { name: /Managing video calls/ }).click();
  await expect(page.locator("h1")).toHaveText(
    "Managing video calls and session expiry in React Native",
  );
  await context.close();
});
test("desktop and mobile accessibility checks cover all pages", async ({
  page,
}) => {
  await skipBoot(page);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of paths) {
      await page.goto(path);
      if (path === "/")
        await expect(page.locator("[data-logic-board]")).toHaveAttribute(
          "data-board-state",
          "ready",
        );
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        results.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
    }
  }
});
test("the PDF remains available and blog pages never load Three.js", async ({
  page,
  request,
}) => {
  const loaded = [];
  page.on("request", (req) => loaded.push(req.url()));
  await skipBoot(page);
  await page.goto("/blog/keeping-a-call-alive/");
  expect(loaded.some((url) => url.includes("/vendor/three/"))).toBe(false);
  const pdf = await request.get(
    "/assets/documents/william-zhang-resume-august-2026.pdf",
  );
  expect(pdf.ok()).toBe(true);
  expect(pdf.headers()["content-type"]).toContain("pdf");
});
