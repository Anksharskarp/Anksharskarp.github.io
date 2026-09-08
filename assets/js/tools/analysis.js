export function jacobian(vector, x, y) {
  const hx = 1e-5 * Math.max(1, Math.abs(x)),
    hy = 1e-5 * Math.max(1, Math.abs(y));
  const xp = vector(x + hx, y),
    xm = vector(x - hx, y),
    yp = vector(x, y + hy),
    ym = vector(x, y - hy);
  return [
    [(xp[0] - xm[0]) / (2 * hx), (yp[0] - ym[0]) / (2 * hy)],
    [(xp[1] - xm[1]) / (2 * hx), (yp[1] - ym[1]) / (2 * hy)],
  ];
}

export function classify(matrix, uncertainty = 0) {
  const [[a, b], [c, d]] = matrix,
    trace = a + d,
    det = a * d - b * c;
  const discriminant = trace * trace - 4 * det;
  const scale = Math.max(...matrix.flat().map(Math.abs), 1e-300);
  const epsilon = Math.max(scale * 1e-6, uncertainty);
  const imaginary = discriminant < 0 ? Math.sqrt(-discriminant) / 2 : 0;
  const eigenvalues = imaginary
    ? [
        { re: trace / 2, im: imaginary },
        { re: trace / 2, im: -imaginary },
      ]
    : [
        { re: (trace + Math.sqrt(discriminant)) / 2, im: 0 },
        { re: (trace - Math.sqrt(discriminant)) / 2, im: 0 },
      ];
  let label = "Nonhyperbolic / inconclusive";
  if (eigenvalues.every((value) => Math.abs(value.re) > epsilon)) {
    if (eigenvalues[0].re * eigenvalues[1].re < 0) label = "Saddle";
    else
      label = `${trace < 0 ? "Attracting" : "Repelling"} ${imaginary ? "spiral" : "node"}`;
  }
  return { matrix, eigenvalues, label };
}

function newtonStep(vector, x, y, value) {
  const [[a, b], [c, d]] = jacobian(vector, x, y);
  const first = Math.hypot(a, b),
    second = Math.hypot(c, d);
  if (!first || !second || !Number.isFinite(first + second)) return null;
  // Scale rows before solving. Different derivative magnitudes alone do not
  // make the two equations dependent.
  const aa = a / first,
    bb = b / first,
    cc = c / second,
    dd = d / second;
  const determinant = aa * dd - bb * cc;
  if (Math.abs(determinant) < 1e-14) return null;
  const f = value[0] / first,
    g = value[1] / second;
  return [(dd * f - bb * g) / determinant, (-cc * f + aa * g) / determinant];
}

// Multi-start damped Newton search, with residual checks and finite work bounds.
// A finite grid is not a proof that every equilibrium has been found.
export function findEquilibria(vector, bounds, extraSeeds = []) {
  const [xmin, xmax, ymin, ymax] = bounds,
    spanX = xmax - xmin,
    spanY = ymax - ymin;
  const seeds = [...extraSeeds];
  const scales = [0, 0];
  let validSamples = 0;
  for (let i = 0; i <= 6; i++)
    for (let j = 0; j <= 6; j++) {
      const point = [xmin + (spanX * i) / 6, ymin + (spanY * j) / 6];
      seeds.push(point);
      try {
        const value = vector(...point);
        if (!value.every(Number.isFinite)) continue;
        validSamples++;
        value.forEach((entry, component) => {
          scales[component] = Math.max(scales[component], Math.abs(entry));
        });
      } catch {
        /* Domain gaps are skipped. */
      }
    }
  const scale = Math.max(...scales);
  if (!validSamples || scale === 0)
    return {
      roots: [],
      note: validSamples
        ? "The sampled field is zero throughout this window; isolated equilibria could not be identified."
        : "The field could not be evaluated in this window.",
    };
  // Each equation needs its own residual scale. One large derivative must not
  // hide a nonzero derivative in the other equation.
  const normalized = (x, y) =>
    vector(x, y).map((value, component) => {
      const scaled = value / (scales[component] || 1);
      if (!Number.isFinite(scaled) || (value !== 0 && scaled === 0))
        throw new Error("Field scale exceeds numerical precision.");
      return scaled;
    });
  const roots = [];
  for (const seed of seeds) {
    let [x, y] = seed;
    try {
      for (let iteration = 0; iteration < 45; iteration++) {
        const value = normalized(x, y),
          residual = Math.hypot(...value);
        if (residual === 0) break;
        const step = newtonStep(normalized, x, y, value);
        if (!step) break;
        const [dx, dy] = step;
        // A small residual alone is not convergence near a multiple root.
        if (residual < 1e-12 && Math.hypot(dx / spanX, dy / spanY) < 1e-10)
          break;
        let accepted = false;
        for (let factor = 1; factor >= 1 / 128; factor /= 2) {
          const nx = x - factor * dx,
            ny = y - factor * dy;
          if (Math.abs(nx) > 1e7 || Math.abs(ny) > 1e7) continue;
          try {
            if (Math.hypot(...normalized(nx, ny)) < residual) {
              x = nx;
              y = ny;
              accepted = true;
              break;
            }
          } catch {
            /* Try a shorter Newton step. */
          }
        }
        if (!accepted) break;
      }
      const residual = Math.hypot(...normalized(x, y));
      if (
        x < xmin - spanX * 1e-8 ||
        x > xmax + spanX * 1e-8 ||
        y < ymin - spanY * 1e-8 ||
        y > ymax + spanY * 1e-8 ||
        !Number.isFinite(residual) ||
        residual > 1e-11
      )
        continue;
      if (residual !== 0) {
        const step = newtonStep(normalized, x, y, normalized(x, y));
        // A small derivative far from any root can also have a small residual
        // relative to the window. Require a small Newton correction as well.
        if (!step || Math.hypot(step[0] / spanX, step[1] / spanY) > 1e-5)
          continue;
      }
      const duplicate = roots.findIndex(
        (root) => Math.hypot((x - root.x) / spanX, (y - root.y) / spanY) < 1e-5,
      );
      if (
        duplicate !== -1 &&
        Math.hypot(...normalized(roots[duplicate].x, roots[duplicate].y)) <=
          residual
      )
        continue;
      const matrix = jacobian(vector, x, y);
      if (!matrix.flat().every(Number.isFinite)) continue;
      const root = {
        x,
        y,
        ...classify(matrix, (1e-5 * scale) / Math.max(spanX, spanY)),
      };
      if (duplicate !== -1) roots[duplicate] = root;
      else roots.push(root);
      if (roots.length >= 16) break;
    } catch {
      /* Undefined points do not stop the other search seeds. */
    }
  }
  return {
    roots,
    note: roots.length
      ? "Numerical candidates in the visible window. Other equilibria may exist; roots may not be isolated. Classifications use the local linearization."
      : "No isolated equilibria found in this window. This is a numerical search, not a proof of absence.",
  };
}

