import * as THREE from "../../vendor/three/three.module.min.js";
import { createBoard, parts } from "./board.js";

export function mountViewer(root) {
  const stage = root.querySelector(".board-viewport");
  const canvas = document.createElement("canvas");
  // Probe before constructing the renderer so unsupported devices retain the diagram quietly.
  const context = canvas.getContext("webgl2", {
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  if (!context) throw new Error("3D rendering unavailable");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    context,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 2.15));
  const light = new THREE.DirectionalLight(0xffffff, 2.4);
  light.position.set(-7, 14, 9);
  scene.add(light);
  const model = createBoard();
  scene.add(model.board);
  const camera = new THREE.OrthographicCamera(-7, 7, 5.25, -5.25, 0.1, 100);
  const controller = new AbortController();
  const options = { signal: controller.signal };
  let azimuth = 0.61,
    elevation = 0.88,
    frame = 0,
    disposed = false,
    drag = null;
  const raycaster = new THREE.Raycaster(),
    pointer = new THREE.Vector2();
  const label = root.querySelector("[data-board-description]");
  function render() {
    frame = 0;
    if (disposed || document.hidden) return;
    const width = stage.clientWidth,
      height = stage.clientHeight;
    if (!width || !height) return;
    const aspect = width / height,
      vertical = 5.9;
    camera.left = -vertical * aspect;
    camera.right = vertical * aspect;
    camera.top = vertical;
    camera.bottom = -vertical;
    camera.updateProjectionMatrix();
    camera.position.set(
      18 * Math.sin(azimuth) * Math.cos(elevation),
      18 * Math.sin(elevation),
      18 * Math.cos(azimuth) * Math.cos(elevation),
    );
    camera.lookAt(0, 0, 0);
    renderer.setSize(width, height, false);
    renderer.render(scene, camera);
  }
  function requestRender() {
    if (!frame && !disposed)
      frame = requestAnimationFrame(() => {
        try {
          render();
        } catch {
          fallback();
        }
      });
  }
  function select(id) {
    if (!Object.hasOwn(parts, id)) return;
    root
      .querySelectorAll("[data-board-part]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.boardPart === id),
        ),
      );
    label.textContent = `${parts[id].name}: ${parts[id].description}`;
    for (const [key, group] of Object.entries(model.groups))
      group.traverse((object) => {
        if (object.isMesh) object.scale.setScalar(key === id ? 1.035 : 1);
      });
    root.dataset.selectedPart = id;
    requestRender();
  }
  function changeView(action) {
    if (action === "left") azimuth -= 0.22;
    if (action === "right") azimuth += 0.22;
    if (action === "up") elevation = Math.min(1.45, elevation + 0.13);
    if (action === "down") elevation = Math.max(0.4, elevation - 0.13);
    if (action === "reset") {
      azimuth = 0.61;
      elevation = 0.88;
    }
    requestRender();
  }
  canvas.setAttribute("role", "img");
  canvas.setAttribute(
    "aria-label",
    "Interactive desktop logic board. Arrow keys rotate and tilt; Home resets the view.",
  );
  canvas.tabIndex = 0;
  canvas.addEventListener(
    "keydown",
    (event) => {
      const action = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
        Home: "reset",
      }[event.key];
      if (action) {
        event.preventDefault();
        changeView(action);
      }
    },
    options,
  );
  canvas.addEventListener(
    "pointerdown",
    (event) => {
      if (!event.isPrimary || event.button !== 0) return;
      drag = { x: event.clientX, y: event.clientY, moved: false };
      canvas.setPointerCapture(event.pointerId);
    },
    options,
  );
  canvas.addEventListener(
    "pointermove",
    (event) => {
      if (!drag) return;
      const dx = event.clientX - drag.x,
        dy = event.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
      azimuth -= dx * 0.009;
      elevation = Math.max(0.4, Math.min(1.45, elevation + dy * 0.007));
      drag.x = event.clientX;
      drag.y = event.clientY;
      requestRender();
    },
    options,
  );
  canvas.addEventListener(
    "pointerup",
    (event) => {
      if (drag && !drag.moved) {
        const rect = canvas.getBoundingClientRect();
        pointer.set(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          (-(event.clientY - rect.top) / rect.height) * 2 + 1,
        );
        raycaster.setFromCamera(pointer, camera);
        let object = raycaster.intersectObject(model.board, true)[0]?.object;
        while (object && !object.userData.part) object = object.parent;
        if (object) select(object.userData.part);
      }
      drag = null;
      if (canvas.hasPointerCapture(event.pointerId))
        canvas.releasePointerCapture(event.pointerId);
    },
    options,
  );
  canvas.addEventListener(
    "pointercancel",
    () => {
      drag = null;
    },
    options,
  );
  canvas.addEventListener(
    "lostpointercapture",
    () => {
      drag = null;
    },
    options,
  );
  root
    .querySelectorAll("[data-board-part]")
    .forEach((button) =>
      button.addEventListener(
        "click",
        () => select(button.dataset.boardPart),
        options,
      ),
    );
  root
    .querySelectorAll("[data-board-view]")
    .forEach((button) =>
      button.addEventListener(
        "click",
        () => changeView(button.dataset.boardView),
        options,
      ),
    );
  const resize =
    "ResizeObserver" in window ? new ResizeObserver(requestRender) : null;
  if (resize) resize.observe(stage);
  else window.addEventListener("resize", requestRender, options);
  function dispose() {
    if (disposed) return;
    disposed = true;
    controller.abort();
    resize?.disconnect();
    cancelAnimationFrame(frame);
    model.dispose();
    renderer.dispose();
    if (!context.isContextLost()) renderer.forceContextLoss();
    canvas.remove();
  }
  function fallback() {
    dispose();
    root.dataset.boardState = "fallback";
    root.querySelector(".board-controls").hidden = true;
    label.textContent = "Diagram shown. The interactive view is unavailable.";
  }
  canvas.addEventListener(
    "webglcontextlost",
    (event) => {
      event.preventDefault();
      fallback();
    },
    options,
  );
  window.addEventListener(
    "pagehide",
    (event) => {
      if (!event.persisted) dispose();
    },
    options,
  );
  window.addEventListener("pageshow", requestRender, options);
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else requestRender();
    },
    options,
  );
  try {
    stage.append(canvas);
    render();
    root.dataset.boardState = "ready";
    root.querySelector(".board-controls").hidden = false;
    label.textContent =
      "Drag to rotate, or use the controls. Select a component for its function.";
    return { dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
