import { createSystem, makeTrajectory, toCSV } from "./solver.js";
import { findEquilibria, saddleSeeds } from "./analysis.js";
import {
  drawPlot,
  drawTimePlot,
  inspectPoint,
  plotPoint,
  number,
  download,
} from "./plot.js";
import { presets } from "./presets.js";

export function initWorkspace(root) {
  if (!root) return;
  const $ = (selector) => root.querySelector(selector);
  const form = $("#ode-config"),
    seedForm = $("#ode-seed"),
    stage = $("[data-plot]");
  const input = (name) => form.elements.namedItem(name);
  let mode = "direction",
    config,
    system,
    plot,
    curves = [],
    selected = -1,
    roots = [],
    dirty = false,
    cursor = null,
    originalBounds;
  let pointIndex = 0,
    pointerDown = null,
    dragged = false;
  function message(text, error = false) {
    $("#ode-message").textContent = text;
    $("#ode-message").dataset.error = String(error);
  }
  function guard(action) {
    return (event) => {
      event?.preventDefault();
      try {
        action(event);
      } catch (error) {
        message(error.message, true);
      }
    };
  }
  function numeric(field, label, min = -1e6, max = 1e6) {
    const value = Number(field.value);
    if (
      !field.value.trim() ||
      !Number.isFinite(value) ||
      value < min ||
      value > max
    ) {
      field.setAttribute("aria-invalid", "true");
      const details = field.closest("details");
      if (details) details.open = true;
      field.focus();
      throw new Error(`${label}: enter a number from ${min} to ${max}.`);
    }
    return value;
  }
  function readConfig() {
    root
      .querySelectorAll('[aria-invalid="true"]')
      .forEach((field) => field.removeAttribute("aria-invalid"));
    const bounds = ["xmin", "xmax", "ymin", "ymax"].map((name) =>
      numeric(input(name), name),
    );
    for (const [min, max] of [
      [bounds[0], bounds[1]],
      [bounds[2], bounds[3]],
    ])
      if (max - min < 1e-6 || max - min > 1e5)
        throw new Error(
          "Each axis needs a maximum greater than its minimum, with a span from 0.000001 to 100,000.",
        );
    return {
      mode,
      first: input("first").value.trim(),
      second: input("second").value.trim(),
      a: numeric(input("a"), "Parameter a"),
      b: numeric(input("b"), "Parameter b"),
      c: numeric(input("c"), "Parameter c"),
      bounds,
      density: Number(input("density").value),
      method: input("method").value,
      duration: numeric(input("duration"), "Time span", 0.001, 1000),
      step: numeric(input("step"), "Maximum step", 0.000001, 1),
      tolerance: Number(input("tolerance").value),
      direction: input("direction").value,
    };
  }
  function requireCurrent() {
    if (dirty)
      throw new Error(
        "Update the field before using the edited equations or settings.",
      );
  }
  function redraw() {
    plot = drawPlot(stage, {
      config,
      system,
      curves,
      selected,
      roots,
      showField: $("[data-field-toggle]").checked,
      showNullclines: $("[data-nullclines]").checked,
      cursor,
    });
    $("[data-count]").textContent =
      `${curves.length} solution${curves.length === 1 ? "" : "s"}`;
    $("[data-nullcline-key]").hidden =
      mode !== "phase" || !$("[data-nullclines]").checked;
    $("[data-clear]").disabled = curves.length === 0;
    inspectPoint(plot, curves[selected]?.points[pointIndex], mode);
  }
  function readPoint() {
    const curve = curves[selected];
    if (!curve) return;
    pointIndex = Math.min(
      Number($("[data-point]").value),
      curve.points.length - 1,
    );
    const point = curve.points[pointIndex],
      values = [
        ["t", point.t],
        ...(mode === "phase"
          ? [
              ["x", point.state[0]],
              ["y", point.state[1]],
            ]
          : [["y", point.state[0]]]),
      ];
    $("[data-values]").replaceChildren(
      ...values.map(([name, value]) => {
        const span = document.createElement("span");
        span.textContent = `${name} = ${number(value, 7)}`;
        return span;
      }),
    );
    $("[data-point]").setAttribute(
      "aria-valuetext",
      values.map(([name, value]) => `${name} ${number(value, 7)}`).join(", "),
    );
    inspectPoint(plot, point, mode);
  }
  function showSelected(resetPoint = true) {
    const curve = curves[selected];
    $("[data-inspector]").hidden = !curve;
    if (!curve) return;
    const options = curves.map((item, i) => {
      const option = document.createElement("option");
      option.value = i;
      option.textContent = `${i + 1}. (${item.seed.map((value) => number(value)).join(", ")}) · ${item.method === "rk4" ? "RK4" : "Euler"}${item.saddle ? " · Saddle branch" : ""}${item.complete ? "" : " · Stopped early"}`;
      return option;
    });
    $("[data-selected]").replaceChildren(...options);
    $("[data-selected]").value = selected;
    $("[data-point]").max = curve.points.length - 1;
    if (resetPoint)
      pointIndex = curve.points.findIndex(
        (point) => point.t === (mode === "phase" ? 0 : curve.seed[0]),
      );
    $("[data-point]").value = Math.max(0, pointIndex);
    $("[data-solution-status]").textContent =
      `${curve.points.length} samples. ${curve.messages.join(" ")}`;
    $("[data-time-plot]").hidden = mode !== "phase";
    if (mode === "phase") drawTimePlot($("[data-time-plot]"), curve);
    readPoint();
  }
  function apply(clear = false) {
    const next = readConfig(),
      nextSystem = createSystem(next);
    const sameSystem =
      config &&
      ["mode", "first", "second", "a", "b", "c"].every(
        (key) => config[key] === next[key],
      );
    // Recalculate before committing so a bad edit leaves the previous plot usable.
    const recalculated = clear
      ? []
      : curves.map((curve) => {
          const direction = sameSystem ? curve.direction : undefined;
          return {
            ...makeTrajectory(
              nextSystem,
              next,
              curve.seed,
              direction || next.direction,
            ),
            saddle: sameSystem && curve.saddle,
            direction,
          };
        });
    config = next;
    system = nextSystem;
    curves = recalculated;
    roots = [];
    cursor = null;
    originalBounds = [...config.bounds];
    dirty = false;
    $("[data-dirty]").textContent =
      "Updating the field recalculates existing solutions.";
    $("[data-equilibria]").hidden = true;
    selected = curves.length
      ? Math.min(Math.max(0, selected), curves.length - 1)
      : -1;
    pointIndex = 0;
    $("[data-plot-title]").textContent =
      mode === "phase" ? "Phase plane" : "Direction field";
    redraw();
    showSelected();
    const stopped = curves.filter((curve) => !curve.complete).length;
    message(
      `Field updated. ${stopped ? `${stopped} solution(s) stopped early; select one for details.` : "Click the plot or enter an initial value to add a solution."}`,
    );
  }
  function add(seed, direction, saddle = false) {
    requireCurrent();
    if (curves.length >= 16)
      throw new Error(
        "The plot contains 16 solutions. Remove one or clear the plot to add another.",
      );
    if (
      !seed.every((value) => Number.isFinite(value) && Math.abs(value) <= 1e6)
    )
      throw new Error(
        "Initial coordinates must be finite and between −1,000,000 and 1,000,000.",
      );
    const curve = makeTrajectory(
      system,
      config,
      seed,
      direction || config.direction,
    );
    curves.push({ ...curve, saddle, direction });
    selected = curves.length - 1;
    seedForm.elements.seedX.value = number(seed[0], 10);
    seedForm.elements.seedY.value = number(seed[1], 10);
    redraw();
    showSelected();
    message(
      `Solution ${curves.length} added.${curve.complete ? "" : " Integration stopped early; see the selected solution for details."}`,
    );
  }
  function loadPreset(index) {
    const preset = presets[mode][index];
    for (const name of ["first", "second", "a", "b", "c"])
      if (preset[name] !== undefined) input(name).value = preset[name];
    ["xmin", "xmax", "ymin", "ymax"].forEach((name, i) => {
      input(name).value = preset.bounds[i];
    });
    input("duration").value = 12;
    input("step").value = 0.1;
    input("tolerance").value = "0.000001";
    input("method").value = "rk4";
    input("direction").value = "both";
    input("preset").value = index;
    apply(true);
    add(preset.seed);
  }
  function switchMode(next) {
    mode = next;
    root
      .querySelectorAll("[data-mode]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.mode === mode),
        ),
      );
    root.querySelectorAll("[data-phase-only]").forEach((node) => {
      node.hidden = mode !== "phase";
    });
    $("[data-first-label]").textContent =
      mode === "phase" ? "dx/dt =" : "dy/dt =";
    $("#ode-syntax").firstChild.textContent =
      `Use ${mode === "phase" ? "x, y" : "t, y"} and parameters a, b, c. Write multiplication as 2*y. `;
    $("[data-horizontal-min]").textContent =
      mode === "phase" ? "x min" : "t min";
    $("[data-horizontal-max]").textContent =
      mode === "phase" ? "x max" : "t max";
    $("[data-seed-label]").textContent = mode === "phase" ? "x₀" : "t₀";
    $("[data-axis-note]").textContent =
      `Horizontal: ${mode === "phase" ? "x" : "t"} · Vertical: y`;
    const custom = document.createElement("option");
    custom.value = "custom";
    custom.textContent = "Custom equation";
    input("preset").replaceChildren(
      custom,
      ...presets[mode].map((preset, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = preset.name;
        return option;
      }),
    );
    $("[data-nullclines]").checked = false;
    loadPreset(0);
  }
  function showRoots() {
    const list = $("[data-roots]");
    list.replaceChildren();
    roots.forEach((root, i) => {
      const card = document.createElement("article");
      card.className = "ode-root";
      const title = document.createElement("h3");
      title.textContent = `E${i + 1} · (${number(root.x)}, ${number(root.y)})`;
      const label = document.createElement("p");
      label.textContent = `Linearization: ${root.label}`;
      const matrix = document.createElement("pre");
      matrix.textContent =
        "Jacobian\n" +
        root.matrix
          .map(
            (row) => `[ ${row.map((value) => number(value, 6)).join("   ")} ]`,
          )
          .join("\n");
      const eigen = document.createElement("p");
      eigen.textContent =
        "Eigenvalues: " +
        root.eigenvalues
          .map(
            ({ re, im }) =>
              `${number(re, 6)}${im ? ` ${im > 0 ? "+" : "−"} ${number(Math.abs(im), 6)}i` : ""}`,
          )
          .join("; ");
      card.append(title, label, matrix, eigen);
      if (root.label === "Saddle") {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ode-small-button";
        button.textContent = "Trace saddle branches";
        button.addEventListener(
          "click",
          guard(() => {
            requireCurrent();
            if (curves.length > 12)
              throw new Error(
                "Make room for four curves before tracing saddle branches.",
              );
            for (const branch of saddleSeeds(root, config.bounds))
              add(branch.seed, branch.direction, true);
            message(
              "Added four local saddle branches. These approximate the stable and unstable separatrices.",
            );
          }),
        );
        card.append(button);
      }
      list.append(card);
    });
  }
  function changeBounds(bounds) {
    requireCurrent();
    if (
      bounds.some((value) => Math.abs(value) > 1e6) ||
      [bounds[1] - bounds[0], bounds[3] - bounds[2]].some(
        (span) => span < 1e-6 || span > 1e5,
      )
    )
      throw new Error(
        "This is the supported zoom limit. Edit the plot window to move elsewhere.",
      );
    config = { ...config, bounds };
    ["xmin", "xmax", "ymin", "ymax"].forEach((name, i) => {
      input(name).value = bounds[i];
    });
    roots = [];
    $("[data-equilibria]").hidden = true;
    redraw();
  }
  form.addEventListener(
    "submit",
    guard(() => apply()),
  );
  form.addEventListener("input", (event) => {
    if (event.target === input("preset")) return;
    dirty = true;
    input("preset").value = "custom";
    $("[data-dirty]").textContent =
      "Edits pending. Update the field to apply them.";
  });
  input("preset").addEventListener(
    "change",
    guard(() => {
      if (input("preset").value !== "custom")
        loadPreset(Number(input("preset").value));
    }),
  );
  root.querySelectorAll("[data-mode]").forEach((button) =>
    button.addEventListener(
      "click",
      guard(() => {
        if (mode !== button.dataset.mode) switchMode(button.dataset.mode);
      }),
    ),
  );
  seedForm.addEventListener(
    "submit",
    guard(() =>
      add([
        numeric(seedForm.elements.seedX, "Initial horizontal value"),
        numeric(seedForm.elements.seedY, "Initial y value"),
      ]),
    ),
  );
  $("[data-field-toggle]").addEventListener("change", redraw);
  $("[data-nullclines]").addEventListener("change", redraw);
  $("[data-selected]").addEventListener("change", () => {
    selected = Number($("[data-selected]").value);
    redraw();
    showSelected();
  });
  $("[data-point]").addEventListener("input", readPoint);
  $("[data-clear]").addEventListener("click", () => {
    curves = [];
    selected = -1;
    redraw();
    showSelected();
    message("Solutions cleared. The field and equilibrium results remain.");
  });
  $("[data-remove]").addEventListener("click", () => {
    curves.splice(selected, 1);
    selected = Math.min(selected, curves.length - 1);
    redraw();
    showSelected();
    message("Selected solution removed.");
  });
  $("[data-export-csv]").addEventListener(
    "click",
    guard(() => {
      if (!curves[selected]) return;
      download(
        `solution-${selected + 1}.csv`,
        "text/csv;charset=utf-8",
        toCSV(curves[selected], mode),
      );
      message(
        `Downloaded the ${curves[selected].points.length} samples from solution ${selected + 1}.`,
      );
    }),
  );
  $("[data-export-svg]").addEventListener(
    "click",
    guard(() => {
      download(
        `${mode}-field.svg`,
        "image/svg+xml;charset=utf-8",
        new XMLSerializer().serializeToString(plot.svg),
      );
      message("Plot saved as SVG.");
    }),
  );
  $("[data-find]").addEventListener(
    "click",
    guard(() => {
      requireCurrent();
      const result = findEquilibria(
        system.vector,
        config.bounds,
        curves.map((curve) => curve.seed),
      );
      roots = result.roots;
      $("[data-equilibria]").hidden = false;
      $("[data-equilibria-note]").textContent = result.note;
      showRoots();
      redraw();
      message(
        `${roots.length} equilibrium candidate${roots.length === 1 ? "" : "s"} found. See the equilibrium results below.`,
      );
    }),
  );
  root.querySelectorAll("[data-zoom]").forEach((button) =>
    button.addEventListener(
      "click",
      guard(() => {
        const factor = Number(button.dataset.zoom),
          [xmin, xmax, ymin, ymax] = config.bounds;
        const cx = (xmin + xmax) / 2,
          cy = (ymin + ymax) / 2,
          hx = ((xmax - xmin) * factor) / 2,
          hy = ((ymax - ymin) * factor) / 2;
        changeBounds([cx - hx, cx + hx, cy - hy, cy + hy]);
      }),
    ),
  );
  $("[data-reset-view]").addEventListener(
    "click",
    guard(() => changeBounds([...originalBounds])),
  );
  stage.addEventListener("pointerdown", (event) => {
    pointerDown = [event.clientX, event.clientY];
    dragged = false;
  });
  stage.addEventListener("pointermove", (event) => {
    if (
      pointerDown &&
      Math.hypot(
        event.clientX - pointerDown[0],
        event.clientY - pointerDown[1],
      ) > 6
    )
      dragged = true;
    const point = plotPoint(plot, event);
    if (point)
      $("[data-cursor]").textContent =
        `(${point.map((value) => number(value, 4)).join(", ")})`;
  });
  stage.addEventListener("pointercancel", () => {
    dragged = true;
    pointerDown = null;
  });
  stage.addEventListener("pointerleave", () => {
    pointerDown = null;
    $("[data-cursor]").textContent = "Click to add a solution";
  });
  stage.addEventListener(
    "click",
    guard((event) => {
      if (dragged) return;
      pointerDown = null;
      const target = event.target.closest("[data-trajectory]");
      if (target) {
        selected = Number(target.dataset.trajectory);
        redraw();
        showSelected();
        return;
      }
      const point = plotPoint(plot, event);
      if (point) add(point);
    }),
  );
  // Preserve normal Tab / page scrolling for unrelated keys.
  stage.addEventListener("keydown", (event) => {
    if (
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter"].includes(
        event.key,
      )
    )
      return;
    event.preventDefault();
    try {
      const [xmin, xmax, ymin, ymax] = config.bounds;
      cursor ||= [(xmin + xmax) / 2, (ymin + ymax) / 2];
      if (event.key === "Enter") {
        add([...cursor]);
        return;
      }
      if (event.key === "ArrowLeft") cursor[0] -= (xmax - xmin) / 40;
      if (event.key === "ArrowRight") cursor[0] += (xmax - xmin) / 40;
      if (event.key === "ArrowUp") cursor[1] += (ymax - ymin) / 40;
      if (event.key === "ArrowDown") cursor[1] -= (ymax - ymin) / 40;
      cursor = [
        Math.max(xmin, Math.min(xmax, cursor[0])),
        Math.max(ymin, Math.min(ymax, cursor[1])),
      ];
      $("[data-cursor]").textContent =
        `(${cursor.map((value) => number(value, 4)).join(", ")})`;
      redraw();
    } catch (error) {
      message(error.message, true);
    }
  });
  switchMode("direction");
  root
    .querySelectorAll(
      "[data-enable], [data-mode], [data-zoom], [data-reset-view], [data-field-toggle], [data-nullclines], [data-export-svg], [data-find]",
    )
    .forEach((node) => {
      node.disabled = false;
    });
  $("[data-startup]").hidden = true;
  root.dataset.ready = "true";
  let resizeFrame = 0,
    lastWidth = stage.clientWidth;
  const resize = () => {
    if (lastWidth === stage.clientWidth) return;
    lastWidth = stage.clientWidth;
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      redraw();
      showSelected(false);
    });
  };
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
}

try {
  initWorkspace(document.querySelector("[data-ode-tool]"));
} catch {
  const startup = document.querySelector("[data-startup]");
  if (startup) {
    startup.hidden = false;
    startup.textContent =
      "The calculator could not start. Reload the page to try again. Equation and method notes are available below.";
  }
}
