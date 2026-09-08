export function jacobian(vector, x, y) {
  const hx = 1e-5 * Math.max(1, Math.abs(x)), hy = 1e-5 * Math.max(1, Math.abs(y));
  const xp = vector(x + hx, y), xm = vector(x - hx, y), yp = vector(x, y + hy), ym = vector(x, y - hy);
  return [[(xp[0] - xm[0]) / (2 * hx), (yp[0] - ym[0]) / (2 * hy)], [(xp[1] - xm[1]) / (2 * hx), (yp[1] - ym[1]) / (2 * hy)]];
}

export function classify(matrix, uncertainty = 0) {
  const [[a, b], [c, d]] = matrix, trace = a + d, det = a * d - b * c;
  const discriminant = trace * trace - 4 * det;
  const scale = Math.max(...matrix.flat().map(Math.abs), 1e-300);
  const epsilon = Math.max(scale * 1e-6, uncertainty);
  const imaginary = discriminant < 0 ? Math.sqrt(-discriminant) / 2 : 0;
  const eigenvalues = imaginary
    ? [{ re: trace / 2, im: imaginary }, { re: trace / 2, im: -imaginary }]
    : [{ re: (trace + Math.sqrt(discriminant)) / 2, im: 0 }, { re: (trace - Math.sqrt(discriminant)) / 2, im: 0 }];
  let label = "Nonhyperbolic / inconclusive";
  if (eigenvalues.every((value) => Math.abs(value.re) > epsilon)) {
    if (eigenvalues[0].re * eigenvalues[1].re < 0) label = "Saddle";
    else label = `${trace < 0 ? "Attracting" : "Repelling"} ${imaginary ? "spiral" : "node"}`;
  }
  return { matrix, eigenvalues, label };
}

// Multi-start damped Newton search, with residual checks and finite work bounds.
// A finite grid is not a proof that every equilibrium has been found.
export function findEquilibria(vector, bounds, extraSeeds = []) {
  const [xmin, xmax, ymin, ymax] = bounds, spanX = xmax - xmin, spanY = ymax - ymin;
  const seeds = [...extraSeeds];
  let scale = 0;
  for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) {
    const point = [xmin + spanX * i / 6, ymin + spanY * j / 6];
    seeds.push(point);
    try { scale = Math.max(scale, ...vector(...point).map(Math.abs)); } catch { /* Domain gaps are skipped. */ }
  }
  if (!Number.isFinite(scale) || scale === 0) return { roots: [], note: scale === 0 ? "The sampled field is zero throughout this window; isolated equilibria could not be identified." : "The field could not be evaluated in this window." };
  const normalized = (x, y) => vector(x, y).map((value) => value / scale);
  const roots = [];
  for (const seed of seeds) {
    let [x, y] = seed;
    try {
      for (let iteration = 0; iteration < 45; iteration++) {
        const value = normalized(x, y), residual = Math.hypot(...value);
        if (residual < 1e-12) break;
        const [[a, b], [c, d]] = jacobian(normalized, x, y), determinant = a * d - b * c;
        if (Math.abs(determinant) < 1e-14 * Math.max(a*a + b*b + c*c + d*d, 1e-300)) break;
        const dx = (d * value[0] - b * value[1]) / determinant, dy = (-c * value[0] + a * value[1]) / determinant;
        let accepted = false;
        for (let factor = 1; factor >= 1 / 128; factor /= 2) {
          const nx = x - factor * dx, ny = y - factor * dy;
          if (Math.abs(nx) > 1e7 || Math.abs(ny) > 1e7) continue;
          try {
            if (Math.hypot(...normalized(nx, ny)) < residual) { x = nx; y = ny; accepted = true; break; }
          } catch { /* Try a shorter Newton step. */ }
        }
        if (!accepted) break;
      }
      if (x < xmin - spanX * 1e-8 || x > xmax + spanX * 1e-8 || y < ymin - spanY * 1e-8 || y > ymax + spanY * 1e-8 || Math.hypot(...normalized(x, y)) > 1e-11) continue;
      if (roots.some((root) => Math.hypot((x - root.x) / spanX, (y - root.y) / spanY) < 1e-5)) continue;
      const matrix = jacobian(vector, x, y);
      if (!matrix.flat().every(Number.isFinite)) continue;
      roots.push({ x, y, ...classify(matrix, 1e-5 * scale / Math.max(spanX, spanY)) });
      if (roots.length >= 16) break;
    } catch { /* Undefined points do not stop the other search seeds. */ }
  }
  return { roots, note: roots.length ? "Numerical search in the visible window. Other equilibria may exist; classifications use the local linearization." : "No isolated equilibria found in this window. This is a numerical search, not a proof of absence." };
}

export function saddleSeeds(root, bounds) {
  if (root.label !== "Saddle") return [];
  const [[a, b], [c, d]] = root.matrix;
  const distance = Math.min(bounds[1] - bounds[0], bounds[3] - bounds[2]) * 0.002;
  return root.eigenvalues.flatMap(({ re: lambda }) => {
    let vector = Math.hypot(b, lambda - a) >= Math.hypot(lambda - d, c) ? [b, lambda - a] : [lambda - d, c];
    const length = Math.hypot(...vector);
    vector = vector.map((value) => value / length);
    return [-1, 1].map((sign) => ({ seed: [root.x + sign * distance * vector[0], root.y + sign * distance * vector[1]], direction: lambda > 0 ? "forward" : "backward" }));
  });
}

// Marching triangles avoids ambiguous four-edge cells. Check the interpolated
// residual so poles (a sign change without a zero) are not drawn as nullclines.
export function contours(vector, bounds, component, resolution = 48) {
  const [xmin, xmax, ymin, ymax] = bounds, segments = [];
  const grid = Array.from({ length: resolution + 1 }, (_, i) => Array.from({ length: resolution + 1 }, (_, j) => {
    const x = xmin + (xmax - xmin) * i / resolution, y = ymin + (ymax - ymin) * j / resolution;
    let value = NaN;
    try { value = vector(x, y)[component]; } catch { /* Leave a gap at undefined values. */ }
    return { x, y, value };
  }));
  function triangle(vertices) {
    if (vertices.some((point) => !Number.isFinite(point.value)) || vertices.every((point) => point.value === 0)) return;
    const intersections = [];
    for (let k = 0; k < 3; k++) {
      const p = vertices[k], q = vertices[(k + 1) % 3];
      if (p.value === 0) intersections.push([p.x, p.y]);
      else if (q.value !== 0 && Math.sign(p.value) !== Math.sign(q.value)) {
        const fraction = Math.abs(p.value) / (Math.abs(p.value) + Math.abs(q.value));
        const x = p.x + (q.x - p.x) * fraction, y = p.y + (q.y - p.y) * fraction;
        try {
          if (Math.abs(vector(x, y)[component]) <= Math.max(Math.abs(p.value), Math.abs(q.value)) * 0.25) intersections.push([x, y]);
        } catch { /* A discontinuity is not a zero. */ }
      }
    }
    const unique = intersections.filter((point, i) => !intersections.slice(0, i).some((other) => point[0] === other[0] && point[1] === other[1]));
    if (unique.length === 2) segments.push(unique);
  }
  for (let i = 0; i < resolution; i++) for (let j = 0; j < resolution; j++) {
    const p = grid[i][j], q = grid[i + 1][j], r = grid[i + 1][j + 1], s = grid[i][j + 1];
    triangle([p, q, r]); triangle([p, r, s]);
  }
  return segments;
}
