import * as THREE from "../../vendor/three/three.module.min.js";

export const parts = Object.freeze({
  cpu: {
    name: "CPU socket",
    description:
      "Processor socket and package. The processor executes instructions and coordinates computation.",
  },
  memory: {
    name: "DIMM slots",
    description:
      "Dual in-line memory module slots. These connect the processor to system RAM.",
  },
  pcie: {
    name: "PCIe x16",
    description:
      "Peripheral Component Interconnect Express expansion slot, shown with sixteen lanes for an add-in card.",
  },
  vrm: {
    name: "VRM",
    description:
      "Voltage regulator module. Power stages, inductors, and capacitors supply regulated voltage to the processor.",
  },
  io: {
    name: "Rear I/O",
    description:
      "Rear input/output connectors, represented by USB and Ethernet ports.",
  },
  power: {
    name: "ATX power",
    description:
      "Twenty-four-pin ATX connector supplying power from the computer’s power supply to the board.",
  },
});

export function createBoard() {
  const board = new THREE.Group();
  const groups = {};
  const materials = [];
  const textures = [];
  const material = (color) => {
    const result = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.88,
      metalness: 0.08,
    });
    materials.push(result);
    return result;
  };
  const pcb = material("#89927f"),
    chip = material("#363e36"),
    socket = material("#bdc3b5");
  const metal = material("#cdd1c7"),
    slot = material("#535d4e"),
    contact = material("#b4b59b");
  const dark = material("#202820");
  function box(parent, size, position, surface) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), surface);
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  }
  function group(id) {
    const result = new THREE.Group();
    result.userData.part = id;
    board.add(result);
    groups[id] = result;
    return result;
  }
  function label(parent, text, x, z, width = 1, y = 0.76) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 96;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#dce2d4";
    context.font = "bold 44px monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, 128, 48);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.push(texture);
    const surface = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    materials.push(surface);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, width * 0.375),
      surface,
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    parent.add(mesh);
  }
  box(board, [9.8, 0.18, 7.4], [0, 0, 0], pcb);
  // Traces are illustrative routed paths, not an electrically complete schematic.
  const paths = [];
  for (let i = 0; i < 13; i++) {
    const x = -2.8 + i * 0.3;
    paths.push([
      new THREE.Vector3(x, 0.101, -0.1),
      new THREE.Vector3(x, 0.101, 1.0 + i * 0.07),
      new THREE.Vector3(3.3, 0.101, 1.0 + i * 0.07),
    ]);
    paths.push([
      new THREE.Vector3(-1 + i * 0.2, 0.102, -1.4),
      new THREE.Vector3(-1 + i * 0.2, 0.102, -2.8 - i * 0.035),
      new THREE.Vector3(3.8, 0.102, -2.8 - i * 0.035),
    ]);
  }
  const traceMaterial = new THREE.LineBasicMaterial({ color: "#b6bfaa" });
  materials.push(traceMaterial);
  paths.forEach((points) =>
    board.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        traceMaterial,
      ),
    ),
  );
  for (const x of [-4.45, 4.45])
    for (const z of [-3.25, 3.25]) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.16, 0.05, 6, 16),
        metal,
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, 0.12, z);
      board.add(ring);
    }
  const cpu = group("cpu");
  box(cpu, [2.55, 0.2, 2.35], [-1.15, 0.23, -0.75], socket);
  box(cpu, [2.08, 0.24, 1.92], [-1.15, 0.44, -0.75], chip);
  box(cpu, [1.55, 0.12, 1.48], [-1.15, 0.62, -0.75], metal);
  box(cpu, [0.08, 0.1, 2.55], [0.24, 0.29, -0.75], metal);
  label(cpu, "CPU", -1.15, -0.75, 1.0, 0.69);
  const memory = group("memory");
  for (const x of [1.1, 1.65, 2.2, 2.75]) {
    box(memory, [0.22, 0.5, 4.5], [x, 0.35, -0.55], slot);
    box(memory, [0.06, 0.025, 4.08], [x, 0.614, -0.55], dark);
    for (const z of [-2.83, 1.73])
      box(memory, [0.32, 0.6, 0.25], [x, 0.4, z], socket);
  }
  label(memory, "DIMM", 1.93, -0.6, 1.45, 0.68);
  const pcie = group("pcie");
  box(pcie, [5.9, 0.36, 0.31], [-0.8, 0.27, 2.05], socket);
  box(pcie, [5.45, 0.028, 0.08], [-0.86, 0.464, 2.05], dark);
  box(pcie, [2.5, 0.3, 0.25], [-2.25, 0.24, 2.93], slot);
  for (let i = 0; i < 38; i++)
    box(pcie, [0.055, 0.03, 0.15], [-3.4 + i * 0.138, 0.465, 1.98], contact);
  label(pcie, "PCIe x16", -0.9, 2.05, 2.0, 0.51);
  const vrm = group("vrm");
  for (let i = 0; i < 6; i++) {
    box(vrm, [0.32, 0.25, 0.32], [-2.75 + i * 0.48, 0.225, -2.75], chip);
    box(vrm, [0.32, 0.45, 0.36], [-2.75 + i * 0.48, 0.325, -2.21], metal);
  }
  for (let i = 0; i < 5; i++) {
    const capacitor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.44, 10),
      metal,
    );
    capacitor.position.set(-3.2, 0.33, -1.8 + i * 0.55);
    vrm.add(capacitor);
  }
  label(vrm, "VRM", -1.55, -2.74, 1.35, 0.38);
  const io = group("io");
  for (let i = 0; i < 3; i++) {
    box(io, [0.85, 0.85, 1.03], [-4.32, 0.52, -2.18 + i * 1.2], metal);
    box(io, [0.025, 0.52, 0.66], [-4.76, 0.5, -2.18 + i * 1.2], dark);
    box(io, [0.05, 0.11, 0.54], [-4.8, 0.48, -2.18 + i * 1.2], slot);
  }
  label(io, "I/O", -4.3, -0.97, 0.75, 0.97);
  const power = group("power");
  box(power, [0.68, 0.65, 2.12], [4.03, 0.43, -1.45], socket);
  for (let row = 0; row < 2; row++)
    for (let i = 0; i < 12; i++)
      box(
        power,
        [0.17, 0.025, 0.1],
        [3.86 + row * 0.3, 0.775, -2.34 + i * 0.162],
        dark,
      );
  label(power, "ATX", 4.03, -1.4, 0.64, 0.8);
  // Smaller controller packages and board headers give scale without implying a specific product.
  box(board, [1.3, 0.23, 1.1], [3.57, 0.22, 2.28], chip);
  for (let i = 0; i < 7; i++)
    box(board, [0.33, 0.16, 0.24], [-2.8 + i * 0.51, 0.18, 0.9], chip);
  for (let i = 0; i < 10; i++)
    box(board, [0.12, 0.27, 0.12], [0.7 + i * 0.24, 0.23, 3.27], contact);
  label(board, "WZ / MB-01", 0.55, 3.05, 2.6, 0.15);
  return {
    board,
    groups,
    dispose() {
      board.traverse((object) => object.geometry?.dispose());
      materials.forEach((surface) => surface.dispose());
      textures.forEach((texture) => texture.dispose());
    },
  };
}
