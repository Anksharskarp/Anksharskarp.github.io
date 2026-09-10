# Working on this portfolio

Before adding or changing a page or component, read:

- [Theme and design system](documentation/design-system.md)
- [Writing conventions](documentation/writing-conventions.md)
- [Adding pages](documentation/new-pages.md)

Keep the established neutral terminal/voxel theme. Reuse the shared renderer,
colors, monospace typography, page rails, square controls, and component patterns.
Use clear, direct labels and descriptions without marketing language. The guides
record the current implementation, including responsive and page-specific exceptions.

Edit authored templates, content, CSS modules, and browser modules. Do not edit
generated root HTML or `assets/css/site.css` directly. Keep content and calculations
separate from presentation. Follow [development and testing](documentation/testing.md)
for checks appropriate to the change and include regenerated public files when
rendered sources change. If the shared theme intentionally changes, update its
guide and verify the existing page types together.
