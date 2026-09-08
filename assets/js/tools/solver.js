import { compileExpression } from "./expression.js";

export function createSystem({ mode, first, second, a, b, c }) {
  if (!["direction", "phase"].includes(mode)) throw new Error("Choose a supported equation type.");
  const variables = mode === "direction" ? ["t", "y", "a", "b", "c"] : ["x", "y", "a", "b", "c"];
  const f = compileExpression(first, variables);
  const g = mode === "phase" ? compileExpression(second, variables) : null;
  const parameters = { a, b, c };
  if (![a, b, c].every(Number.isFinite)) throw new Error("Parameters must be finite numbers.");
  return {
    field: (t, state) => mode === "direction"
      ? [f({ ...parameters, t, y: state[0] })]
      : [f({ ...parameters, x: state[0], y: state[1] }), g({ ...parameters, x: state[0], y: state[1] })],
    vector: (x, y) => mode === "direction"
      ? [1, f({ ...parameters, t: x, y })]
      : [f({ ...parameters, x, y }), g({ ...parameters, x, y })],
  };
}

export function rk4Step(field, t, state, h) {
  const shift = (slope, scale) => state.map((value, i) => value + scale * slope[i]);
  const k1 = field(t, state), k2 = field(t + h / 2, shift(k1, h / 2));
  const k3 = field(t + h / 2, shift(k2, h / 2)), k4 = field(t + h, shift(k3, h));
  return state.map((value, i) => value + h * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6);
}

// RK4 uses step doubling for local error control. Bounds keep browser work finite.
export function integrate(field, { t0 = 0, state, end, maxStep = 0.1, tolerance = 1e-6, method = "rk4", maxAttempts = 5000 }) {
  if (![t0, end, maxStep, tolerance, ...state].every(Number.isFinite) || maxStep <= 0 || tolerance <= 0 || !["rk4", "euler"].includes(method))
    throw new Error("Use finite initial values, a positive step size, and a supported method.");
  const points = [{ t: t0, state: [...state] }];
  const sign = Math.sign(end - t0);
  let t = t0, current = [...state], h = sign * Math.min(maxStep, Math.abs(end - t0)), attempts = 0;
  let reason = "Reached requested time.";
  while (sign * (end - t) > 0) {
    if (++attempts > maxAttempts) { reason = "Stopped at the calculation limit. Shorten the time interval or increase the step size."; break; }
    h = sign * Math.min(Math.abs(h), Math.abs(end - t));
    if (t + h === t || Math.abs(h) < 1e-12 * Math.max(1, Math.abs(t))) {
      reason = "Stopped because the required step became too small. Check for a singularity or stiffness."; break;
    }
    let next, error = 0;
    try {
      if (method === "euler") {
        const slope = field(t, current);
        next = current.map((value, i) => value + h * slope[i]);
      } else {
        const coarse = rk4Step(field, t, current, h);
        const half = rk4Step(field, t, current, h / 2);
        next = rk4Step(field, t + h / 2, half, h / 2);
        error = Math.max(...next.map((value, i) => Math.abs(value - coarse[i]) / (15 * tolerance * (1 + Math.max(Math.abs(value), Math.abs(current[i]))))));
      }
      if (!next.every(Number.isFinite) || !Number.isFinite(error)) throw new Error("Non-finite step");
    } catch {
      if (method === "rk4") { h /= 2; continue; }
      reason = "Stopped where the equation could not be evaluated."; break;
    }
    if (method === "rk4" && error > 1) { h *= Math.max(0.2, 0.9 * error ** -0.2); continue; }
    if (next.some((value) => Math.abs(value) > 1e8)) { reason = "Stopped because a solution value exceeded 100,000,000."; break; }
    t = Math.abs(end - (t + h)) < 1e-13 * Math.max(1, Math.abs(end)) ? end : t + h;
    current = next;
    points.push({ t, state: [...current] });
    if (method === "rk4") h = sign * Math.min(maxStep, Math.abs(h) * (error === 0 ? 2 : Math.min(2, Math.max(0.5, 0.9 * error ** -0.2))));
  }
  return { points, complete: t === end, reason };
}

export function makeTrajectory(system, config, seed, direction = config.direction) {
  const t0 = config.mode === "direction" ? seed[0] : 0;
  const state = config.mode === "direction" ? [seed[1]] : seed;
  // Reject undefined initial conditions before returning any misleading curve.
  system.field(t0, state);
  const run = (end) => integrate(system.field, { t0, state, end, maxStep: config.step, tolerance: config.tolerance, method: config.method });
  const backward = direction !== "forward" ? run(t0 - config.duration) : null;
  const forward = direction !== "backward" ? run(t0 + config.duration) : null;
  return {
    seed: [...seed], method: config.method,
    points: [...(backward ? backward.points.slice(1).reverse() : []), { t: t0, state: [...state] }, ...(forward ? forward.points.slice(1) : [])],
    messages: [backward && `Backward: ${backward.reason}`, forward && `Forward: ${forward.reason}`].filter(Boolean),
    complete: (!backward || backward.complete) && (!forward || forward.complete),
  };
}

export function toCSV(trajectory, mode) {
  return [mode === "phase" ? "t,x,y" : "t,y", ...trajectory.points.map(({ t, state }) => [t, ...state].join(","))].join("\n") + "\n";
}
