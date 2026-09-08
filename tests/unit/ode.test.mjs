import test from "node:test";
import assert from "node:assert/strict";
import { compileExpression } from "../../assets/js/tools/expression.js";
import {
  createSystem,
  rk4Step,
  integrate,
  makeTrajectory,
  toCSV,
} from "../../assets/js/tools/solver.js";
import {
  jacobian,
  classify,
  findEquilibria,
  contours,
  saddleSeeds,
} from "../../assets/js/tools/analysis.js";

const near = (actual, expected, tolerance = 1e-10) => {
  assert(
    Math.abs(actual - expected) <= tolerance,
    `${actual} should be within ${tolerance} of ${expected}`,
  );
};
const final = (result) => result.points.at(-1);
const bounds = [-2, 2, -2, 2];
const configuration = {
  mode: "direction",
  first: "y",
  a: 0,
  b: 0,
  c: 0,
  step: 0.1,
  tolerance: 1e-8,
  duration: 2,
  method: "rk4",
  direction: "both",
};

test("math grammar uses conventional precedence and right-associative powers", () => {
  const cases = {
    "2+3*4": 14,
    "(2+3)*4": 20,
    "2^3^2": 512,
    "-2^2": -4,
    "(-2)^2": 4,
    "2^-2": 0.25,
    "-2^-2": -0.25,
    "8/4/2": 1,
    "8-4-2": 2,
    " 1.2e-3 + .5 + 2. ": 2.5012,
    "sin(pi/2) + cos(0) + ln(e)": 3,
    "SQRT(9)+abs(-2)+tanh(0)": 5,
  };
  for (const [source, expected] of Object.entries(cases))
    near(compileExpression(source)({}), expected);
  near(compileExpression("a*t+b*y+c")({ a: 2, b: 3, c: 4, t: 5, y: 6 }), 32);
});

test("math grammar rejects JavaScript, unknown terms, malformed input, and excessive work", () => {
  for (const source of [
    "",
    " ",
    "2y",
    "sin y",
    "sin()",
    "(y+1",
    "y+1)",
    "y+",
    "2**3",
    "sqrt(-1)",
    "Math.sin(y)",
    "globalThis",
    "constructor",
    "__proto__",
    "y.constructor",
    "y=1",
    "y[0]",
    "sin.constructor(1)",
    "1;alert(1)",
    "(() => 1)()",
    "1e999",
    "1/0",
    "log(0)",
  ])
    assert.throws(() => compileExpression(source)({ y: 1 }), undefined, source);
  assert.throws(() => compileExpression("1".repeat(257)), /under 257/);
  assert.throws(
    () => compileExpression("1+".repeat(64) + "1"),
    /too many terms/,
  );
  assert.throws(() => compileExpression("x"), /Unknown term/);
  assert.throws(
    () => compileExpression("y")(Object.create({ y: 7 })),
    /undefined/,
  );
  assert.throws(() => compileExpression("y")({}), /undefined/);
});

test("systems bind only the coordinates and parameters appropriate to their mode", () => {
  const direction = createSystem({
    ...configuration,
    first: "a*t+b*y+c",
    a: 2,
    b: -1,
    c: 3,
  });
  assert.deepEqual(direction.field(4, [5]), [6]);
  assert.deepEqual(direction.vector(4, 5), [1, 6]);
  const phase = createSystem({
    ...configuration,
    mode: "phase",
    first: "y",
    second: "-a*x-b*y",
    a: 2,
    b: 3,
  });
  assert.deepEqual(phase.field(100, [4, 5]), [5, -23]);
  assert.deepEqual(phase.vector(4, 5), [5, -23]);
  assert.throws(
    () => createSystem({ ...configuration, mode: "unknown" }),
    /supported/,
  );
  assert.throws(() => createSystem({ ...configuration, a: NaN }), /finite/);
  assert.throws(
    () =>
      createSystem({
        ...configuration,
        mode: "phase",
        first: "t",
        second: "x",
      }),
    /Unknown/,
  );
});

