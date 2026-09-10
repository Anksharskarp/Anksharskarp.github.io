# Components

Follow the [design system](design-system.md) for visual values and states, and
[the new-page guide](new-pages.md) for a complete renderer/template example.
This document covers component boundaries and behavior.

## Shared HTML

The page renderer in `scripts/lib/components.mjs` provides the document head,
navigation, and footer. Repeated project, experience, and blog cards are pure render
functions. They take content objects and return HTML. They do not access the DOM or
make network requests.

Use a partial under `src/templates/partials/` for a larger section with a distinct
layout. Register it in `scripts/lib/site.mjs`, then add its placeholder to
`src/templates/home.html`. Use semantic headings and preserve a single `h1` per page.

The homepage begins with the hero and About, followed by Selected work, Experience,
Blog, and Contact. Move sections in source order and keep section numbers, shared
navigation, and terminal help aligned; do not use CSS ordering to move them.

For a page with its own workspace, compose partials beneath a named template
directory. Tools uses `src/templates/tools/{equations,plot,windows,notes}.html`.
The renderer's `modulePath` option selects that page's browser entry point, and
`pageClass` adds a body class for scoped layout. Register both through
`scripts/lib/site.mjs`; retain the shared header, footer, theme, and relative asset
prefix. Tools uses `tools-page` to widen its rails without changing other pages.

## Browser code

`assets/js/site.js` initializes the following modules:

- `components/navigation.js`: active section indicators and legacy anchor aliases.
- `components/terminal.js`: commands, feedback, and a bounded 100-entry history.
- `components/logic-board.js`: optional model loading after the viewer approaches
  the viewport. This module and its renderer are dynamically imported; failures
  do not prevent navigation or terminal initialization.

`assets/js/boot.js` remains a small, separate classic script in the head because it
coordinates first-paint visibility. It owns its modal, timeout, skip, replay,
reduced-motion, and session-storage behavior. The intro normally closes 1.65 seconds
after opening; separate fail-safes release the page if setup stalls. A late document
load cannot reopen an intro whose initial fail-safe has already expired.

The Tools page uses a separate `assets/js/tools/workspace.js` entry point, chosen by
the shared renderer. It does not initialize homepage components. Equation parsing,
integration, and analysis remain independent of the browser UI; rendering and
interaction modules consume their results. Follow this boundary for future
utilities. See [Tools](tools.md) for the module map and extension procedure.

`assets/js/components/tool-windows.js` exports `initToolWindows(root)`. It binds
native `dialog.ode-window[id]` elements inside that root and returns `open(id)`,
`close(id)`, `closeAll()`, and `active()`. Buttons use `data-open-window="dialog-id"`
or `data-close-window`. Opening one window closes the previous one. Escape, Close,
and a click outside the dialog's bounds close it; focus returns to its opener or
the root's `data-window-fallback` control. Dialogs provide their own labeled
headings. The module emits bubbling `toolwindowopen` and `toolwindowerror` events
so the workspace can render results or report a failure without coupling the
window component to calculations.

Settings fields inside a dialog use `form="ode-config"` to join the main form.
The workspace reads them through `form.elements`, listens for their input events
on the workspace root, and filters by `event.target.form`. Closing a window keeps
pending edits. Only a successful form submission applies those edits and closes
the window. Keep validation and result state in the workspace module; the window
component only handles presentation and focus. See the
[window extension contract](tools.md#settings-and-result-windows) before adding
another set of controls.

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
7. `tools.css`: the differential-equations workspace and its responsive rules.

The split preserves the original cascade order. Structural styles and theme
adjustments sometimes target the same selector; this is intentional to avoid
changing the approved design during the refactor. For a new component, keep its
styles together in a named module, include its breakpoints there, and register it
once in `styleOrder`. Use existing variables instead of adding unrelated colors.

Tools keeps equations and initial values beside the main plot on wide screens.
Below 900px the sidebar moves above the plot; below 560px its panels stack. Settings
and results stay in dialogs at every size. Dialogs fit the viewport, scroll their
body when necessary, and retain their title and actions. Keep these responsive
rules in `tools.css` with the workspace styles.

## Interaction and accessibility

Use native links for navigation and buttons for actions. Provide visible focus
states, accessible names, and keyboard controls. Keep descriptions and method notes
available without JavaScript. Calculators that require JavaScript should start
with disabled controls and an explanation, then enable controls after successful
initialization. Keep the main document scrollable on mobile; the 3D canvas uses
`touch-action: pan-y pinch-zoom` so a vertical swipe or pinch remains a browser action.
Scrollable code blocks and tables must be keyboard focusable. Respect reduced
motion, and avoid continuous decorative animation.
