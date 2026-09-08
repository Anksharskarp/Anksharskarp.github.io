# Interactive logic board

The hero shows MB-01, an illustrative desktop motherboard. Its labels describe CPU,
memory, PCIe expansion, voltage regulation, rear I/O, and 24-pin ATX power. The
geometry is not a manufactured board, an electrical schematic, a particular socket
standard, or a hardware project claimed by the owner. It is not to scale.

## Files

| File                                  | Responsibility                                                       |
| ------------------------------------- | -------------------------------------------------------------------- |
| `src/templates/partials/hero.html`    | Figure, caption, baseline diagram, controls, accessible descriptions |
| `assets/logic-board.svg`              | Labeled diagram for no-JavaScript and unavailable-3D cases           |
| `assets/js/components/logic-board.js` | Lazy loading and initial fallback                                    |
| `assets/js/model/board.js`            | Procedural geometry, materials, component definitions, disposal      |
| `assets/js/model/viewer.js`           | Camera, input, selection, resizing, rendering, and lifecycle         |
| `assets/css/modules/logic-board.css`  | Responsive viewer styles                                             |
| `assets/vendor/three/`                | Generated pinned Three.js modules, version, and MIT license          |

The earlier `assets/voxel-terminal.svg` is retained as an unused asset; the homepage
no longer references it.

## Geometry and controls

The model uses boxes, cylinders, rings, and lines. Components are grouped by their
stable keys (`cpu`, `memory`, `pcie`, `vrm`, `io`, `power`). The viewer can identify
a clicked mesh by walking up to its component group. Component buttons provide the
same selection without requiring precise pointer interaction. Selected geometry is
slightly enlarged; the accompanying text explains its function.

The camera is orthographic. Dragging changes its azimuth and elevation. Arrow
buttons and keyboard arrows rotate and tilt it; Reset and the Home key restore the
initial view. Tilt is bounded so the board remains understandable. There is no
automatic rotation, inertia, wheel capture, or page-scroll hijacking.

Component copy currently appears in three places because they serve different
rendering modes: the visible caption/controls, the scene's `parts` definitions, and
the SVG fallback. When adding a component, update all three, preserving its key and
using accurate language. The component-selection test checks the interactive path.

## Rendering and failure behavior

The browser loads Three.js from local assets only when the homepage viewer nears
the viewport. Blog pages do not load it. The renderer requests a low-power WebGL2
context and caps device pixel ratio at 1.5.

Rendering happens on demand, after interaction, resizing, or returning to the tab.
There is no permanent animation loop. Pending frames are canceled while the document
is hidden. ResizeObserver updates the camera and canvas dimensions; a window resize
listener covers browsers without ResizeObserver.

Unavailable WebGL, a failed import, renderer failure, or context loss leaves the
labeled SVG available. Interactive controls stay hidden until the first successful
render. The fixed-aspect viewport reserves image space before 3D is ready.

Disposal cancels pending frames, disconnects observation and event listeners,
disposes geometries/materials/textures, and releases the renderer's context. A
pagehide that enters the browser's back/forward cache keeps the viewer available;
pageshow requests a fresh frame on return.

The fallback is intentionally simpler than the model. It provides the same basic
component identification without requiring graphics support. A failed renderer is
not retried indefinitely; reloading the page can try again.

## Updating Three.js

The exact npm version is in `package.json` and `package-lock.json`. Update it
explicitly, run `npm run build`, and rerun the model and fallback tests. Generation
copies both `three.module.min.js` and its matching `three.core.min.js`, plus the
license and version file. Do not edit the vendor files or mix versions.

References: [Three.js installation](https://threejs.org/manual/en/installation.html)
and [rendering on demand](https://threejs.org/manual/en/rendering-on-demand.html).
