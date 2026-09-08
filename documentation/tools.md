# Tools and differential equations

The public page is [`/tools/`](../tools/index.html). Its first utility covers
direction fields and autonomous phase planes, following the interaction of
John Polking's [dfield and pplane](https://math.rice.edu/~polking/): enter an
equation, inspect its field, and add solution curves from initial values. The
implementation is original to this repository.

Use the shared header, footer, loading introduction, typography, neutral palette,
and square controls when extending this page. Keep labels literal: “Update field,”
“Find equilibria,” and “Download values.” The [writing conventions](writing-conventions.md)
apply to examples, help text, and numerical errors as well as headings.

## Modes and controls

| Mode            | Equation                           | Initial value        | Main plot                        |
| --------------- | ---------------------------------- | -------------------- | -------------------------------- |
| Direction field | `dy/dt = f(t,y)`                   | `(t₀,y₀)`            | `t` horizontally, `y` vertically |
| Phase plane     | `dx/dt = f(x,y)`, `dy/dt = g(x,y)` | `(x₀,y₀)` at `t = 0` | `x` horizontally, `y` vertically |

Both modes accept numeric parameters `a`, `b`, and `c`. Phase-plane equations are
autonomous: `t` is not allowed there. To represent a second-order autonomous ODE,
take `x` as position and `y` as velocity; the oscillator and pendulum presets use
this form.

- Choose an example or edit the right-hand sides. **Update field** applies pending
  settings and recalculates existing curves. Changing the equations or parameters
  clears previous saddle-branch labels because those branches belonged to the old
  system. An invalid edit leaves the previous
  successful plot available. Loading a preset or switching modes starts a fresh
  set of curves.
- Add a solution by entering initial values, clicking or tapping the plot, or
  focusing the plot and using arrow keys followed by Enter. Click a curve or use
  **Selected solution** to select an existing one. Touch scrolling remains a
  browser action. On narrow screens, **View plot** and **Equations** links move
  between the form and output without a separate navigation pattern.
- Set window bounds, field density, integration method, time span, step, tolerance,
  and integration direction in the settings. Time span applies separately in each
  selected direction. Zoom is centered on the window; **Reset view** restores the
  bounds from the last applied configuration.
- Inspect numerical samples with the value slider. Phase mode also shows `x(t)`
  and `y(t)` in a time plot. Solid and dashed lines distinguish the coordinates.
- In phase mode, enable nullclines or choose **Find equilibria**. Results include
  coordinates, a numerical Jacobian, eigenvalues, and the local linearization's
  classification. Saddles offer four approximate stable/unstable branches.
- **Save plot (SVG)** downloads the main plot with labels and overlays.
  **Download values (CSV)** saves every sample of the selected curve, with columns
  `t,y` or `t,x,y`. The time plot is not a separate SVG export. Samples correspond
  to the applied configuration.

Calculations run in the browser without an account or server calculation. The
calculator does not save equations or curves; reloading restores the default
example. Without JavaScript, method notes
and site navigation remain available; calculator controls stay disabled with an
explanation.

## Source map

| File                            | Responsibility                                                                |
| ------------------------------- | ----------------------------------------------------------------------------- |
| `src/templates/tools.html`      | Forms, plot containers, method notes, and no-JavaScript state                 |
| `scripts/lib/site.mjs`          | Adds `tools/index.html` to the generated page set                             |
| `scripts/lib/components.mjs`    | Shared shell, Tools navigation state, and page module selection               |
| `assets/css/modules/tools.css`  | Workspace layout, compact controls, and responsive rules                      |
| `assets/js/tools/workspace.js`  | Validation, applied configuration, selected curves, interactions, and startup |
| `assets/js/tools/expression.js` | Restricted expression grammar and evaluator                                   |
| `assets/js/tools/solver.js`     | Equation adapters, integration, trajectories, and CSV serialization           |
| `assets/js/tools/analysis.js`   | Jacobian, equilibrium search/classification, saddle seeds, and nullclines     |
| `assets/js/tools/plot.js`       | SVG plots, coordinate mapping, sample marker, and downloads                   |
| `assets/js/tools/presets.js`    | Example equations, parameters, bounds, and initial values                     |

Expression, solver, analysis, and preset modules have no DOM dependencies and can
be imported by Node unit tests. `workspace.js` owns browser state; plotting receives
that state as arguments. Keep calculations in numerical modules, separate from
event handlers. Tools imports its own entry point without loading the homepage
terminal or Three.js model. The shared loading introduction is independent of the
calculator. Startup failure leaves the static notes and navigation available.

## Expression handling

`compileExpression()` tokenizes input, parses it into an instruction sequence, and
evaluates it with a numeric stack. It never calls `eval` or `Function`, and exposes
no JavaScript objects, property access, assignments, or user-defined functions.
Variable, function, and constant names are explicitly allowed; property checks use
`Object.hasOwn`.

