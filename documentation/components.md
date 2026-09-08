# Components

## Shared HTML

The page renderer in `scripts/lib/components.mjs` provides the document head,
navigation, and footer. Repeated project, experience, and blog cards are pure render
functions. They take content objects and return HTML. They do not access the DOM or
make network requests.

Use a partial under `src/templates/partials/` for a larger section with a distinct
layout. Register it in `scripts/lib/site.mjs`, then add its placeholder to
`src/templates/home.html`. Use semantic headings and preserve a single `h1` per page.

## Browser code

`assets/js/site.js` initializes the following modules:

- `components/navigation.js`: active section indicators and legacy anchor aliases.
- `components/terminal.js`: commands, feedback, and a bounded 100-entry history.
- `components/logic-board.js`: optional model loading after the viewer approaches
  the viewport. This module and its renderer are dynamically imported; failures
  do not prevent navigation or terminal initialization.

`assets/js/boot.js` remains a small, separate classic script in the head because it
coordinates first-paint visibility. It owns its modal, timeout, skip, replay,
reduced-motion, and session-storage behavior. The initial intro expires after
1.65 seconds; a fail-safe also releases the page if setup stalls. A late document
load cannot reopen an intro whose initial fail-safe has already expired.

For a new component:

1. Render useful baseline HTML in its template.
2. Add an `initComponent()` module that returns immediately if its root is absent.
3. Initialize required features directly; load optional or expensive features with
   a dynamic import and a fallback.
4. Keep event listeners inside the component's root where practical. Use an
   `AbortController` when a component has a disposal lifecycle.
5. Reserve the component's layout space before loading assets to avoid content shifts.
6. Add tests for actual interactions and failures, not only a function's implementation.

## CSS

Styles are authored in `assets/css/modules/` and concatenated into one public
stylesheet. The order lives in `scripts/lib/styles.mjs`:

1. `base.css`: tokens, reset, navigation, basic typography.
2. `portfolio.css`: homepage sections and terminal console structure.
3. `article.css`: article and blog layout.
4. `theme.css`: established neutral terminal/voxel appearance.
5. `responsive.css`: existing screen-width, reduced-motion, and print rules.
6. `logic-board.css`: the model's isolated layout, controls, and fallback.

The split preserves the original cascade order. Structural styles and theme
adjustments sometimes target the same selector; this is intentional to avoid
changing the approved design during the refactor. For a new component, keep its
styles together in a named module, include its breakpoints there, and register it
once in `styleOrder`. Use existing variables instead of adding unrelated colors.

## Interaction and accessibility

Use native links for navigation and buttons for actions. Provide visible focus
states, accessible names, and keyboard controls. Do not hide essential content
behind JavaScript. Keep the main document scrollable on mobile; the 3D canvas uses
`touch-action: pan-y pinch-zoom` so a vertical swipe or pinch remains a browser action.
Scrollable code blocks and tables must be keyboard focusable. Respect reduced
motion, and avoid continuous decorative animation.
