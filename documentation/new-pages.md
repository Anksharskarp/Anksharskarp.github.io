# Adding a page in the existing theme

Read [the design system](design-system.md) and
[writing conventions](writing-conventions.md) first. Use the existing renderer,
templates, and CSS rather than copying a generated page. This guide describes
the current generator; the snippets are examples, not additional public routes.

## Choose the existing pattern

| Addition | Starting point |
| --- | --- |
| Blog entry | Add metadata and an article body as described in [content updates](content.md#blog-entries); the generator supplies the title, reading column, contents, and navigation |
| Work or experience entry | Add to the appropriate JSON file; keep the existing card/row renderer |
| Homepage section | Add a partial, compose it in `renderSite()`, and place it in `home.html` source order |
| Standalone reading/list page | Use `page()` with a template and the existing header/section/link patterns |
| Interactive utility | Follow Tools' shared shell, scoped layout, template partials, optional entry module, and separate computation modules |

The homepage order remains hero, About, Selected work, Experience, Blog, Contact,
then the optional terminal. Keep anchors, numbering, navigation, and terminal help
consistent when a section is deliberately moved.

## Compose the page

Add a body template beneath `src/templates/`. The renderer already owns the
document head, skip link, header, `<main id="main" class="page-width">`, and footer.
Do not include those wrappers again. For example, a small list page could use:

```html
<header class="blog-header">
  <a class="back-link" href="../">← Back to portfolio</a>
  <h1>Examples</h1>
  <p>Notes and code from my projects.</p>
</header>

<section class="page-section" aria-labelledby="examples-title">
  <div class="section-heading">
    <h2 id="examples-title">Code</h2>
    <span class="eyebrow">01 / Examples</span>
  </div>
  <p>Descriptions belong beside the code they explain.</p>
  <a class="text-link" href="../blog/">
    Read articles <span aria-hidden="true">↗</span>
  </a>
</section>
```

`.blog-header` is an existing visual class; it does not mark Blog active in the
navigation or load a script. Use it for the same heading treatment. A workspace
may need a more compact header like Tools; keep that layout in its own scoped
module. Do not inherit the large homepage hero just to obtain an h1 style.

Register the route in [`renderSite()`](../scripts/lib/site.mjs) before its return:

```js
output.set(
  "examples/index.html",
  page(root, site, {
    title: `Examples — ${site.name}`,
    description: "Notes and code from my projects.",
    prefix: "../",
    pageClass: "examples-page",
    modulePath: null,
    body: template(root, "examples"),
  }),
);
```

This example expects `src/templates/examples.html` to exist. `template()` resolves
`{{placeholders}}` from an explicit values object. Escape plain content with
`escapeHtml()` from `templates.mjs` before passing it into template HTML; use
`safeHref()` for dynamic URLs. See [architecture](architecture.md#rendering-conventions)
for trusted HTML authoring fields.

| `page()` option | Contract |
| --- | --- |
| `prefix` | Relative path to the site root: `""` for root, `"../"` for a single route directory, `"../../"` for a nested article |
| `pageClass` | Optional body class for scoped page layout; it does not load a stylesheet |
| `modulePath` | Root-relative browser module path, such as `assets/js/tools/workspace.js`; `page()` adds `prefix` |
| `modulePath: null` | No page-specific module; the shared loader still loads |
| `blog`, `article`, `tools` | Existing navigation/metadata/footer switches; use them only for those page types |

Set `modulePath` explicitly for a new standalone page. Its current default is the
homepage's `assets/js/site.js` unless `blog` or `tools` is true. Add a new navigation
destination through the shared header and renderer when needed, including its
current-page state. Reusing Blog's heading CSS does not make a page a blog article.

For larger pages, split the body into named partials, as Tools does with
`equations`, `plot`, `windows`, and `notes`. Keep data separate from markup so
adding another item does not require duplicating an entire page.

## Add only the styles the page needs

Reuse `.pixel-button`, `.pixel-button.secondary`, `.text-link`, `.page-section`,
`.section-heading`, and the shared shell where they fit. Use an anchor for a
destination and a button for an action:

```html
<button type="button" class="pixel-button">Calculate</button>
<button type="button" class="pixel-button secondary">Reset</button>
```

An inert example button is not a finished control: attach its behavior or use the
disabled startup pattern for a calculator. Page-specific CSS goes in a named
module under `assets/css/modules/`, registered once in
[`styleOrder`](../scripts/lib/styles.mjs). Keep its media queries in that module.
Scope overrides to the body class or a component root; do not change global
`h1`, `button`, or `.page-width` rules to fix one page.

Use the existing `--page`, `--panel`, `--ink`, `--muted`, `--line`, `--edge`,
`--shadow`, `--accent`, and `--mono` variables. Standard pages already inherit
`--width: 1160px`. A large workspace can follow Tools' explicit body-scoped
`--width: 1440px` override so its header, main, and footer still align.
Match component padding, type, and states to [the design system](design-system.md).

There is no universal form or panel framework. Tools' input styles require the
`.ode-tool` ancestor, and its window component registers `dialog.ode-window[id]`.
Consult [components](components.md) and [Tools](tools.md#settings-and-result-windows)
before reusing that structure. Share presentation/focus code separately from
the utility's data and calculations; avoid new global listeners for local fields.

## Verify and publish

A new top-level route needs an entry in the copy list in
[`scripts/build.mjs`](../scripts/build.mjs), which currently copies `index.html`,
`blog`, `tools`, assets, and supporting public files. Registering
`examples/index.html` in the renderer generates it at the repository root, but
does not automatically copy an `examples/` directory into `dist/`. A nested route
under an already copied directory does not need another top-level copy entry.

Update the relevant expected route lists and navigation checks in the existing
site tests. Check the new route and its links in `dist/`, not only in the source
tree. Add interaction checks when introducing behavior; content-only additions
should use the existing generation and link validation.

For a new page or functional component, run:

```sh
npm run check
npm run check:generated
git diff --check
git status --short
```

`npm run check` runs the unit tests, a fresh build, and the browser suite. Use
`PLAYWRIGHT_CHANNEL=chrome npm run check` for installed Chrome. Include the new
page in responsive and accessibility coverage, and inspect it beside an existing
page at desktop and phone sizes. Check long content, keyboard focus, reduced
motion, and unavailable optional JavaScript as applicable.

For documentation-only changes, check links, examples, and the diff; a browser
suite is unnecessary when no rendered source changed.

Commit authored sources and generated public files together, including newly
created directories. The existing GitHub Pages setup serves the committed
repository root and does not run the generator. A local build does not publish
anything. See [development and testing](testing.md#github-pages) for deployment.