test("RK4 integrates a time-dependent polynomial exactly forward and backward", () => {
  // y' = 2t, y(1) = 4 gives y(t) = t² + 3.
  near(rk4Step((t) => [2 * t], 1, [4], 0.5)[0], 5.25);
  for (const end of [-3, 4]) {
    const result = integrate((t) => [2 * t], {
      t0: 1,
      state: [4],
      end,
      maxStep: 0.3,
    });
    assert.equal(result.complete, true);
    assert.equal(final(result).t, end);
    near(final(result).state[0], end * end + 3);
    for (let index = 1; index < result.points.length; index++)
      assert(
        Math.sign(end - 1) *
          (result.points[index].t - result.points[index - 1].t) >
          0,
      );
  }
});

test("adaptive RK4 converges against exponential and harmonic-oscillator solutions", () => {
  const solve = (tolerance) =>
    integrate((t, [y]) => [y], { state: [1], end: 3, maxStep: 1, tolerance });
  const loose = solve(1e-5),
    tight = solve(1e-9);
  assert(tight.points.length > loose.points.length);
  assert(
    Math.abs(final(tight).state[0] - Math.exp(3)) <
      Math.abs(final(loose).state[0] - Math.exp(3)) / 100,
  );
  near(final(tight).state[0], Math.exp(3), 1e-6);
  for (const end of [2 * Math.PI, -2 * Math.PI]) {
    const result = integrate((t, [x, y]) => [y, -x], {
      state: [1, 0],
      end,
      maxStep: 0.5,
      tolerance: 1e-9,
    });
    assert.equal(result.complete, true);
    near(final(result).state[0], 1, 1e-7);
    near(final(result).state[1], 0, 1e-7);
  }
});

test("Euler has first-order convergence and takes the exact final partial step", () => {
  const solve = (maxStep) =>
    integrate((t, [y]) => [y], {
      state: [1],
      end: 1,
      maxStep,
      method: "euler",
    });
  const coarse = solve(0.1),
    fine = solve(0.05);
  const ratio =
    (Math.E - final(coarse).state[0]) / (Math.E - final(fine).state[0]);
  assert(ratio > 1.8 && ratio < 2.1);
  const constant = integrate(() => [2], {
    state: [1],
    end: -1,
    maxStep: 0.3,
    method: "euler",
  });
  assert.equal(constant.complete, true);
  assert.equal(final(constant).t, -1);
  near(final(constant).state[0], -1);
});

test("solver handles zero duration, input errors, singularities, and finite work limits", () => {
  const unchanged = integrate(() => [1], { t0: 2, state: [7], end: 2 });
  assert.equal(unchanged.complete, true);
  assert.deepEqual(unchanged.points, [{ t: 2, state: [7] }]);
  for (const options of [
    { state: [] },
    { state: [NaN] },
    { maxStep: 0 },
    { tolerance: -1 },
    { method: "unknown" },
    { maxAttempts: Infinity },
    { maxAttempts: 0 },
    { maxAttempts: 1.5 },
  ])
    assert.throws(() =>
      integrate(() => [1], { state: [0], end: 1, ...options }),
    );
  const limited = integrate(() => [1], {
    state: [0],
    end: 10,
    maxStep: 0.1,
    maxAttempts: 3,
  });
  assert.equal(limited.complete, false);
  assert.equal(limited.points.length, 4);
  assert.match(limited.reason, /calculation limit/);
  const blowup = integrate((t, [y]) => [y * y], { state: [1], end: 2 });
  assert.equal(blowup.complete, false);
  assert(final(blowup).t < 1.01);
  assert.match(blowup.reason, /exceeded|too small|calculation limit/);
  assert(blowup.points.every((point) => point.state.every(Number.isFinite)));
  for (const method of ["rk4", "euler"]) {
    const undefinedField = integrate(
      () => {
        throw new Error("Undefined");
      },
      { state: [0], end: 1, method },
    );
    assert.equal(undefinedField.complete, false);
    assert.equal(undefinedField.points.length, 1);
    assert.match(undefinedField.reason, /too small|could not be evaluated/);
  }
});

