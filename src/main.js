import * as THREE from 'three';
import { Input } from './input.js';
import { Eva } from './eva.js';
import { ThirdPersonCamera } from './camera.js';
import { buildArena, resolveCollisions } from './arena.js';
import { GameAudio } from './audio.js';

const RETRO_SCALE = 0.25; // modo N64/PS2: un cuarto de la resolución

const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, 1, 0.5, 6000);
const arena = buildArena(scene);
const eva = new Eva(scene);
const cameraRig = new ThirdPersonCamera(camera, arena.meshes);
const input = new Input(canvas);
const audio = new GameAudio();

const hud = {
  root: document.getElementById('hud'),
  speed: document.getElementById('hud-speed'),
  retro: document.getElementById('hud-retro'),
};

let retro = new URLSearchParams(location.search).has('retro');
eva.onFootstep = (strength) => audio.footstep(strength);
eva.onAttack = (kind) => console.debug('ataque', kind);
cameraRig.yaw = eva.yaw;
cameraRig.snapTo(eva.position);

function resize() {
  const ratio = retro ? RETRO_SCALE : Math.min(devicePixelRatio, 2);
  renderer.setPixelRatio(ratio);
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  document.body.classList.toggle('retro', retro);
  hud.retro.hidden = !retro;
}
addEventListener('resize', resize);
resize();

function step(dt) {
  input.poll();
  cameraRig.look(input.consumeLookDelta(), input.lookStick(), dt);

  const move = input.move();
  const { forward, right } = cameraRig.basis();
  const moveDir = right.multiplyScalar(move.x).addScaledVector(forward, move.y);

  eva.update(dt, moveDir, {
    sidestep: input.justPressed('sidestep'),
    attackLight: input.justPressed('attackLight'),
    attackHeavy: input.justPressed('attackHeavy'),
  });
  resolveCollisions(eva.position, eva.velocity, eva.radius, arena);
  eva.sync(dt);
  cameraRig.update(eva.position, dt);

  arena.sun.position.set(eva.position.x + 400, 600, eva.position.z + 250);
  arena.sun.target.position.copy(eva.position);

  if (input.justPressed('toggleRetro')) {
    retro = !retro;
    resize();
  }
  if (input.justPressed('toggleMusic')) audio.toggleMusic();
  input.endFrame();

  hud.speed.textContent = `${Math.round(Math.hypot(eva.velocity.x, eva.velocity.z) * 3.6)} km/h`;
}

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 1 / 20);
  last = now;
  step(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

document.getElementById('start-button').addEventListener('click', () => {
  document.getElementById('start').hidden = true;
  hud.root.hidden = false;
  canvas.requestPointerLock?.();
  audio.start();
});

// Acceso para pruebas automáticas y depuración desde la consola.
window.__reeva = { eva, cameraRig, input, step };
