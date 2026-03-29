## William Zhang Portfolio

macOS style Terminal portfolio.

### Tools

- HTML, CSS, JavaScript

### Local Development

Start a local server:

```bash
npm run dev
```

Then open `http://localhost:4173` (local testing only).

### Build

Create a distributable static build:

```bash
npm run build
```

Output is generated in `dist/`.

Preview built output:

```bash
npm run preview
```

### Notes for Deploying on GitHub Pages

- `index.html` is the site entrypoint.
- `.nojekyll` disables Jekyll processing so files are served as-is.
- For the user site repo `Anksharskarp.github.io`, set Pages to `Deploy from a branch` -> `main` -> `/(root)`.
- Commit and push the root files (`index.html`, `assets/`, `images/`, `.nojekyll`).
- `dist/` is only for local build preview and should not be used as the Pages source.
