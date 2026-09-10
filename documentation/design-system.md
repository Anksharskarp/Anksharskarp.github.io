# Theme and design system

This is the visual standard for future pages and components. It records the
approved site as implemented in September 2026: an off-white terminal/voxel theme
with charcoal text, muted green-gray surfaces, monospace type, fine rules, square
controls, and small hard shadows. The existing portfolio, article, and Tools pages
are the reference implementations. Keep their visual language when adding content.

Use this guide with [writing conventions](writing-conventions.md) and
[the new-page guide](new-pages.md). The theme belongs in the layout and controls;
labels should name real actions and subjects. Use “Parameters,” “Read article,”
and “Apply changes,” without slogans or fictional operating-system terminology.

## Source of truth

Edit [CSS modules](../assets/css/modules/), not the generated
[`site.css`](../assets/css/site.css). The cascade is defined in
[`styles.mjs`](../scripts/lib/styles.mjs):

`base → portfolio → article → theme → responsive → logic-board → tools`

[`base.css`](../assets/css/modules/base.css) defines the variables and baseline.
[`theme.css`](../assets/css/modules/theme.css) supplies most of the final desktop
appearance. [`responsive.css`](../assets/css/modules/responsive.css) contains
earlier rules followed by later refinements; among rules of equal specificity,
the last applicable declaration wins.
Do not copy the first matching value without checking the rest of the cascade.
The isolated model and Tools modules include their own responsive rules.
[`boot.css`](../assets/css/boot.css) is loaded separately after the compiled CSS.

Use existing classes and variables before adding styles. A local module may change
layout for its page; it should not redefine the global colors, font, header, or
button appearance. If the shared theme changes, update this guide and inspect all
page types together. Values below describe the effective screen styles; print
styles have their own overrides.

## Color variables

These variables are defined on `:root` in `base.css`. Use their semantic names in
new CSS instead of copying the hex values.

| Variable | Value | Use |
| --- | --- | --- |
| `--page` | `#f4f4f1` | Page background; inset fields and result areas |
| `--panel` | `#fafaf8` | Panels, dialogs, secondary buttons |
| `--ink` | `#262926` | Main text, primary buttons, selected controls |
| `--muted` | `#60655e` | Descriptions, metadata, supporting labels |
| `--accent` | `#454f46` | Focus outlines, links on hover, terminal markers |
| `--line` | `#d7dad2` | Page rails, dividers, internal panel rules |
| `--edge` | `#92988e` | Outlines of controls, windows, and cards |
| `--shadow` | `#d9dcd4` | Opaque offset shadows |
| `--terminal` | `#e9ece5` | Terminal surfaces, panel title bars, hover surfaces |
| `--terminal-muted` | `#60665e` | Terminal title-bar text |

The palette is intentionally restrained. Distinguish state with text, borders,
line styles, and `aria-current`/`aria-pressed` as appropriate. Tools errors use a
dark border and an explicit message. Graphs distinguish coordinates with solid
and dashed lines as well as muted color differences.

Some existing treatments use literal colors. Reuse the component that owns them;
these are specific treatments, not additional general-purpose palette variables:

| Treatment | Existing values |
| --- | --- |
| Current navigation background | `#e7e9e2` |
| Primary / secondary button hover | `#424941` / `#e8ebe3` |
| Terminal strip and its three square marks | `#dfe3d9`; `#7d8578`, `#92998a`, `#b0b6a8` |
| Article code block | `#252a26` background, `#e0e5dc` text |
| Text selection | `#d6e4d2` background, `#202522` text |
| Tools dialog backdrop / shadow | `#26292638` / `#26292626` |

Keep surfaces flat. Existing CSS gradients draw faint grid lines and the center
rule; they are not shaded fills. Keep that distinction when adding a diagram.

The [plot renderer](../assets/js/tools/plot.js) deliberately writes matching color
and font attributes into SVG so downloaded plots retain their appearance. It uses
the page's neutral palette and a shorter `Menlo, Monaco, Consolas, monospace` stack
for 10px axis labels. Account for those explicit attributes when changing shared
colors; the exported SVG cannot rely on the website's CSS being present.

## Typography

The site uses `var(--mono)` throughout:

```css
"SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace
```

These are local system fonts; no web-font download is required. `--sans` exists
in the baseline but is unused by the current CSS. Do not switch a new page to it.
Font metrics can vary by operating system, so allow wrapping and flexible widths.