The grammar supports finite real numbers, scientific notation, `+ - * / ^`, unary
signs, parentheses, and the functions listed on the page. Powers associate to the
right and take precedence over unary signs: `-y^2` means `-(y^2)`. Multiplication
must be explicit. Names are case-insensitive, angles use radians, and `log` and
`ln` mean natural logarithm. Inputs are capped at 256 characters and 128 tokens.
Undefined or non-finite intermediate values produce an error.

To add a function, register a numeric function in `expression.js`, update the
visible syntax notes, and test its domain and non-finite results. Do not replace
the parser with JavaScript execution. Render equation text and errors using
`textContent` or the SVG helper's text argument.

## Numerical scope and limits

These explicit methods are intended for smooth, non-stiff real ODEs. They do not
solve symbolically, prove existence or uniqueness, or certify stability.

- Adaptive RK4 compares one full step with two half steps. Their difference divided
  by 15 estimates local error, scaled using tolerance and solution magnitude.
  Accepted values use the two half steps. Tolerance is not a global-error bound.
  Euler uses a fixed step without adaptive error control.
- Integration defaults to 5,000 step attempts per direction and a solution-magnitude
  limit of `1e8`. It also stops if the step becomes too small or evaluation cannot
  proceed. Each curve reports whether it reached the requested time and why it
  stopped.
- The UI permits 16 curves, time spans of `0.001`–`1000`, maximum steps of
  `0.000001`–`1`, axis spans of `0.000001`–`100000`, and coordinates and parameters
  within ±1,000,000. These bound work and plot size; they do not establish accuracy.
- Field arrows are normalized, so length does not indicate speed. Visual paths may
  omit samples to bound SVG size; CSV retains all samples. Unequal axis ranges
  change the apparent geometric scale.
- Equilibria use a finite seed grid plus existing curve seeds, damped Newton steps,
  a finite-difference Jacobian, residual checks, and duplicate removal. Searches
  can miss closely spaced, degenerate, or poorly scaled roots. No reported roots
  is not proof of absence. Nonhyperbolic results are inconclusive; a linearized
  center does not determine nonlinear stability.
- Nullclines use sampled marching triangles and an interpolated residual check to
  reduce false crossings at poles. A finite mesh can miss features or fail to
  resolve discontinuities. Saddle branches begin near equilibria along
  eigenvectors and approximate separatrices.

Compare numerical changes against known solutions, check convergence as the step
decreases, and test singularities and stalled integration. Keep local error,
global error, and linearized stability distinct in the visible explanation.

## Adding examples, tools, or pages

Add examples to the appropriate array in `presets.js`:

```js
{
  name: "Linear decay",
  first: "-a*y",
  a: 1, b: 1, c: 1,
  bounds: [-1, 5, -1, 3],
  seed: [0, 2],
}
```

Phase entries also require `second`. Bounds are
`[horizontalMin, horizontalMax, yMin, yMax]`; seeds are `[t₀,y₀]` or `[x₀,y₀]`.
Choose finite initial values where the equation is defined. Cover each example
with compilation and short-integration tests, plus a known result when available.
Default method, time span, and step settings live in `loadPreset()` in `workspace.js`.

For another utility, create a distinct template and root selector, a browser entry
point, and a CSS module. Keep reusable numerical helpers separate from form state.
Register CSS in `scripts/lib/styles.mjs`. Use the shared `page()` renderer and
register the generated route in `scripts/lib/site.mjs`. Pass its entry-point path
through the renderer's `modulePath` option instead of loading every tool on every
page. For example, this workspace uses `tools: true`, `prefix: "../"`, and
`modulePath: "assets/js/tools/workspace.js"`; another tool can supply its own module
while retaining the shared Tools navigation state.

The current `/tools/` route opens this workspace directly. If a tools index is
introduced, preserve this entry point or provide an intentional link or redirect.
Pages beneath `tools/` are already copied by the build; a new top-level directory
also needs registration in `scripts/build.mjs`. Set the correct relative `prefix`
for shared assets and navigation. Add the route to generation, link, responsive,
and navigation tests.

## Publishing and verification

`src/templates/tools.html` is an authoring file. GitHub Pages serves generated
`tools/index.html`, shared root pages, the CSS bundle, and JavaScript files from
the repository root. Pushing only templates or generator changes leaves the live
site unchanged. Follow [development and testing](testing.md#github-pages) to
generate, check, and commit public output.

Test the utility at three levels:

1. Unit: grammar precedence and rejected input; analytic solution comparisons;
   Euler convergence; backward integration; singularities and work limits;
   Jacobians, classifications, nullclines, and every preset.
2. Browser: mode changes, pending and invalid edits, seeds, curve selection,
   keyboard and touch controls, sample inspection, exports, equilibria, and startup
   failure. Inspect downloaded SVG/CSV contents as well as the download action.
3. Whole site: generated output matches source, Tools links resolve from home and
   blog, existing sections remain usable, no horizontal overflow, accessible
   forms and focus order, and no unrelated model downloads.

The [testing guide](testing.md) lists commands. Record actual results in
[the review](review.md); this document describes the verification contract without
claiming a particular run passed.