test("trajectories join both directions once and export ordered numeric CSV", () => {
  const system = createSystem(configuration);
  const trajectory = makeTrajectory(system, configuration, [1, 2]);
  assert.equal(trajectory.complete, true);
  assert.equal(trajectory.points.filter((point) => point.t === 1).length, 1);
  assert.equal(trajectory.points[0].t, -1);
  assert.equal(final(trajectory).t, 3);
  near(trajectory.points[0].state[0], 2 * Math.exp(-2), 1e-7);
  near(final(trajectory).state[0], 2 * Math.exp(2), 2e-6);
  assert(toCSV(trajectory, "direction").startsWith("t,y\n"));
  assert(toCSV(trajectory, "direction").endsWith("\n"));
  const forward = makeTrajectory(system, configuration, [1, 2], "forward");
  assert.equal(forward.points[0].t, 1);
  const backward = makeTrajectory(system, configuration, [1, 2], "backward");
  assert.equal(final(backward).t, 1);
  assert.equal(
    toCSV({ points: [{ t: 0, state: [2, 3] }] }, "phase"),
    "t,x,y\n0,2,3\n",
  );
  const singular = createSystem({ ...configuration, first: "1/(t-1)" });
  assert.throws(
    () => makeTrajectory(singular, configuration, [1, 2]),
    /undefined/,
  );
});

test("finite-difference Jacobian and eigenvalue labels match known linear systems", () => {
  const matrix = jacobian(
    (x, y) => [x * x + 3 * y, Math.sin(x) - y * y],
    0.5,
    2,
  );
  near(matrix[0][0], 1, 1e-8);
  near(matrix[0][1], 3, 1e-8);
  near(matrix[1][0], Math.cos(0.5), 1e-8);
  near(matrix[1][1], -4, 1e-8);
  for (const [matrix, label] of [
    [
      [
        [-1, 0],
        [0, -2],
      ],
      "Attracting node",
    ],
    [
      [
        [1, 0],
        [0, 2],
      ],
      "Repelling node",
    ],
    [
      [
        [1, 0],
        [0, -2],
      ],
      "Saddle",
    ],
    [
      [
        [-1, -2],
        [2, -1],
      ],
      "Attracting spiral",
    ],
    [
      [
        [1, -2],
        [2, 1],
      ],
      "Repelling spiral",
    ],
    [
      [
        [0, -1],
        [1, 0],
      ],
      "Nonhyperbolic / inconclusive",
    ],
    [
      [
        [0, 0],
        [0, -1],
      ],
      "Nonhyperbolic / inconclusive",
    ],
    [
      [
        [0, 0],
        [0, 0],
      ],
      "Nonhyperbolic / inconclusive",
    ],
  ])
    assert.equal(classify(matrix).label, label);
  const spiral = classify([
    [-1, -2],
    [2, -1],
  ]);
  assert.deepEqual(spiral.eigenvalues, [
    { re: -1, im: 2 },
    { re: -1, im: -2 },
  ]);
  assert.equal(
    classify([
      [1e-15, 0],
      [0, 2e-15],
    ]).label,
    "Repelling node",
  );
});

test("equilibrium search finds and deduplicates known nonlinear roots", () => {
  const result = findEquilibria((x, y) => [x * x - 1, -y], bounds);
  assert.equal(result.roots.length, 2);
  const roots = result.roots.toSorted((a, b) => a.x - b.x);
  near(roots[0].x, -1);
  near(roots[1].x, 1);
  roots.forEach((root) => near(root.y, 0));
  assert.equal(roots[0].label, "Attracting node");
  assert.equal(roots[1].label, "Saddle");
  const cubic = findEquilibria((x, y) => [x ** 3, -y], bounds);
  assert.equal(cubic.roots.length, 1);
  near(cubic.roots[0].x, 0, 1e-6);
  assert.equal(cubic.roots[0].label, "Nonhyperbolic / inconclusive");
  const outside = findEquilibria((x, y) => [x - 10, y], bounds);
  assert.equal(outside.roots.length, 0);
});

