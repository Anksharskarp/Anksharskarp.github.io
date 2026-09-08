# Adding and editing content

Read [writing conventions](writing-conventions.md) before drafting text. Run
`npm run dev` while editing: it regenerates pages when content, templates, or CSS
modules change. Refresh the browser to see the result.

## Work experience

Add an object to `content/experience.json`. Its position controls display order.

```json
{
  "organization": "Organization name",
  "role": "Role title",
  "dates": "May — Aug 2027",
  "category": "Research",
  "paragraphsHtml": [
    "Describe what you built and the result. Use <strong>emphasis</strong> sparingly."
  ],
  "link": { "href": "blog/article-slug/", "label": "Read article" },
  "details": {
    "summary": "Additional work",
    "bodyHtml": "Supporting details that do not need to be visible by default."
  }
}
```

`link` and `details` are optional. Supply all the other fields. Keep dates and role
classification consistent with the owner's explicit information.

## Project cards

Add an object to `content/projects.json` with `title`, `category`, `dates`,
`description`, `stack` (an array of names), and `link` (`href` and `label`). Card
layout and escaping are handled by `projectCard` in `scripts/lib/components.mjs`.
The larger featured project has a different diagram layout and lives in
`src/templates/partials/featured-project.html`.

## Blog entries

1. Create `content/posts/<slug>.html` containing the article body. Use a lowercase
   slug with words separated by hyphens. Do not include a document head, header,
   footer, or an `h1`; those come from the shared page renderer.
2. Add metadata to `content/posts.json`:

```json
{
  "slug": "article-slug",
  "title": "A descriptive technical title",
  "description": "A direct one-sentence summary for the article card.",
  "deck": "A short introduction displayed beneath the title.",
  "date": "2027-08-20",
  "readMinutes": 6,
  "context": "Project name · Summer 2027",
  "topics": ["React Native", "Testing"],
  "featured": true
}
```

3. Use `<h2 id="section-name">Section title</h2>` in the article. The generator
   derives the contents list from these headings. To use shorter contents labels,
   provide `toc: [{ "id": "section-name", "label": "Short label" }]` in metadata.
   Every referenced ID must exist; broken anchors fail the build.
4. Set `featured: true` on the post you want on the homepage and remove it from the
   previous featured post. The blog index is generated automatically. The URL becomes
   `blog/<slug>/`.
5. Run `npm run check`, then commit the source and generated public files.

`pageTitle` is optional. Article assets can be placed under `assets/`; use
`../../assets/...` links from the article body. The article body is trusted authored
HTML, so escape code samples (`&lt;`, `&gt;`, `&amp;`) and do not add inline scripts or
event handlers. Label code blocks and make horizontally scrollable blocks keyboard
focusable, following the existing article.

Shared contact links and résumé location come from `content/site.json`. Education,
coursework, skills, and the introductory text live in their named partials. Changing
the featured project, a photograph, or a diagram never requires editing every page.

## Tools and examples

The differential-equations utility is generated from `src/templates/tools.html`.
Example names, equations, parameters, bounds, and initial values live in
`assets/js/tools/presets.js`, separate from work and blog content. See
[Tools](tools.md#adding-examples-tools-or-pages) for the preset format and adding a
utility with the shared page shell. Method notes and numerical limits must remain
consistent with the implementation.

After editing a template or navigation, run `npm run generate` and commit generated
HTML and CSS as well as source. `npm run check:generated` detects missing or stale
public files. A source-only commit does not update branch-root GitHub Pages.
