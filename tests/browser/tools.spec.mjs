import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

async function openTools(page) {
  await page.addInitScript(() =>
    sessionStorage.setItem("wz.portfolio.intro.v2", "seen"),
  );
  await page.goto("/tools/");
  await expect(page.locator("[data-ode-tool]")).toHaveAttribute(
    "data-ready",
    "true",
  );
}
const trajectories = (page) => page.locator("[data-trajectory]");
async function openWindow(page, name) {
  await page.locator(`[data-open-window="ode-${name}-window"]`).click();
  const dialog = page.locator(`#ode-${name}-window`);
  await expect(dialog).toBeVisible();
  return dialog;
}
async function closeWindow(page, name) {
  const dialog = page.locator(`#ode-${name}-window`);
  await dialog.locator("[data-close-window]").click();
  await expect(dialog).toBeHidden();
}

test("the generated Tools page is connected to the existing site and loads only its own modules", async ({
  page,
}) => {
  const requests = [],
    errors = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("pageerror", (error) => errors.push(error.message));
  await openTools(page);
  await expect(
    page.getByRole("link", { name: "Tools", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(trajectories(page)).toHaveCount(1);
  await expect(page.locator("[data-field-lines]")).toBeVisible();
  expect(
    requests.some(
      (url) => url.includes("/vendor/three/") || url.endsWith("/site.js"),
    ),
  ).toBe(false);
  await page.getByRole("link", { name: "Blog", exact: true }).click();
  await page.getByRole("link", { name: "Tools", exact: true }).click();
  await expect(page.locator("[data-ode-tool]")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.getByRole("link", { name: "William Zhang, home" }).click();
  await page.locator("#terminal summary").click();
  await page.locator("#command-input").fill("/tools");
  await page.locator("#command-form button").click();
  await expect(page).toHaveURL(/\/tools\/$/);
  expect(errors).toEqual([]);
});

test("editing the equation recalculates the solution and the value slider matches exponential decay", async ({
  page,
}) => {
  await openTools(page);
  await page.locator("#ode-first").fill("-y");
  const integration = await openWindow(page, "integration");
  await page.locator('[name="duration"]').fill("1");
  await page.locator('[name="step"]').fill("0.05");
  await page.locator("#ode-direction").selectOption("forward");
  await integration.getByRole("button", { name: "Apply changes" }).click();
  await expect(integration).toBeHidden();
  await openWindow(page, "solution");
  await page.locator("#ode-point").focus();
  await page.keyboard.press("End");
  await expect(page.locator("[data-values]")).toContainText("t = 1");
  const value = Number(
    (await page.locator("[data-values]").innerText()).match(
      /y = ([\d.e+-]+)/,
    )[1],
  );
  expect(value).toBeCloseTo(0.5 * Math.exp(-1), 6);
  await expect(trajectories(page)).toHaveCount(1);
});

test("plot clicks and keyboard input add curves, and Tab leaves the plot", async ({
  page,
}) => {
  await openTools(page);
  const plot = page.locator("[data-plot] > svg");
  await plot.click({ position: { x: 200, y: 90 } });
  await expect(trajectories(page)).toHaveCount(2);
  await plot.focus();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(trajectories(page)).toHaveCount(3);
  await page.keyboard.press("Tab");
  await expect(plot).not.toBeFocused();
  await openWindow(page, "solution");
  await page.getByRole("button", { name: "Remove selected" }).click();
  await expect(trajectories(page)).toHaveCount(2);
  await closeWindow(page, "solution");
  await page.getByRole("checkbox", { name: "Field", exact: true }).uncheck();
  await expect(page.locator("[data-field-lines]")).toHaveCount(0);
  await page.getByRole("button", { name: "Clear solutions" }).click();
  await expect(trajectories(page)).toHaveCount(0);
  await expect(page.locator("[data-inspector]")).toBeHidden();
});

test("phase-plane nullclines, equilibrium linearization, time plots, and saddle branches work", async ({
  page,
}) => {
  await openTools(page);
  await page.getByRole("button", { name: "Phase plane" }).click();
  await page.getByRole("checkbox", { name: "Nullclines" }).check();
  await expect(page.locator("[data-nullcline]")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Find equilibria", exact: true })
    .click();
  await expect(page.locator("[data-roots]")).toContainText("Attracting spiral");
  await expect(page.locator("[data-roots]")).toContainText("Eigenvalues:");
  await closeWindow(page, "equilibria");
  await openWindow(page, "solution");
  await expect(page.locator("[data-time-plot] svg")).toBeVisible();
  await closeWindow(page, "solution");
  await page.locator("#ode-preset").selectOption({ label: "Saddle" });
  await page
    .getByRole("button", { name: "Find equilibria", exact: true })
    .click();
  await page.getByRole("button", { name: "Trace saddle branches" }).click();
  await expect(page.locator("#ode-equilibria-window")).toBeHidden();
  await expect(trajectories(page)).toHaveCount(5);
  await expect(
    page.locator('[data-trajectory][stroke-dasharray="6 3"]'),
  ).toHaveCount(4);
  await page.locator("#ode-first").fill("-x");
  await page.getByRole("button", { name: "Update field" }).click();
  await expect(
    page.locator('[data-trajectory][stroke-dasharray="6 3"]'),
  ).toHaveCount(0);
  await expect(page.locator("[data-equilibria]")).toBeHidden();
  await page
    .getByRole("button", { name: "Direction field", exact: false })
    .click();
  await expect(page.locator("[data-equilibria]")).toBeHidden();
  await expect(page.locator("[data-time-plot]")).toBeHidden();
});

test("invalid edits preserve the committed plot and cannot execute markup or script", async ({
  page,
}) => {
  await openTools(page);
  const original = await trajectories(page).first().getAttribute("d");
  await page.locator("#ode-first").fill("<img src=x onerror=alert(1)>");
  await page.getByRole("button", { name: "Update field" }).click();
  await expect(page.locator("#ode-message")).toHaveAttribute(
    "data-error",
    "true",
  );
  expect(await trajectories(page).first().getAttribute("d")).toBe(original);
  await expect(page.locator("#ode-message img")).toHaveCount(0);
  await page.getByRole("button", { name: "Add solution" }).click();
  await expect(page.locator("#ode-message")).toContainText("Update the field");
  await page.locator("#ode-first").fill("-y");
  await page.getByRole("button", { name: "Update field" }).click();
  await expect(page.locator("#ode-message")).toHaveAttribute(
    "data-error",
    "false",
  );
  const bounds = await openWindow(page, "bounds");
  await page.locator('[name="xmax"]').fill("-10");
  await bounds.getByRole("button", { name: "Apply changes" }).click();
  await expect(page.locator("#ode-message")).toContainText(
    "maximum greater than its minimum",
  );
  await expect(bounds).toBeVisible();
  await expect(bounds.locator("[data-window-message]")).toContainText(
    "maximum greater than its minimum",
  );
});

test("singular solutions report early termination instead of claiming completion", async ({
  page,
}) => {
  await openTools(page);
  await page
    .locator("#ode-preset")
    .selectOption({ label: "Finite-time blow-up" });
  await expect(page.locator("#ode-message")).toContainText("stopped early");
  await openWindow(page, "solution");
  await expect(page.locator("[data-solution-status]")).toContainText("Stopped");
  await page.locator("#ode-point").focus();
  await page.keyboard.press("End");
  const t = Number(
    (await page.locator("[data-values]").innerText()).match(
      /t = ([\d.e+-]+)/,
    )[1],
  );
  // Local error control does not make the numerical blow-up time exact.
  expect(t).toBeCloseTo(1, 4);
});

test("CSV downloads contain every sample and SVG exports are standalone", async ({
  page,
}) => {
  await openTools(page);
  await openWindow(page, "solution");
  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download values (CSV)" }).click();
  const csv = await csvPromise,
    contents = await readFile(await csv.path(), "utf8");
  expect(contents.startsWith("t,y\n")).toBe(true);
  const samples = contents
    .trim()
    .split("\n")
    .slice(1)
    .map((row) => row.split(",").map(Number));
  expect(samples.length).toBeGreaterThan(100);
  expect(samples.every((row) => row.every(Number.isFinite))).toBe(true);
  expect(samples[0][0]).toBe(-12);
  expect(samples.at(-1)[0]).toBe(12);
  await closeWindow(page, "solution");
  const svgPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save plot (SVG)" }).click();
  const svg = await svgPromise,
    svgText = await readFile(await svg.path(), "utf8");
  expect(svgText).toContain('xmlns="http://www.w3.org/2000/svg"');
  expect(svgText).toContain("dy/dt = a*y*(1-y/b)");
  expect(svgText).toContain('data-trajectory="0"');
  expect(svgText).not.toContain("<script");
});

test("both modes and individual windows stay responsive and accessible", async ({
  page,
}) => {
  test.setTimeout(90000);
  await openTools(page);
  for (const width of [320, 390, 560, 768, 850, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const mode of ["direction", "phase"]) {
      await page.locator(`[data-mode="${mode}"]`).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(page.locator("[data-plot] svg")).toBeVisible();
    }
  }
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const name of [
      null,
      "parameters",
      "bounds",
      "integration",
      "solution",
      "equilibria",
    ]) {
      if (name === "equilibria") {
        await page
          .getByRole("button", { name: "Find equilibria", exact: true })
          .click();
      } else if (name) {
        await openWindow(page, name);
      }
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        result.violations.map((violation) => ({
          id: violation.id,
          nodes: violation.nodes.map((node) => node.target),
        })),
        `${width}px, ${name || "workspace"}`,
      ).toEqual([]);
      if (name) {
        const dialog = page.locator(`#ode-${name}-window`);
        const bounds = await dialog.boundingBox();
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(1000);
        expect(
          await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
        ).toBe(true);
        await closeWindow(page, name);
      }
    }
  }
});

test("settings windows preserve drafts, keep background controls inert, and return to their opener", async ({
  page,
}) => {
  await openTools(page);
  const original = await trajectories(page).first().getAttribute("d");
  const opener = page.locator('[data-open-window="ode-parameters-window"]');
  let parameters = await openWindow(page, "parameters");
  await parameters.locator('[name="a"]').fill("2");
  for (let index = 0; index < 8; index++) {
    await page.keyboard.press("Tab");
    // Chrome can move focus to its browser UI between cycles; page controls
    // outside the modal must remain unreachable.
    expect(
      await parameters.evaluate(
        (node) =>
          document.activeElement === document.body ||
          node.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(parameters).toBeHidden();
  await expect(opener).toBeFocused();
  expect(await trajectories(page).first().getAttribute("d")).toBe(original);
  parameters = await openWindow(page, "parameters");
  await expect(parameters.locator('[name="a"]')).toHaveValue("2");
  await parameters.getByRole("button", { name: "Apply changes" }).click();
  await expect(parameters).toBeHidden();
  await expect(opener).toBeFocused();
  expect(await trajectories(page).first().getAttribute("d")).not.toBe(original);
  await expect(page.locator("[data-parameter-summary]")).toContainText("a = 2");

  parameters = await openWindow(page, "parameters");
  await parameters.locator('[name="a"]').fill("");
  await closeWindow(page, "parameters");
  await page.getByRole("button", { name: "Update field" }).click();
  await expect(parameters).toBeVisible();
  await expect(parameters.locator('[name="a"]')).toBeFocused();
  await expect(parameters.locator('[name="a"]')).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(parameters.locator("[data-window-message]")).toContainText(
    "enter a number",
  );
  await parameters.locator('[name="a"]').fill("1");
  await parameters.getByRole("button", { name: "Apply changes" }).click();
  await expect(parameters).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Update field" }),
  ).toBeFocused();
});

test("removing the final solution closes its window and restores usable focus", async ({
  page,
}) => {
  await openTools(page);
  const inspector = await openWindow(page, "solution");
  await inspector.getByRole("button", { name: "Remove selected" }).click();
  await expect(trajectories(page)).toHaveCount(0);
  await expect(inspector).toBeHidden();
  await expect(
    page.locator('[data-open-window="ode-solution-window"]'),
  ).toBeDisabled();
  await expect(page.locator("[data-window-fallback]")).toBeFocused();
  await page.getByRole("button", { name: "Add solution" }).click();
  await expect(trajectories(page)).toHaveCount(1);
  await expect(
    page.locator('[data-open-window="ode-solution-window"]'),
  ).toBeEnabled();
  await openWindow(page, "solution");
  await expect(page.locator("[data-values]")).toContainText("y =");
});

test("a settings window remains usable on a short narrow screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await openTools(page);
  const integration = await openWindow(page, "integration");
  await integration.locator('[name="duration"]').fill("2");
  await integration.getByRole("button", { name: "Apply changes" }).click();
  await expect(integration).toBeHidden();
  await expect(page.locator("[data-method-summary]")).toContainText(
    "time span 2",
  );
  await expect(
    page.locator('[data-open-window="ode-integration-window"]'),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("JavaScript-disabled and failed-module cases retain notes and disable unavailable controls", async ({
  browser,
  page,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const nojs = await context.newPage();
  await nojs.goto("http://127.0.0.1:4175/tools/");
  await expect(
    nojs.getByRole("heading", { name: "Differential equations", exact: true }),
  ).toBeVisible();
  await expect(nojs.locator("[data-startup]")).toBeVisible();
  await expect(
    nojs.getByRole("button", { name: "Update field" }),
  ).toBeDisabled();
  await nojs.getByText("Numerical methods and limits", { exact: true }).click();
  await expect(nojs.getByText(/Adaptive RK4 compares/)).toBeVisible();
  await context.close();
  await page.route("**/tools/solver.js", (route) => route.abort());
  await page.goto("/tools/");
  await expect(page.locator("[data-startup]")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Update field" }),
  ).toBeDisabled();
});

test("zoom preserves numerical values and all presets can be rendered", async ({
  page,
}) => {
  await openTools(page);
  const path = await trajectories(page).first().getAttribute("d");
  const values = await page.locator("[data-values]").innerText();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  expect(await trajectories(page).first().getAttribute("d")).not.toBe(path);
  expect(await page.locator("[data-values]").innerText()).toBe(values);
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  expect(await trajectories(page).first().getAttribute("d")).toBe(path);
  for (const mode of ["direction", "phase"]) {
    await page.locator(`[data-mode="${mode}"]`).click();
    for (let index = 0; index < 5; index++) {
      await page.locator("#ode-preset").selectOption(String(index));
      await expect(trajectories(page)).toHaveCount(1);
      await expect(page.locator("#ode-message")).toHaveAttribute(
        "data-error",
        "false",
      );
      expect(await trajectories(page).first().getAttribute("d")).not.toMatch(
        /NaN|Infinity/,
      );
    }
  }
});

test("a mobile swipe over the field scrolls without adding a solution", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await openTools(page);
  await page.getByRole("link", { name: "View plot" }).click();
  await page.waitForTimeout(400);
  const plot = page.locator("[data-plot] > svg");
  const box = await plot.boundingBox(),
    before = await page.evaluate(() => scrollY);
  const x = box.x + box.width * 0.7,
    y = box.y + box.height * 0.7;
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (let i = 1; i <= 6; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: y - i * 20 }],
    });
    await page.waitForTimeout(30);
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(() => page.evaluate(() => scrollY))
    .toBeGreaterThan(before + 40);
  await expect(trajectories(page)).toHaveCount(1);
  await context.close();
});
