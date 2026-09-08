# Stability review

## September 8, 2026: Tools page

The differential-equations workspace is generated at `tools/index.html`. It uses
the shared page renderer, navigation, footer, loading introduction, and neutral
terminal styles. Both the main navigation and the `/tools` terminal command reach
it. Its browser entry point is supplied through `page()`'s `modulePath` option;
the equation parser, solver, analysis, plots, presets, and interactions are separate
modules. See [Tools](tools.md) for their responsibilities and extension points.

### Publishing issue

The earlier commit contained the authoring template and JavaScript, but generation
had not run before the work was interrupted. `tools/index.html` was absent, and
the committed homepage and blog navigation still lacked Tools. The live homepage
also showed the old navigation when checked. The existing GitHub Pages setup serves
repository-root files; it does not execute the Node generator.

Generation now includes the Tools page, navigation in every page, and the Tools CSS
in the public bundle. The new read-only `npm run check:generated` check was verified
to fail on the missing/stale files and pass after building. The next publishing
commit must include the new `tools/` directory as well as modified files. Local
generation and verification do not push or deploy changes.

### Review findings

- Removed a keyboard handler that prevented Tab from leaving the plot. Arrow keys
  and Enter remain available for placing initial values.
- Confirmed that invalid edits preserve the last applied plot and cannot be used
  to add curves until corrected. Equation text is parsed with a restricted math
  grammar and rendered as text, without JavaScript execution.
- Refined equilibrium searches to avoid duplicate multiple-root candidates and
  false roots caused by unequal equation scales or very large variation across
  the window. A small residual alone is insufficient to accept a Newton result.
- Refined nullcline crossings so a pole near a cell edge is not drawn as a zero.
  The finite mesh and finite equilibrium search still have limits, stated on the
  page and in the Tools documentation.
- Bounded numerical work and rejected invalid integration limits. Incomplete
  integrations report their stopping reason; local tolerance does not imply an
  exact blow-up time or a bound on total error.
- Clear previous saddle-branch labels when an equation or parameter changes.
  Those labels describe the previous system and cannot safely carry over.
- Confirmed that zooming changes the view without changing numerical samples,
  exports contain the displayed configuration's data, and vertical touch swipes
  scroll the page without creating accidental solutions.

### Verification results

- **22 unit tests passed:** 9 site-generation/content checks and 13 numerical checks.
  Numerical tests use analytic polynomial, exponential, and oscillator solutions,
  Euler convergence, singularities, known Jacobians and roots, and pole cases.
- **24 browser tests passed** in Google Chrome: 13 existing-site checks, expanded
  to include Tools, and 11 dedicated Tools checks. They cover navigation, equation
  edits, all 10 presets, plot input, keyboard focus, zoom/reset, sample inspection,
  equilibrium analysis, saddle branches, exports, and failure states.
- All four pages were checked at seven widths from 320 to 1440 pixels, with no
  horizontal overflow. Both Tools modes also passed with expanded settings at
  seven widths, including the layout transition at 850 pixels.
- **10 automated accessibility scans reported no violations** for the configured
  WCAG 2 A/AA and WCAG 2.1 AA rules: four pages at desktop/mobile widths, plus
  expanded phase-plane results at both widths.
- A fresh build generated **4 pages and validated 94 link and asset references**.
  `npm run check:generated` confirmed that the public HTML and CSS match sources.
- Final desktop and mobile screenshots were inspected, including the mobile links
  between equations and the plot. The existing résumé, blog, loader, terminal, and
  PCB tests passed. Tools makes no Three.js requests.

The browser and accessibility limits below still apply. Numerical results are
approximations for smooth, non-stiff real ODEs; this is not a symbolic solver or a
proof of equilibrium completeness or nonlinear stability.

## September 7, 2026: Portfolio and logic board

Reviewed September 7, 2026. The review preserves the approved neutral terminal/voxel
design while separating content, page rendering, styles, and optional browser
features. The static computer illustration is replaced by the interactive logic
board, with a labeled SVG fallback.

