// Entrada unificada: teclado, ratón (pointer lock) y mando (Gamepad API, mapeo estándar).

const DEADZONE = 0.2;

const KEY_ACTIONS = {
  Space: 'sidestep',
  KeyR: 'toggleRetro',
  KeyM: 'toggleMusic',
};

const PAD_ACTIONS = {
  1: 'sidestep',   // B
  2: 'attackLight', // X
  3: 'attackHeavy', // Y
};

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.lookDelta = { x: 0, y: 0 };
    this._padButtons = new Map();

    addEventListener('keydown', (e) => {
      if (!e.repeat && KEY_ACTIONS[e.code]) this.pressed.add(KEY_ACTIONS[e.code]);
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('mousedown', (e) => {
      if (!this.pointerLocked) {
        canvas.requestPointerLock?.();
        return;
      }
      if (e.button === 0) this.pressed.add('attackLight');
      if (e.button === 2) this.pressed.add('attackHeavy');
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('mousemove', (e) => {
      if (!this.pointerLocked) return;
      this.lookDelta.x += e.movementX;
      this.lookDelta.y += e.movementY;
    });
  }

  get pointerLocked() {
    return document.pointerLockElement === this.canvas;
  }

  /** Lee el mando. Llamar una vez por frame antes de consultar el estado. */
  poll() {
    this.pad = [...(navigator.getGamepads?.() ?? [])].find((p) => p && p.connected) ?? null;
    if (!this.pad) return;
    for (const [index, action] of Object.entries(PAD_ACTIONS)) {
      const down = this.pad.buttons[index]?.pressed ?? false;
      if (down && !this._padButtons.get(index)) this.pressed.add(action);
      this._padButtons.set(index, down);
    }
  }

  /** Movimiento en {x, y}: x derecha, y adelante. Magnitud máxima 1. */
  move() {
    let x = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    let y = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    if (this.pad) {
      x += deadzone(this.pad.axes[0]);
      y -= deadzone(this.pad.axes[1]);
    }
    const length = Math.hypot(x, y);
    return length > 1 ? { x: x / length, y: y / length } : { x, y };
  }

  /** Giro de cámara del stick derecho, en [-1, 1]. */
  lookStick() {
    if (!this.pad) return { x: 0, y: 0 };
    return { x: deadzone(this.pad.axes[2]), y: deadzone(this.pad.axes[3]) };
  }

  consumeLookDelta() {
    const delta = { ...this.lookDelta };
    this.lookDelta.x = 0;
    this.lookDelta.y = 0;
    return delta;
  }

  /** True una sola vez por pulsación. */
  justPressed(action) {
    return this.pressed.has(action);
  }

  endFrame() {
    this.pressed.clear();
  }
}

function deadzone(value = 0) {
  return Math.abs(value) < DEADZONE ? 0 : value;
}
