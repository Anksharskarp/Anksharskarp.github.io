import { contours } from "./analysis.js";
const NS = "http://www.w3.org/2000/svg";
const ink = "#262926", muted = "#60655e", line = "#d7dad2", paper = "#fafaf8";
export function number(value, digits = 5) {
  if (value === 0 || Object.is(value, -0)) return "0";
  return Math.abs(value) >= 1e5 || Math.abs(value) < 1e-3 ? value.toExponential(Math.max(1, digits - 1)) : String(Number(value.toPrecision(digits)));
}
function element(tag, attrs = {}, text) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  return node;
}
function ticks(min, max, count) {
  const rough = (max - min) / count, base = 10 ** Math.floor(Math.log10(rough));
  const ratio = rough / base, step = (ratio <= 1 ? 1 : ratio <= 2 ? 2 : ratio <= 5 ? 5 : 10) * base;
  const result = [];
  for (let i = Math.ceil(min / step); i <= Math.floor(max / step) && result.length < 20; i++) result.push(i * step);
  return result;
}
function frame(width, height, bounds, id, labels) {
  const [xmin, xmax, ymin, ymax] = bounds;
  const box = { left: 58, top: 20, width: width - 76, height: height - 66 };
  const map = ([x, y]) => [box.left + (x - xmin) / (xmax - xmin) * box.width, box.top + (ymax - y) / (ymax - ymin) * box.height];
  const svg = element("svg", { xmlns: NS, viewBox: `0 0 ${width} ${height}`, width, height, role: "img", "font-family": "Menlo, Monaco, Consolas, monospace", "font-size": 10 });
  svg.append(element("rect", { width, height, fill: paper }));
  const defs = element("defs"), clip = element("clipPath", { id });
  clip.append(element("rect", { x: box.left, y: box.top, width: box.width, height: box.height }));
  defs.append(clip); svg.append(defs);
  for (const x of ticks(xmin, xmax, width < 400 ? 3 : 6)) {
    const px = map([x, ymin])[0];
    svg.append(element("path", { d: `M${px},${box.top}v${box.height}`, stroke: x === 0 ? "#92988e" : line, "stroke-width": 1 }));
    svg.append(element("text", { x: px, y: height - 27, "text-anchor": "middle", fill: muted }, number(x, 3)));
  }
  for (const y of ticks(ymin, ymax, height < 250 ? 3 : 5)) {
    const py = map([xmin, y])[1];
    svg.append(element("path", { d: `M${box.left},${py}h${box.width}`, stroke: y === 0 ? "#92988e" : line, "stroke-width": 1 }));
    svg.append(element("text", { x: box.left - 8, y: py + 3, "text-anchor": "end", fill: muted }, number(y, 3)));
  }
  svg.append(element("text", { x: box.left + box.width / 2, y: height - 7, "text-anchor": "middle", fill: ink }, labels[0]));
  svg.append(element("text", { x: 12, y: box.top - 5, fill: ink }, labels[1]));
  const graph = element("g", { "clip-path": `url(#${id})` }); svg.append(graph);
  return { svg, graph, box, map, bounds };
}
function path(points, map) {
  // All samples remain in the CSV. Limit visual path size on long integrations.
  const stride = Math.max(1, Math.ceil(points.length / 1800));
  return points.filter((_, i) => i % stride === 0 || i === points.length - 1).map((point, i) => {
    const mapped = map(point).map((value) => Math.max(-1e7, Math.min(1e7, value)).toFixed(2));
    return `${i ? "L" : "M"}${mapped.join(",")}`;
  }).join("");
}
const coordinates = (point, mode) => mode === "direction" ? [point.t, point.state[0]] : point.state;

