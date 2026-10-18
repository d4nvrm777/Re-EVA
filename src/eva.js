import * as THREE from 'three';

// Escala del proyecto: 1 unidad = 1 metro. Un Eva mide unos 40 m.

const PALETTE = {
  armor: 0x7b52c4,
  armorDark: 0x4b3080,
  accent: 0x6fd13a,
  joint: 0x2a2a33,
  eye: 0xffe14d,
};

/** Unidad 01 hecha con primitivas. Devuelve el grupo y los pivotes que se animan. */
export function buildEva01() {
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.2, flatShading: true, ...extra });
  const armor = mat(PALETTE.armor);
  const armorDark = mat(PALETTE.armorDark);
  const accent = mat(PALETTE.accent, { emissive: PALETTE.accent, emissiveIntensity: 0.25 });
  const joint = mat(PALETTE.joint);
  const eye = mat(PALETTE.eye, { emissive: PALETTE.eye, emissiveIntensity: 1 });

  const box = (w, h, d, material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    return mesh;
  };
  const pivot = (parent, x, y, z) => {
    const node = new THREE.Group();
    node.position.set(x, y, z);
    parent.add(node);
    return node;
  };

  const root = new THREE.Group();
  const hips = pivot(root, 0, 19, 0);
  hips.add(box(9, 4, 6, joint, 0, 1));

  // Torso: cintura estrecha, pecho ancho y placas verdes laterales.
  const torso = pivot(hips, 0, 3, 0);
  torso.add(box(7, 6, 5, armorDark, 0, 3));
  torso.add(box(12, 8, 7, armor, 0, 10));
  torso.add(box(1.2, 6, 7.2, accent, -6.2, 10));
  torso.add(box(1.2, 6, 7.2, accent, 6.2, 10));

  // Cabeza con cuerno y mandíbula.
  const neck = pivot(torso, 0, 14.5, 0);
  neck.add(box(2.5, 2, 2.5, joint, 0, 0.5));
  const head = pivot(neck, 0, 2, 0);
  head.add(box(3.6, 4.5, 4.6, armor, 0, 2.2));
  head.add(box(3, 1.4, 3, armorDark, 0, 0.2, -1.4));
  head.add(box(2.6, 0.5, 0.4, eye, 0, 2.6, -2.35));
  const horn = box(0.7, 0.7, 6, accent, 0, 5.2, -2.2);
  horn.rotation.x = 0.5;
  head.add(horn);

  const arms = [-1, 1].map((side) => {
    torso.add(box(4.5, 6, 9, armor, side * 9, 13.5)); // hombrera
    const shoulder = pivot(torso, side * 7.8, 11.5, 0);
    shoulder.add(box(3.5, 11, 3.5, armorDark, 0, -5.5));
    const elbow = pivot(shoulder, 0, -11, 0);
    elbow.add(box(3.2, 10, 3.2, armor, 0, -5));
    elbow.add(box(2.6, 3, 2, joint, 0, -11.5));
    return { shoulder, elbow };
  });

  const legs = [-1, 1].map((side) => {
    const hip = pivot(hips, side * 3.2, -1, 0);
    hip.add(box(4.6, 9.5, 4.6, armorDark, 0, -4.75));
    const knee = pivot(hip, 0, -9.5, 0);
    knee.add(box(4.2, 8, 4.2, armor, 0, -4));
    knee.add(box(1.2, 4, 0.6, accent, 0, -3, -2.2));
    knee.add(box(4.4, 1.5, 7, armorDark, 0, -7.75, -1));
    return { hip, knee };
  });

  return { root, hips, torso, arms, legs };
}

export class Eva {
  constructor(scene) {
    this.model = buildEva01();
    scene.add(this.model.root);

    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.radius = 7;

    this.maxSpeed = 22;
    this.acceleration = 16;
    this.deceleration = 30;
    this.turnSpeed = 2.8; // rad/s: lento a propósito, el Eva tarda en encararse

    this.sidestepSpeed = 60;
    this.sidestepDuration = 0.3;
    this.sidestepCooldown = 0.8;
    this._sidestepLeft = 0;
    this._sidestepCooldownLeft = 0;
    this._sidestepDir = new THREE.Vector3();

    this._walkPhase = 0;
    this.onFootstep = null;
    this.onAttack = null;
  }

  /** moveDir: dirección deseada en el plano XZ (longitud 0..1), ya relativa a cámara. */
  update(dt, moveDir, actions) {
    this._sidestepCooldownLeft = Math.max(this._sidestepCooldownLeft - dt, 0);
    if (actions.sidestep && this._sidestepCooldownLeft === 0) this._startSidestep(moveDir);

    if (this._sidestepLeft > 0) {
      this._sidestepLeft -= dt;
      this.velocity.copy(this._sidestepDir).multiplyScalar(this.sidestepSpeed);
    } else {
      const target = moveDir.clone().multiplyScalar(this.maxSpeed);
      const rate = moveDir.lengthSq() > 0 ? this.acceleration : this.deceleration;
      moveToward(this.velocity, target, rate * dt);
      if (moveDir.lengthSq() > 0.01) {
        const targetYaw = Math.atan2(-moveDir.x, -moveDir.z);
        this.yaw = rotateToward(this.yaw, targetYaw, this.turnSpeed * dt);
      }
    }

    this.position.addScaledVector(this.velocity, dt);

    if (actions.attackLight) this.onAttack?.('light');
    if (actions.attackHeavy) this.onAttack?.('heavy');
  }

  /** Copia el estado al modelo y anima el paso según la velocidad. */
  sync(dt) {
    const { root, hips, torso, arms, legs } = this.model;
    root.position.copy(this.position);
    root.rotation.y = this.yaw;

    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    const stride = Math.min(speed / this.maxSpeed, 1);
    const previous = Math.sin(this._walkPhase);
    this._walkPhase += dt * (1.2 + stride * 2.2) * stride * Math.PI;
    const s = Math.sin(this._walkPhase);
    if (stride > 0.1 && Math.sign(s) !== Math.sign(previous)) this.onFootstep?.(stride);

    legs.forEach(({ hip, knee }, i) => {
      const phase = i === 0 ? s : -s;
      hip.rotation.x = phase * 0.55 * stride;
      knee.rotation.x = Math.max(0, -phase) * 0.9 * stride;
    });
    arms.forEach(({ shoulder, elbow }, i) => {
      const phase = i === 0 ? -s : s;
      shoulder.rotation.x = phase * 0.4 * stride;
      shoulder.rotation.z = (i === 0 ? -1 : 1) * 0.12;
      elbow.rotation.x = -0.25 - 0.2 * stride;
    });
    hips.position.y = 19 - Math.abs(s) * 0.8 * stride;
    torso.rotation.x = -0.12 * stride;
  }

  _startSidestep(moveDir) {
    // Sin dirección pulsada, el paso es hacia atrás respecto a donde mira el Eva.
    if (moveDir.lengthSq() > 0) this._sidestepDir.copy(moveDir).normalize();
    else this._sidestepDir.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    this._sidestepLeft = this.sidestepDuration;
    this._sidestepCooldownLeft = this.sidestepCooldown;
  }
}

function moveToward(current, target, maxDelta) {
  const delta = target.clone().sub(current);
  const distance = delta.length();
  if (distance <= maxDelta || distance === 0) current.copy(target);
  else current.addScaledVector(delta, maxDelta / distance);
}

function rotateToward(from, to, maxDelta) {
  const diff = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return Math.abs(diff) <= maxDelta ? to : from + Math.sign(diff) * maxDelta;
}