test("equilibrium residuals remain meaningful with unequal equation scales and domain gaps", () => {
  assert.equal(findEquilibria((x) => [x, 1e-15], bounds).roots.length, 0);
  assert.equal(
    findEquilibria((x, y) => [Math.exp(x), y], [-100, 100, -2, 2]).roots.length,
    0,
  );
  const unequal = findEquilibria((x, y) => [x, 1e-15 * (y - 1)], bounds);
  assert.equal(unequal.roots.length, 1);
  near(unequal.roots[0].x, 0);
  near(unequal.roots[0].y, 1);
  const tiny = findEquilibria((x, y) => [1e-15 * x, 1e-15 * y], bounds);
  assert.equal(tiny.roots.length, 1);
  assert.equal(tiny.roots[0].label, "Repelling node");
  assert.equal(
    findEquilibria((x, y) => [1 / (x - 0.123), y], bounds).roots.length,
    0,
  );
  const gaps = findEquilibria((x, y) => {
    if (x < 0) throw new Error("Domain gap");
    return [x - 1, y];
  }, bounds);
  assert.equal(gaps.roots.length, 1);
  near(gaps.roots[0].x, 1);
  assert.match(
    findEquilibria(() => [NaN, NaN], bounds).note,
    /could not be evaluated/,
  );
  assert.match(findEquilibria(() => [0, 0], bounds).note, /zero throughout/);
  assert.match(
    findEquilibria((x) => [x, 0], bounds).note,
    /may not be isolated/,
  );
});

test("nullclines follow linear and curved zeros without mistaking poles for zeros", () => {
  const line = contours((x, y) => [x - y, x + y], bounds, 0);
  assert(line.length > 0);
  for (const segment of line) for (const [x, y] of segment) near(x, y);
  const circle = contours((x, y) => [x * x + y * y - 1, y], bounds, 0);
  assert(circle.length > 20);
  for (const segment of circle)
    for (const [x, y] of segment) near(x * x + y * y, 1, 1e-6);
  for (const offset of [0, 0.000001, 0.0001, 0.01, 0.083334, 0.123])
    assert.deepEqual(
      contours((x, y) => [1 / (x - offset), y], bounds, 0),
      [],
      `pole at ${offset}`,
    );
  assert.deepEqual(
    contours(() => [1, 1], bounds, 0),
    [],
  );
  assert.deepEqual(
    contours(() => [0, 0], bounds, 0),
    [],
  );
  assert.deepEqual(
    contours(
      () => {
        throw new Error("Domain gap");
      },
      bounds,
      0,
    ),
    [],
  );
});

test("saddle seeds follow both eigenvectors with the appropriate integration direction", () => {
  const root = {
    x: 0.25,
    y: -0.5,
    ...classify([
      [2, 0],
      [0, -3],
    ]),
  };
  const seeds = saddleSeeds(root, bounds);
  assert.equal(seeds.length, 4);
  assert.equal(seeds.filter((seed) => seed.direction === "forward").length, 2);
  assert.equal(seeds.filter((seed) => seed.direction === "backward").length, 2);
  for (const {
    seed: [x, y],
    direction,
  } of seeds) {
    near(Math.hypot(x - root.x, y - root.y), 0.008);
    if (direction === "forward") near(y, root.y);
    else near(x, root.x);
  }
  const rotated = {
    x: 0,
    y: 0,
    ...classify([
      [0, 1],
      [1, 0],
    ]),
  };
  for (const {
    seed: [x, y],
    direction,
  } of saddleSeeds(rotated, bounds))
    near(y, direction === "forward" ? x : -x);
  assert.deepEqual(
    saddleSeeds({ ...root, label: "Attracting node" }, bounds),
    [],
  );
});