| Role / existing selector | Effective size and treatment |
| --- | --- |
| Body | `14px`, line-height `1.8` |
| Article body | `14px`, line-height `1.95` |
| Homepage descriptions | Usually `13px`; inherit the component's line-height |
| Section heading, `.section-heading h2` | `24px`, weight `500`, letter-spacing `-1px`; `22px` at ≤760px |
| Article h2 / h3 | `24px` / `19px`; h2 becomes `23px` at ≤760px and `22px` at ≤560px |
| General eyebrow, `.eyebrow` | `11px`, uppercase, weight `400`, letter-spacing `1px`; component overrides may be smaller |
| Navigation | `12px`; `11px` at ≤760px |
| `.text-link` | `12px/1.6`, underlined with a 5px underline offset |
| `.pixel-button` | `12px/1.5`; `11px` at ≤760px |
| Tools label / hint | `12px/1.6` / `11px/1.8` |
| Tools input and select | `13px/1.6`; `16px` at ≤560px |

Page titles have different roles; there is no single global h1 size. The homepage
hero uses `clamp(52px, 6.3vw, 82px)` on wide screens. The blog index uses `54px`,
then `52px` at ≤760px and `44px` at ≤560px. Articles use
`clamp(32px, 4vw, 48px)`, then `36px` at ≤760px and `30px` at ≤560px.
Tools uses `clamp(30px, 3.4vw, 42px)`, then `32px` at ≤560px. All use weight `500`.
Reuse the appropriate page pattern; a utility does not need the homepage's name
scale. The hero's additional responsive sizes remain local to that component.

Keep main explanations at the existing 13–14px reading size. Small 9–10px text
belongs to secondary coordinates, metadata, and the compact PCB caption; it is
not a default for new body copy. Use sentence case for visible headings and actions.
Uppercase is reserved for short secondary labels styled by `.eyebrow`.

## Page rails, spacing, and responsive layout

The shared renderer supplies the header, a single `<main class="page-width">`,
and footer. Their rails align. Do not nest another `.page-width` inside the main.

| Layout property | Current value |
| --- | --- |
| Standard maximum rail width, `--width` | `1160px` |
| Tools maximum rail width | `1440px`, scoped to `body.tools-page` |
| `.page-width` / `.header-inner` above 760px | `min(var(--width), calc(100% - 96px))`; 32px inline padding; 1px inline borders |
| Same rails at ≤760px | `calc(100% - 32px)`; 20px inline padding |
| Header | Sticky at top; 68px minimum height, 64px at ≤760px before its contents determine height |
| Anchor offset | `scroll-padding-top: 112px`; `124px` at ≤760px |
| `.page-section` | 48px top padding |
| `.section-heading` | 22px padding above heading; 28px bottom margin; 1px top rule |
| Typical control groups | 8–14px gaps; allow wrapping |
| Typical panel interiors | 20–30px padding, with existing component-specific adjustments |
| Tools main columns | 300px sidebar, flexible plot, 24px gap; 270px / 20px at ≤1100px |

The CSS does not define a universal spacing-token scale. Match the nearest
existing component instead of inventing variables or imposing a new spacing grid.
Keep related controls closer together than independent panels. Use empty space
and rules to separate sections; a border around every sentence adds clutter.

At ≤760px, portfolio cards, experience rows, About, and the article layout become
single-column. At ≤560px, the header becomes two rows: wordmark and résumé above
the full navigation. Links remain visible. The hero also stacks at that width.
Tools moves its sidebar above the plot at ≤900px and stacks the sidebar panels
at ≤560px. Follow the layout's needs; these are existing component breakpoints,
not names for a universal device system.

Use `minmax(0, 1fr)` and `min-width: 0` for flexible grid children. Wrap long labels,
URLs, and toolbar groups. Keep the document order meaningful as columns collapse.
Do not hide overflow on the whole page to conceal a layout problem. Native inputs
stay readable on phones; shorten labels when necessary instead of shrinking
their text. Plots and the board preserve vertical touch scrolling and pinch zoom.

## Components and states

| Pattern | Reuse and appearance |
| --- | --- |
| Primary action | `.pixel-button`: square 1px edge, ink fill, page-colored text, 40px minimum height, 10px 16px padding, `2px 3px 0 var(--shadow)` |
| Secondary action | `.pixel-button.secondary`: same geometry with panel fill and ink text |
| Text navigation | `.text-link`: visible underline and optional decorative arrow; use an anchor with a real destination |
| Numbered section | `.page-section` + `.section-heading`: fine top rule, small outlined corner squares, CSS `#` prefix, optional ordinal eyebrow |
| Terminal title bar | `.terminal-bar` + `.window-dots`: muted strip, three 7px square marks, concise title/path; marks are `aria-hidden` |
| Project / article cards | Existing `projectCard()` and `postCard()` renderers; 1px edges and 3px hard shadows |
| Featured work | `.featured-work`: terminal surface and 4px hard shadow; reuse its full partial when appropriate |
| Tools panels | `.ode-panel` / `.ode-plot-panel`: panel fill, 1px edge, 3px hard shadow, separate title/body regions |
| Supporting detail | Native `<details>` / `<summary>`; compact explanation stays in document flow |