export function saddleSeeds(root, bounds) {
  if (root.label !== "Saddle") return [];
  const [[a, b], [c, d]] = root.matrix;
  const distance =
    Math.min(bounds[1] - bounds[0], bounds[3] - bounds[2]) * 0.002;
  return root.eigenvalues.flatMap(({ re: lambda }) => {
    let vector =
      Math.hypot(b, lambda - a) >= Math.hypot(lambda - d, c)
        ? [b, lambda - a]
        : [lambda - d, c];
    const length = Math.hypot(...vector);
    vector = vector.map((value) => value / length);
    return [-1, 1].map((sign) => ({
      seed: [
        root.x + sign * distance * vector[0],
        root.y + sign * distance * vector[1],
      ],
      direction: lambda > 0 ? "forward" : "backward",
    }));
  });
}

// Marching triangles avoids ambiguous four-edge cells. Refine crossings and
// require a smaller residual than BOTH endpoints: a pole also changes sign.
export function contours(vector, bounds, component, resolution = 48) {
  const [xmin, xmax, ymin, ymax] = bounds,
    segments = [];
  const grid = Array.from({ length: resolution + 1 }, (_, i) =>
    Array.from({ length: resolution + 1 }, (_, j) => {
      const x = xmin + ((xmax - xmin) * i) / resolution,
        y = ymin + ((ymax - ymin) * j) / resolution;
      let value = NaN;
      try {
        value = vector(x, y)[component];
      } catch {
        /* Leave a gap at undefined values. */
      }
      return { x, y, value };
    }),
  );
  function crossing(p, q) {
    const target = Math.min(Math.abs(p.value), Math.abs(q.value)) * 1e-5;
    let low = p,
      high = q;
    for (let iteration = 0; iteration < 32; iteration++) {
      const ratio = Math.abs(low.value / high.value);
      const fraction =
        iteration === 0
          ? Number.isFinite(ratio)
            ? ratio / (1 + ratio)
            : 1
          : 0.5;
      const x = low.x + (high.x - low.x) * fraction,
        y = low.y + (high.y - low.y) * fraction;
      let value;
      try {
        value = vector(x, y)[component];
      } catch {
        return null;
      }
      if (!Number.isFinite(value)) return null;
      if (Math.abs(value) <= target) return [x, y];
      if (Math.sign(value) === Math.sign(low.value)) low = { x, y, value };
      else high = { x, y, value };
    }
    return null;
  }
  function triangle(vertices) {
    if (
      vertices.some((point) => !Number.isFinite(point.value)) ||
      vertices.every((point) => point.value === 0)
    )
      return;
    const intersections = [];
    for (let k = 0; k < 3; k++) {
      const p = vertices[k],
        q = vertices[(k + 1) % 3];
      if (p.value === 0) intersections.push([p.x, p.y]);
      else if (q.value !== 0 && Math.sign(p.value) !== Math.sign(q.value)) {
        const point = crossing(p, q);
        if (point) intersections.push(point);
      }
    }
    const unique = intersections.filter(
      (point, i) =>
        !intersections
          .slice(0, i)
          .some((other) => point[0] === other[0] && point[1] === other[1]),
    );
    if (unique.length === 2) segments.push(unique);
  }
  for (let i = 0; i < resolution; i++)
    for (let j = 0; j < resolution; j++) {
      const p = grid[i][j],
        q = grid[i + 1][j],
        r = grid[i + 1][j + 1],
        s = grid[i][j + 1];
      triangle([p, q, r]);
      triangle([p, r, s]);
    }
  return segments;
}
