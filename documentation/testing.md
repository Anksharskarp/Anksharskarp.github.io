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
| `npm run build`        | Generate, validate, and copy public assets to `dist/`                       |
| `npm run preview`      | Serve `dist/` on port 4174                                                  |
| `npm test`             | Unit checks for content generation, validation, dates, and commands         |
| `npm run test:browser` | Browser tests against the existing `dist/` build, served on port 4175       |
| `npm run check`        | Unit checks, fresh build, and browser regression suite                      |

The development server watches authored content, templates, and CSS modules. Refresh
the browser after a change. JavaScript source files are served directly. If editing
generator code, restart `npm run dev` so Node imports the changed modules. A content
validation error is printed while the last valid generated pages remain available.

## Verification scope

Unit tests exercise adding content, stable paths and résumé facts, HTML escaping,
unsupported URL schemes, invalid dates, duplicate slugs, conflicting featured posts,
broken IDs/links, and command names that resemble inherited object properties.

Browser tests cover:

- All three pages at seven widths from 320 to 1440 pixels.
- Mobile and legacy anchor navigation, terminal history, and invalid commands.
- Model rotation, reset, selection, keyboard input, context-loss fallback, and
  failure to load the optional module.
- Loading-screen skip/replay, once-per-tab behavior, and reduced motion.
- Article navigation and the fallback diagram with JavaScript disabled.
- WCAG A/AA automated checks on desktop and mobile.
- Résumé availability and the absence of Three.js requests on article pages.

The 3D browser tests enable Chromium's software renderer so they can verify actual
rendering without a physical GPU. This flag is test-only. Real-device GPU behavior,
all assistive technologies, and every mobile browser are not covered by automation.
Review screenshots and perform a short keyboard/touch check when changing layout or
input handling.

## GitHub Pages

The existing deployment mode is preserved: **main branch → repository root**.
Commit source files together with generated root HTML, `assets/css/site.css`, and
`assets/vendor/three/`. Include `package-lock.json` so regeneration uses the same
dependencies. Do not commit `node_modules`, `dist`, test results, or browser reports.

`npm run build` does not publish anything. Publishing still requires the normal
commit/push workflow. The `.nojekyll` file keeps GitHub Pages from transforming the
static files. Existing article URLs and homepage anchor aliases are retained.

`documentation/` is omitted from `dist/`; it is still in the repository and may be
served by a repository-root GitHub Pages deployment. Keep it suitable for public
reading. Never place credentials or private employer documents there.