Primary and secondary buttons move by `(2px, 2px)` when pressed; their shadow
becomes `0 1px 0 var(--shadow)`. Transitions are 100ms. Hover changes the fill;
it does not lift the control. Shared keyboard focus uses a 2px accent outline
with 5px offset. Tools selects use 4px offset, and plot focus is inset by 3px.
Keep focus visible and never use color alone to communicate selection.

Most containers and buttons have square corners and no blurred shadow. Native
range thumbs and checkboxes retain browser behavior; the terminal theme does not
require replacing every native control with a custom drawing. Tools' compact
actions (36px minimum height) and PCB controls (30px) are local treatments, not
the default size for new primary actions.

The `ode-*` form styles are scoped beneath `.ode-tool`. There is no global
`.panel`, `.field`, or dialog framework. For another utility, follow the existing
panel structure and explicitly scoped form styles. Extract a shared component
when multiple pages actually need it, and verify both consumers. Adding an `ode-*`
class alone outside its workspace does not supply the whole behavior.

## Windows and progressive disclosure

Tools keeps equations, initial values, and the main plot in view. Secondary
settings and detailed results open in separately named windows. Apply that
hierarchy to another complex utility instead of putting every field and slider
into a single long form.

The current `.ode-window` uses a native `<dialog>` with a title, Close action,
scrollable body, and optional footer. Standard/wide widths are capped at
540px/700px and `100vw - 40px`; height is capped at `100dvh - 48px`.
At ≤560px, width becomes `100vw - 24px`, height is capped at `100dvh - 32px`,
and footer actions wrap. The title and footer remain reachable while the body
scrolls. The backdrop is translucent charcoal with no blur; the shadow is a
5px hard offset. Background document scrolling is locked while a Tools window
is open. Parameter fields stack at ≤420px.

Use [`initToolWindows()`](../assets/js/components/tool-windows.js) for its existing
open/close and focus behavior. It allows one window at a time and supports Close,
Escape, and backdrop clicks. Preserve draft values on close; state the apply
behavior clearly. Follow [the window contract](tools.md#settings-and-result-windows)
for form ownership, validation, focus return, result rendering, and extension.

## Decoration, motion, and accessible behavior

Use small square marks, straight rules, restrained grids, terminal paths, and
code-like punctuation as accents. Keep ordinary headings and navigation readable
without interpreting the decoration. Do not add saturated accents, pill-shaped
cards, glowing borders, frosted panels, ornamental gradients, or large promotional
headings to a new page. These would change the approved theme.

The loader is the deliberate animated exception: a short, skippable terminal
introduction with stepped voxel/text animation, once per tab. Its normal display
duration is 1.65 seconds; separate fail-safes release the page if setup stalls or
fails. The animated progress is decorative, not a network-load measurement. Reuse it through
the page renderer. Do not add an independent loader for each new feature.

Honor `prefers-reduced-motion`; the shared CSS disables transitions and animations,
the intro is skipped, and the model stays still until interaction. Keep optional
3D lazy, sized before load, and backed by a labeled static diagram. Main content,
navigation, and help remain available when optional enhancement fails.

Use semantic links, buttons, headings, labels, and dialogs. Keep one h1 per page,
stable anchors, a visible keyboard focus state, and meaningful reading order.
Make scrollable code and table regions keyboard reachable. See
[testing](testing.md) for the responsive, interaction, and accessibility checks.

## Review a new page

- Confirm it uses the shared shell, palette, font, rails, and existing controls.
- Compare it with the closest existing page at desktop and phone sizes; check the
  header, title scale, reading width, panel density, and footer alignment together.
- Check 320, 390, 560, 760/768, 900, 1024, and 1440px widths as relevant, including
  either side of any new breakpoint. Check open windows on a short phone screen.
- Inspect wrapping, actual field values, overlapping content, horizontal overflow,
  focus, keyboard dismissal, touch scrolling, and reduced motion.
- Read labels against [writing conventions](writing-conventions.md), then follow
  [new-page verification](new-pages.md#verify-and-publish) for the implementation.
