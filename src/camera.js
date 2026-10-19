import * as THREE from 'three';

/** Cámara en tercera persona sobre el hombro. Sigue al objetivo con retardo y no atraviesa edificios. */
export class ThirdPersonCamera {
  constructor(camera, obstacles) {
    this.camera = camera;
    this.obstacles = obstacles;

    this.pivotHeight = 30;
    this.armLength = 85;
    this.shoulderOffset = 14;
    this.followSpeed = 6;
    this.mouseSensitivity = 0.0025;
    this.stickSensitivity = 2.2;
    this.minPitch = THREE.MathUtils.degToRad(-55);
    this.maxPitch = THREE.MathUtils.degToRad(25);

    this.yaw = 0;
    this.pitch = THREE.MathUtils.degToRad(-18);
    this.pivot = new THREE.Vector3();
    this._raycaster = new THREE.Raycaster();
    this._shake = 0;
    this._time = 0;
  }

  /** Sacudida al pisar o recibir golpes; amount en 0..1, se va apagando sola. */
  shake(amount) {
    this._shake = Math.min(this._shake + amount, 1);
  }

  snapTo(position) {
    this.pivot.copy(position).y += this.pivotHeight;
  }

  look(mouseDelta, stick, dt) {
    this.yaw -= mouseDelta.x * this.mouseSensitivity + stick.x * this.stickSensitivity * dt;
    this.pitch -= mouseDelta.y * this.mouseSensitivity + stick.y * this.stickSensitivity * dt;
    this.pitch = THREE.MathUtils.clamp(this.pitch, this.minPitch, this.maxPitch);
  }

  /** Vectores de avance y derecha en el plano XZ según el yaw de la cámara. */
  basis() {
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    return { forward, right };
  }

  update(targetPosition, dt) {
    const goal = targetPosition.clone();
    goal.y += this.pivotHeight;
    this.pivot.lerp(goal, 1 - Math.exp(-this.followSpeed * dt));

    const rotation = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    const offset = new THREE.Vector3(this.shoulderOffset, 0, this.armLength).applyEuler(rotation);
    const distance = offset.length();
    const direction = offset.clone().normalize();

    this._raycaster.set(this.pivot, direction);
    this._raycaster.far = distance;
    const hit = this._raycaster.intersectObjects(this.obstacles, false)[0];
    const length = hit ? Math.max(hit.distance - 2, 5) : distance;

    this.camera.position.copy(this.pivot).addScaledVector(direction, length);
    this.camera.rotation.copy(rotation);

    this._time += dt;
    if (this._shake > 0.001) {
      this.camera.position.y += Math.sin(this._time * 38) * this._shake * 1.6;
      this.camera.rotation.z += Math.sin(this._time * 27) * this._shake * 0.01;
      this._shake *= Math.exp(-6 * dt);
    }
  }
}
