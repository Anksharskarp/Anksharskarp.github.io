# William Zhang — Portfolio

A static portfolio with a terminal/voxel theme, neutral colors, technical articles,
an optional Three.js logic-board model, and a [differential-equations utility](tools/).
Existing GitHub Pages URLs are preserved.

**Writing should be clear, direct, and natural. Do not use marketing-style labels
or slogans.** See [writing conventions](documentation/writing-conventions.md).

For future pages, follow the [theme and design system](documentation/design-system.md)
and [page-building guide](documentation/new-pages.md). They document the implemented
palette, typography, spacing, controls, responsive rules, and shared page renderer.

## Develop

```sh
npm ci
npm run dev
```

Open `http://localhost:4173`. Content, templates, and CSS source changes regenerate
the site automatically; refresh the browser to see them. Node.js 24+ and Python 3
are required.

## Edit the source

- Work experience: `content/experience.json`
- Projects: `content/projects.json`
- Blog metadata and articles: `content/posts.json`, `content/posts/`
- Shared site details: `content/site.json`
- Page structure and reusable sections: `src/templates/`
- Browser components: `assets/js/components/`, `assets/js/model/`
- Differential-equations page: `src/templates/tools.html`, `assets/js/tools/`
- Styles: `assets/css/modules/`

Root HTML, blog pages, `tools/index.html`, and `assets/css/site.css` are generated.
Do not edit them directly.

## Build and check

```sh
npm run build
npx playwright install chromium
npm run check
npm run check:generated
```

With an installed Google Chrome, use `PLAYWRIGHT_CHANNEL=chrome npm run check`
instead of downloading Chromium. `npm run preview` serves the build on port 4174.

Deploy from **main → /(root)** as before. GitHub Pages does not run the generator.
Run `npm run generate` or `npm run build`, then commit generated public files with
their sources, including `tools/index.html` and updated navigation in every page.
`npm run check:generated` reports missing or stale output. `dist/` is for preview
and is ignored. No command here publishes the site. Three.js is pinned and served
locally, with a labeled diagram when 3D is unavailable. The portfolio, articles,
and tool notes remain usable without JavaScript; calculations require JavaScript.

See the [documentation index](documentation/README.md) for architecture, content
updates, component development, model behavior, [tools](documentation/tools.md),
testing, and review findings.
