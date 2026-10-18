import * as THREE from 'three';

/**
 * Arena de prueba: suelo y una cuadrícula de edificios placeholder alrededor
 * de una plaza libre. Devuelve las mallas (para la cámara) y sus cajas XZ (para colisiones).
 */
export function buildArena(scene, { seed = 3, gridRadius = 6, cellSize = 140, clearRadius = 260 } = {}) {
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

  for (let gx = -gridRadius; gx <= gridRadius; gx++) {
    for (let gz = -gridRadius; gz <= gridRadius; gz++) {
      const x = gx * cellSize;
      const z = gz * cellSize;
      if (Math.hypot(x, z) < clearRadius) continue;

      const w = 40 + random() * 40;
      const d = 40 + random() * 40;
      const h = 25 + random() * 75;
      const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      building.position.set(x, h / 2, z);
      building.castShadow = true;
      building.receiveShadow = true;
      scene.add(building);
      meshes.push(building);

      // Franja oscura de ventanas para leer la escala.
      const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, Math.min(h * 0.6, 40), d + 0.4), windows);
      band.position.set(x, h * 0.55, z);
      scene.add(band);

      boxes.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    }
  }

  return { meshes, boxes, sun, bounds: gridRadius * cellSize + cellSize / 2 };
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
