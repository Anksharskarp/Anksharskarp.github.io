# Development and testing

## Setup

Use Node.js 24 or later and Python 3. Install the pinned packages:

```sh
npm ci
npx playwright install chromium
```

The browser download is for tests only. If Google Chrome is already installed,
`PLAYWRIGHT_CHANNEL=chrome npm run test:browser` can use it instead.

## Commands

| Command                | Purpose                                                                     |
| ---------------------- | --------------------------------------------------------------------------- |
| `npm run dev`          | Generate the site, serve port 4173, and watch content/templates/CSS sources |
| `npm run generate`     | Update root HTML, bundled CSS, and local Three.js vendor files              |
| `npm run check:generated` | Read-only comparison of public HTML/CSS with source; fails on missing or stale output |
| `npm run build`        | Generate, validate, and copy public assets to `dist/`                       |
| `npm run preview`      | Serve `dist/` on port 4174                                                  |
| `npm test`             | Unit checks for generation, validation, commands, and numerical modules     |
| `npm run test:browser` | Browser tests against the existing `dist/` build, served on port 4175       |
| `npm run check`        | Unit checks, fresh build, and browser regression suite                      |

The development server watches authored content, templates, and CSS modules. Refresh
the browser after a change. JavaScript source files are served directly. If editing
generator code, restart `npm run dev` so Node imports the changed modules. A content
validation error is printed while the last valid generated pages remain available.

## Verification scope

Site unit tests exercise adding content, stable paths and résumé facts, HTML escaping,
unsupported URL schemes, invalid dates, duplicate slugs, conflicting featured posts,
broken IDs/links, and command names that resemble inherited object properties.
Tools tests should verify the parser with accepted and rejected equations, numerical
results against known solutions, convergence, integration limits, equilibrium
analysis, and preset validity. The [Tools guide](tools.md#publishing-and-verification)
describes the numerical test contract.

Browser tests cover:

- All four pages at seven widths from 320 to 1440 pixels.
- Mobile and legacy anchor navigation, terminal history, and invalid commands.
- Model rotation, reset, selection, keyboard input, context-loss fallback, and
  failure to load the optional module.
- Loading-screen skip/replay, once-per-tab behavior, and reduced motion.
- Slow document loading, blocked storage, and unavailable modal dialogs.
- Vertical touch scrolling over the model without trapping the page.
- Article navigation and the fallback diagram with JavaScript disabled.
- WCAG A/AA automated checks on desktop and mobile.
- Résumé availability and the absence of Three.js requests on article pages.

The separate `tests/browser/tools.spec.mjs` suite exercises Tools navigation,
equation updates, click and keyboard seeds, Tab focus exit, curve removal, phase
analysis, invalid-input recovery, stopped integrations, exported file contents,
responsive settings, automated accessibility, and no-JavaScript/module-failure
states. It also checks zoom/reset, every preset, and mobile touch scrolling without
adding accidental solutions. Tools must load its own numerical modules without requesting the homepage
terminal or Three.js. Check actual run results in [the review](review.md).

The 3D browser tests enable Chromium's software renderer so they can verify actual
rendering without a physical GPU. This flag is test-only. Real-device GPU behavior,
all assistive technologies, and every mobile browser are not covered by automation.
Review screenshots and perform a short keyboard/touch check when changing layout or
input handling.

## GitHub Pages

The existing deployment mode is preserved: **main branch → repository root**.
GitHub Pages serves committed public files; it does not run this site's Node
generator. A template can exist in `src/templates/` without a corresponding public
page until generation runs. Likewise, editing the shared header does not update
navigation in previously generated HTML.

Before a commit intended for publication:

```sh
npm run check
npm run check:generated
git status --short
```

`npm run check` generates a fresh build as part of testing. Use
`PLAYWRIGHT_CHANNEL=chrome npm run check` if testing with an installed Chrome.
The read-only generated-output check compares all current generated pages and
`assets/css/site.css` against their sources and validates links. It reports missing
or stale files without changing them. Run `npm run build` to refresh such files,
then check again. It does not inspect the Git staging area or the live deployment.

Commit sources and generated public files together: root `index.html`, blog pages,
`tools/index.html`, `assets/css/site.css`, and locally served browser modules and
vendor files. Include newly generated directories; reviewing only modifications
to tracked files can miss a new page. Include `package-lock.json` when dependencies
change. Do not commit `node_modules`, `dist`, test results, or browser reports.

After the normal push and Pages deployment finish, check `/tools/` directly and its
navigation links from home and blog. A missing route or old navigation can indicate
missing generated files in the published commit. Compare that commit's public
files before treating it as a browser-cache problem. No deployment workflow change
is required for this page.

`npm run build` does not publish anything. Publishing still requires the normal
commit/push workflow. The `.nojekyll` file keeps GitHub Pages from transforming the
static files. Existing article URLs and homepage anchor aliases are retained.

`documentation/` is omitted from `dist/`; it is still in the repository and may be
served by a repository-root GitHub Pages deployment. Keep it suitable for public
reading. Never place credentials or private employer documents there.