export function drawPlot(container, { config, system, curves, selected, roots = [], showField = true, showNullclines = false, cursor }) {
  const width = Math.max(220, Math.round(container.clientWidth)), height = Math.max(320, Math.min(510, width * 0.76));
  const result = frame(width, height, config.bounds, "ode-field-clip", [config.mode === "phase" ? "x" : "t", "y"]);
  const { svg, graph, box, map } = result;
  svg.setAttribute("tabindex", "0");
  svg.setAttribute("aria-label", `${config.mode === "phase" ? "Phase plane" : "Direction field"}. ${curves.length} solution curves. Click to add a solution, or use arrow keys and Enter. Initial values can also be entered in the form.`);
  svg.append(element("title", {}, config.mode === "phase" ? `dx/dt = ${config.first}; dy/dt = ${config.second}` : `dy/dt = ${config.first}`));
  svg.append(element("desc", {}, `Parameters a=${config.a}, b=${config.b}, c=${config.c}. ${config.method === "rk4" ? "Adaptive Runge–Kutta 4" : "Euler"}. Maximum step ${config.step}. Time span ${config.duration} in the selected direction(s).`));
  const [xmin, xmax, ymin, ymax] = config.bounds;
  if (showField) {
    const columns = Math.min(config.density, Math.max(8, Math.floor(box.width / 18))), rows = Math.max(8, Math.round(columns * box.height / box.width));
    const length = Math.min(box.width / columns, box.height / rows) * 0.65;
    const strokes = [];
    for (let i = 0; i < columns; i++) for (let j = 0; j < rows; j++) {
      const x = xmin + (i + 0.5) / columns * (xmax - xmin), y = ymin + (j + 0.5) / rows * (ymax - ymin);
      try {
        const [u, v] = system.vector(x, y), dx = u * box.width / (xmax - xmin), dy = -v * box.height / (ymax - ymin), norm = Math.hypot(dx, dy);
        if (!Number.isFinite(norm) || norm < 1e-300) continue;
        const [cx, cy] = map([x, y]), hx = dx / norm * length / 2, hy = dy / norm * length / 2;
        strokes.push(`M${cx - hx},${cy - hy}L${cx + hx},${cy + hy}`);
        if (config.mode === "phase") {
          const ax = hx * 0.45, ay = hy * 0.45;
          strokes.push(`M${cx + hx - ax - ay * 0.6},${cy + hy - ay + ax * 0.6}L${cx + hx},${cy + hy}L${cx + hx - ax + ay * 0.6},${cy + hy - ay - ax * 0.6}`);
        }
      } catch { /* Undefined slopes leave gaps. */ }
    }
    graph.append(element("path", { d: strokes.join(""), fill: "none", stroke: "#a0a69a", "stroke-width": 1, "data-field-lines": "" }));
  }
  if (config.mode === "phase" && showNullclines) for (const component of [0, 1]) {
    const segments = contours(system.vector, config.bounds, component);
    graph.append(element("path", { d: segments.map((segment) => path(segment, map)).join(""), fill: "none", stroke: "#6b7565", "stroke-width": 1.5, "stroke-dasharray": component ? "5 4" : "none", "data-nullcline": component }));
  }
  // Draw the selected solution last, so intersections remain legible.
  const ordered = curves.map((curve, index) => ({ curve, index })).sort((a, b) => Number(a.index === selected) - Number(b.index === selected));
  for (const { curve, index } of ordered) {
    const active = index === selected;
    graph.append(element("path", { d: path(curve.points.map((point) => coordinates(point, config.mode)), map), fill: "none", stroke: active ? ink : "#7c8475", "stroke-width": active ? 2.3 : 1.5, "stroke-dasharray": curve.saddle ? "6 3" : "none", "data-trajectory": index }));
    const [cx, cy] = map(curve.seed);
    graph.append(element("circle", { cx, cy, r: 3, fill: paper, stroke: active ? ink : "#7c8475", "stroke-width": 1.5 }));
    graph.append(element("text", { x: cx + 6, y: cy - 6, fill: active ? ink : muted, "font-size": 10 }, String(index + 1)));
  }
  for (const [i, root] of roots.entries()) {
    const [cx, cy] = map([root.x, root.y]);
    graph.append(element("rect", { x: cx - 4, y: cy - 4, width: 8, height: 8, fill: paper, stroke: ink, "stroke-width": 1.5, "data-equilibrium": i }));
    graph.append(element("text", { x: cx + 7, y: cy + 13, fill: ink }, `E${i + 1}`));
  }
  if (cursor) {
    const [cx, cy] = map(cursor);
    graph.append(element("path", { d: `M${cx - 7},${cy}h14M${cx},${cy - 7}v14`, stroke: ink, "stroke-width": 1 }));
  }
  graph.append(element("circle", { "data-inspected-point": "", r: 4, fill: ink, stroke: paper, "stroke-width": 1.5, visibility: "hidden" }));
  const focused = container.contains(document.activeElement);
  container.replaceChildren(svg);
  if (focused) svg.focus({ preventScroll: true });
  return result;
}

export function inspectPoint(plot, point, mode) {
  const circle = plot.svg.querySelector("[data-inspected-point]");
  if (!point) { circle.setAttribute("visibility", "hidden"); return; }
  const [cx, cy] = plot.map(coordinates(point, mode));
  circle.setAttribute("cx", cx); circle.setAttribute("cy", cy); circle.setAttribute("visibility", "visible");
}

export function drawTimePlot(container, curve) {
  const points = curve.points, first = points[0].t, last = points.at(-1).t;
  let min = Infinity, max = -Infinity;
  for (const { state } of points) for (const value of state) { min = Math.min(min, value); max = Math.max(max, value); }
  const padding = Math.max((max - min) * 0.1, Math.abs(min) * 0.01, 0.1);
  const { svg, graph, map } = frame(Math.max(220, container.clientWidth), 210, [first === last ? first - 1 : first, first === last ? last + 1 : last, min - padding, max + padding], "ode-time-clip", ["t", "x, y"]);
  svg.setAttribute("aria-label", "Selected solution over time. Solid line: x(t). Dashed line: y(t). Use the value slider to inspect samples.");
  for (const index of [0, 1]) graph.append(element("path", { d: path(points.map((point) => [point.t, point.state[index]]), map), stroke: index ? "#606b58" : ink, "stroke-width": 1.6, "stroke-dasharray": index ? "5 4" : "none", fill: "none" }));
  svg.append(element("text", { x: 65, y: 13, fill: muted, "font-size": 9 }, "x(t): solid · y(t): dashed"));
  container.replaceChildren(svg);
}

export function plotPoint(plot, event) {
  const rect = plot.svg.getBoundingClientRect(), width = plot.svg.viewBox.baseVal.width, height = plot.svg.viewBox.baseVal.height;
  const px = (event.clientX - rect.left) * width / rect.width, py = (event.clientY - rect.top) * height / rect.height;
  const { box, bounds: [xmin, xmax, ymin, ymax] } = plot;
  if (px < box.left || px > box.left + box.width || py < box.top || py > box.top + box.height) return null;
  return [xmin + (px - box.left) / box.width * (xmax - xmin), ymax - (py - box.top) / box.height * (ymax - ymin)];
}

export function download(filename, type, content) {
  const url = URL.createObjectURL(new Blob([content], { type })), link = document.createElement("a");
  link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
