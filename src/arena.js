import * as THREE from 'three';

/**
 * Arena de prueba: suelo y una cuadrícula de edificios placeholder alrededor
 * de una plaza libre. Devuelve las mallas (para la cámara) y sus cajas XZ (para colisiones).
 */
export function buildArena(scene, { seed = 3, gridRadius = 9, cellSize = 100, clearRadius = 200 } = {}) {
  const random = mulberry32(seed);

  scene.background = new THREE.Color(0xe3b48c);
  scene.fog = new THREE.Fog(0xd9a882, 600, 2400);

  scene.add(new THREE.HemisphereLight(0xffe2c4, 0x5a4a44, 1.6));
  const sun = new THREE.DirectionalLight(0xffd2a8, 2.2);
  sun.position.set(400, 600, 250);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -600, right: 600, top: 600, bottom: -600, near: 10, far: 2000 });
  scene.add(sun, sun.target);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(4000, 4000),
    new THREE.MeshStandardMaterial({ color: 0x55575a, roughness: 0.95 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const material = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.8, flatShading: true });
  const windows = new THREE.MeshStandardMaterial({ color: 0x4a5a6c, roughness: 0.3, metalness: 0.2 });
  const meshes = [];
  const boxes = [];
  const sidewalks = [];

  // Cada celda es una manzana con 1-4 edificios; entre manzanas quedan calles de unos 30 m.
  // Alturas sesgadas hacia abajo: casi todo queda por debajo de los 40 m del Eva.
  const block = cellSize - 30;
  for (let gx = -gridRadius; gx <= gridRadius; gx++) {
    for (let gz = -gridRadius; gz <= gridRadius; gz++) {
      const cx = gx * cellSize;
      const cz = gz * cellSize;
      if (Math.hypot(cx, cz) < clearRadius) continue;
      sidewalks.push([cx, cz]);

      const split = random() < 0.6 ? 2 : 1;
      const lot = block / split;
      for (let ix = 0; ix < split; ix++) {
        for (let iz = 0; iz < split; iz++) {
          const w = lot * (0.6 + random() * 0.3);
          const d = lot * (0.6 + random() * 0.3);
          const h = 10 + random() ** 2.2 * 55;
          const x = cx - block / 2 + lot * (ix + 0.5);
          const z = cz - block / 2 + lot * (iz + 0.5);

          const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
          building.position.set(x, h / 2, z);
          building.castShadow = true;
          building.receiveShadow = true;
          scene.add(building);
          meshes.push(building);

          // Franjas de ventanas cada 3,5 m: una planta humana, la referencia de escala más directa.
          for (let y = 3; y < h - 2; y += 3.5) {
            const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 1.2, d + 0.3), windows);
            band.position.set(x, y, z);
            scene.add(band);
          }

          boxes.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
        }
      }
    }
  }

  addSidewalks(scene, sidewalks, block + 6);
  addStreetProps(scene, { random, boxes, gridRadius, cellSize, propRadius: 650 });

  return { meshes, boxes, sun, bounds: gridRadius * cellSize + cellSize / 2 };
}

function addSidewalks(scene, centers, size) {
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(size, 0.3, size),
    new THREE.MeshStandardMaterial({ color: 0x7c7a76, roughness: 0.9 }),
    centers.length,
  );
  const matrix = new THREE.Matrix4();
  centers.forEach(([x, z], i) => mesh.setMatrixAt(i, matrix.makeTranslation(x, 0.15, z)));
  mesh.receiveShadow = true;
  scene.add(mesh);
}

/**
 * Objetos a escala humana (farolas de 8 m, coches de 4,5 m, árboles de 7 m).
 * No colisionan: el Eva los pisa. Solo están para que se lea su tamaño.
 */