## Findings and changes

| Area | Change and reason |
| --- | --- |
| Content maintenance | Experience, project cards, and article metadata now come from JSON. Shared templates and renderers generate pages so adding an entry does not require copying page structure. |
| Existing behavior | Public article paths, résumé downloads, homepage anchors, legacy anchor aliases, and terminal commands are retained. The CSS was separated into modules in its existing cascade order. |
| Terminal input | Alias and destination lookup now accepts only an object's own properties. Inputs such as `constructor` and `__proto__` are treated as unknown commands. Feedback uses text content, and history is capped at 100 entries. |
| Loading screen | A delayed document load cannot restart the introduction after its timeout has already released the page. Storage or dialog failures also release the page. Escape, skip, replay, and reduced-motion behavior remain available. |
| Optional 3D | Navigation and the terminal initialize before the model loads. A failed import, unavailable WebGL, render failure, or lost context leaves a labeled diagram. Rendering runs on demand, with a pixel-ratio cap and resource cleanup. |
| PCB descriptions | The caption is compact, and component explanations use 10px text inside a native disclosure, closed by default. Rotation controls remain visible. Selecting a component in the model opens its description. |
| Content validation | Generation checks HTML parsing, heading count, duplicate IDs, image alt attributes, local files and anchors, URL schemes, dates, and post metadata. Plain text is escaped. Article bodies and explicitly named HTML fields remain trusted authoring inputs. |
| Dependencies | Three.js and development packages are pinned in the lockfile. Both matching Three.js browser modules and its license are served locally. Blog pages do not request the model library. |
| Future changes | The documentation covers content updates, component boundaries, model behavior, development, testing, and the owner's requirement for clear, direct writing without marketing labels. |

## Verification results

- **9 unit tests passed.** These include generating an additional article,
  experience entry, and project; preserving existing URLs and résumé facts;
  escaping content; and rejecting invalid metadata, unsafe links, and broken anchors.
- **13 browser tests passed** in local Google Chrome with Chromium software rendering
  for the model. They cover all three pages at seven widths (320, 375, 390, 560, 768,
  1024, and 1440 pixels), with no horizontal overflow or uncaught page errors.
- **Six automated accessibility scans reported no violations** for the configured
  WCAG 2 A/AA and WCAG 2.1 AA rules: three pages at desktop and mobile widths.
- Model checks verified that rotation changes the rendered image, reset restores
  the original view, component selection changes the description, keyboard controls
  work, and context loss restores the fallback. A vertical touch swipe over the
  canvas still scrolls the mobile page.
- Loader checks covered once-per-tab behavior, skip and replay focus, reduced motion,
  a slow document load, blocked session storage, and unavailable modal dialogs.
- JavaScript-disabled checks retained the homepage, diagram, article links, and
  native board disclosure. The résumé returned a successful PDF response.
- A fresh build generated **3 pages and validated 70 link and asset references**.
  The dependency audit reported **0 known vulnerabilities** at the time of review.
- Text comparison against the pre-refactor page preserved the work, experience,
  blog preview, about, contact, and terminal content. Final desktop and mobile
  screenshots were inspected, including the collapsed and expanded PCB panel.

Run the checks again after functional changes; see [Development and testing](testing.md).
The build is local and does not publish the site.

## Remaining limits

Browser automation used Chrome and software-rendered WebGL. It does not establish
compatibility with every physical GPU, mobile browser, or assistive technology.
Automated accessibility results are a useful regression check, not a complete
accessibility audit. The SVG and static HTML provide the baseline when enhancement
is unavailable.

The board is an illustrative model, not a manufactured product or electrical
schematic. Its explanations describe component functions rather than verified
hardware specifications.

HTML authoring fields are for repository maintainers, not untrusted submissions.
Generated root files must be committed with their sources for the existing GitHub
Pages deployment. Removing a post from metadata does not delete its published file;
retiring or redirecting an old URL is an explicit maintainer decision.
