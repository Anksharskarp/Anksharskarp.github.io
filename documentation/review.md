# Stability review

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