function addStreetProps(scene, { random, boxes, gridRadius, cellSize, propRadius }) {
  const insideBuilding = (x, z) => boxes.some((b) => x > b.minX - 2 && x < b.maxX + 2 && z > b.minZ - 2 && z < b.maxZ + 2);
  const lamps = [];
  const cars = [];
  const trees = [];

  // Calles: líneas a mitad de camino entre manzanas, en ambos ejes.
  for (let i = -gridRadius; i < gridRadius; i++) {
    const line = (i + 0.5) * cellSize;
    for (let t = -propRadius; t <= propRadius; t += 25) {
      for (const [x, z, alongX] of [[t, line, true], [line, t, false]]) {
        if (Math.hypot(x, z) > propRadius) continue;
        for (const side of [-1, 1]) {
          const lx = alongX ? x : x + side * 13;
          const lz = alongX ? z + side * 13 : z;
          if (!insideBuilding(lx, lz)) lamps.push([lx, lz, alongX ? (side > 0 ? Math.PI : 0) : (side > 0 ? -Math.PI / 2 : Math.PI / 2)]);
        }
        if (random() < 0.35) {
          const lane = (random() < 0.5 ? -1 : 1) * 4;
          const cx = alongX ? x + random() * 20 : x + lane;
          const cz = alongX ? z + lane : z + random() * 20;
          if (!insideBuilding(cx, cz)) cars.push([cx, cz, alongX ? Math.PI / 2 : 0]);
        }
      }
    }
  }

  // Arboleda alrededor de la plaza central.
  for (let i = 0; i < 90; i++) {
    const angle = random() * Math.PI * 2;
    const r = 120 + random() * 60;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    if (!insideBuilding(x, z)) trees.push([x, z, random()]);
  }

  const matrix = new THREE.Matrix4();
  const place = (mesh, items, transform) => {
    items.forEach((item, i) => mesh.setMatrixAt(i, transform(item)));
    mesh.castShadow = true;
    scene.add(mesh);
  };
  const instanced = (geometry, color, count) => new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.7 }), count);

  const pole = new THREE.CylinderGeometry(0.15, 0.2, 8, 6).translate(0, 4, 0);
  place(instanced(pole, 0x3a3d42, lamps.length), lamps, ([x, z]) => matrix.makeTranslation(x, 0, z));
  const arm = new THREE.BoxGeometry(0.2, 0.2, 2.5).translate(0, 8, 1.2);
  place(instanced(arm, 0x3a3d42, lamps.length), lamps, ([x, z, yaw]) => matrix.makeRotationY(yaw).setPosition(x, 0, z));

  const carMesh = instanced(new THREE.BoxGeometry(1.8, 1.4, 4.5).translate(0, 0.7, 0), 0xffffff, cars.length);
  const carColors = [0xb03030, 0xe8e8e8, 0x1d1d22, 0x2f5fa8, 0xc9c26b];
  cars.forEach((_, i) => carMesh.setColorAt(i, new THREE.Color(carColors[Math.floor(random() * carColors.length)])));
  place(carMesh, cars, ([x, z, yaw]) => matrix.makeRotationY(yaw).setPosition(x, 0, z));

  const trunk = new THREE.CylinderGeometry(0.25, 0.35, 2.5, 5).translate(0, 1.25, 0);
  place(instanced(trunk, 0x5a4030, trees.length), trees, ([x, z]) => matrix.makeTranslation(x, 0, z));
  const crown = new THREE.ConeGeometry(2.2, 5, 6).translate(0, 4.5, 0);
  place(instanced(crown, 0x3f6b35, trees.length), trees, ([x, z, s]) => matrix.makeScale(1, 0.8 + s * 0.5, 1).setPosition(x, 0, z));
}

/** Empuja un círculo (posición XZ + radio) fuera de las cajas y lo mantiene dentro de los límites. */
export function resolveCollisions(position, velocity, radius, arena) {
  for (const box of arena.boxes) {
    const closestX = Math.max(box.minX, Math.min(position.x, box.maxX));
    const closestZ = Math.max(box.minZ, Math.min(position.z, box.maxZ));
    let dx = position.x - closestX;
    let dz = position.z - closestZ;
    const distanceSq = dx * dx + dz * dz;
    if (distanceSq >= radius * radius) continue;

    let normalX, normalZ, push;
    if (distanceSq > 1e-6) {
      const distance = Math.sqrt(distanceSq);
      normalX = dx / distance;
      normalZ = dz / distance;
      push = radius - distance;
    } else {
      // El centro quedó dentro de la caja: sale por el lado más cercano.
      const exits = [
        [position.x - box.minX, -1, 0],
        [box.maxX - position.x, 1, 0],
        [position.z - box.minZ, 0, -1],
        [box.maxZ - position.z, 0, 1],
      ].sort((a, b) => a[0] - b[0])[0];
      [push, normalX, normalZ] = [exits[0] + radius, exits[1], exits[2]];
    }
    position.x += normalX * push;
    position.z += normalZ * push;
    const into = velocity.x * normalX + velocity.z * normalZ;
    if (into < 0) {
      velocity.x -= into * normalX;
      velocity.z -= into * normalZ;
    }
  }
  const limit = arena.bounds - radius;
  position.x = Math.max(-limit, Math.min(limit, position.x));
  position.z = Math.max(-limit, Math.min(limit, position.z));
}

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
