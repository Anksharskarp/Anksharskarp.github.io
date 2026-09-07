# William Zhang — Portfolio

A static portfolio with a restrained terminal identity, responsive page navigation,
and a technical blog. Built with HTML, CSS, and progressive-enhancement JavaScript;
no runtime dependencies, remote fonts, or API requests are required.

## Development

```sh
npm run dev
```

Open `http://localhost:4173`. The main page, blog, and résumé links also work with
JavaScript disabled. The optional terminal at the bottom of the homepage adds
navigation commands and command history.

## Build and preview

```sh
npm run build
npm run preview
```

The build copies the site into `dist/`; preview serves it at `http://localhost:4174`.

For GitHub Pages, use **Deploy from a branch → main → /(root)**. The source site is
`index.html`, `blog/`, `assets/`, and `images/`; `.nojekyll` disables Jekyll. `dist/`
is ignored and is only for local preview. Changes have to be committed and pushed
to publish them.

## Content

- `index.html`: selected work, experience, education, tools, contact, and commands.
- `blog/index.html`: article index.
- `blog/keeping-a-call-alive/index.html`: summer 2026 engineering deep dive.
- `assets/documents/william-zhang-resume-august-2026.pdf`: supplied résumé, unmodified.
- `assets/css/site.css`: shared responsive styles and print/reduced-motion support.
- `assets/js/site.js`: section indicators, legacy anchor aliases, optional commands.

To add an article, create `blog/<slug>/index.html` using the existing article as a
template, then link it from the blog index and (if featured) the homepage. The build
copies all of `blog/`, so it needs no per-article configuration.

### September 2026 content reconciliation

The August résumé supplies the May 2028 graduation, 3.93 GPA, updated contact links,
Purdue Stack experience, Finmath, Ecofriend, and technical skills. The owner's
explicit corrections take precedence where the document differs:

- Stesso AI: **Undergraduate AI Researcher**, May–August 2026.
- The Peer Network: **Mobile App Developer Intern**, May–August 2026; over 1,000 users.
- Penn: **Undergraduate Researcher**, April–August 2025.

The supplied PDF retains its original titles and dates; it has not been silently
rewritten. The blog is grounded in the supplied architecture, native-video,
navigation, and data-fetching documents. It uses illustrative pseudocode, avoids
publishing internal project documents, and describes known limitations. The native
video document's older statement that no caller passes a post-session target differs
from the navigation document's later account; the article describes the optional
handoff contract without claiming a particular rollout state.
