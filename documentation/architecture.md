# Architecture

This is a static site with a small Node.js generator and optional browser components.
Pages contain their content in HTML. JavaScript adds navigation feedback, terminal
commands, the loading introduction, and an interactive model.

## Source and output

| Location                     | Purpose                                                           |
| ---------------------------- | ----------------------------------------------------------------- |
| `content/site.json`          | Shared page metadata, owner name, contact URLs, and résumé path   |
| `content/experience.json`    | Work and research entries, in display order                       |
| `content/projects.json`      | Project cards, in display order                                   |
| `content/posts.json`         | Article metadata; articles are sorted newest first                |
| `content/posts/<slug>.html`  | Article body, including references                                |
| `src/templates/home.html`    | Homepage section layout                                           |
| `src/templates/partials/`    | Header, footer, hero, featured project, about, contact, terminal  |
| `scripts/lib/components.mjs` | Reusable project, experience, post, and page renderers            |
| `scripts/lib/site.mjs`       | Reads content and composes the page set                           |
| `scripts/lib/templates.mjs`  | Template substitution, HTML escaping, dates, URL checks           |
| `scripts/lib/validate.mjs`   | Generated HTML, links, IDs, and anchor validation                 |
| `assets/css/modules/`        | CSS sources in an explicitly ordered cascade                      |
| `assets/js/components/`      | Independent browser features                                      |
| `assets/js/model/`           | Three.js scene geometry and viewer lifecycle                      |
| `documentation/`             | Maintainer documentation; not copied into the distributable build |

`npm run generate` writes the root `index.html`, blog pages, bundled
`assets/css/site.css`, and the pinned Three.js browser files under `assets/vendor/`.
These generated assets are committed for the existing branch-based GitHub Pages
setup. **Edit the sources, not the generated HTML or bundled stylesheet.**

`npm run build` generates and validates the site, then copies the public files to
`dist/`. Validation occurs before writing the pages. A content error therefore leaves
the last valid pages available during development.

## Rendering conventions

`{{name}}` placeholders in templates require explicit values; an unresolved
placeholder is a build error. Plain JSON text is escaped before insertion into HTML.
Fields named `paragraphsHtml`, `bodyHtml`, and article body files are trusted,
repository-authored HTML. They may contain links and emphasis. They are not an API
for rendering submissions from untrusted users.

Public URLs remain `index.html`, `blog/`, and `blog/keeping-a-call-alive/`. Legacy
homepage anchors and terminal commands still resolve to the current sections.
Old article files are retained when an entry is removed from the index; deleting or
redirecting an old URL must be an intentional content decision.

Three.js is pinned in `package-lock.json` and copied locally with its MIT license.
There are no runtime CDN requests. The homepage loads the optional viewer on demand;
blog pages do not load Three.js. Navigation and the terminal initialize before the
optional model module is requested.
