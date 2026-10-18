// Prueba de humo en navegador headless: carga el juego, empuja al Eva con el teclado
// y comprueba que se mueve, se orienta, no atraviesa edificios y no hay errores en consola.
// Uso: node tests/smoke.mjs [ruta-captura.png]   (requiere Playwright)

import { chromium } from 'playwright';
import { serve } from '../tools/serve.mjs';

const server = await serve(0);
const url = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
// Los 404 son esperables: la pista local de música es opcional y no está en el repo.
page.on('console', (m) => m.type() === 'error' && !m.text().includes('404') && errors.push(m.text()));

/** Avanza la simulación a 60 Hz fijos, independiente de lo rápido que renderice el navegador headless. */
function simulate(page, seconds) {
  return page.evaluate((frames) => {
    for (let i = 0; i < frames; i++) window.__reeva.step(1 / 60);
  }, Math.round(seconds * 60));
}

const failures = [];
try {
  await page.goto(url);
  await page.waitForFunction(() => window.__reeva);
  await page.click('#start-button');

  const start = await page.evaluate(() => window.__reeva.eva.position.toArray());
  await page.keyboard.down('KeyD');
  await simulate(page, 3);
  await page.keyboard.up('KeyD');
  const state = await page.evaluate(() => {
    const { eva, cameraRig } = window.__reeva;
    return { position: eva.position.toArray(), yaw: eva.yaw, cameraYaw: cameraRig.yaw };
  });

  const dx = state.position[0] - start[0];
  const dz = state.position[2] - start[2];
  const moved = Math.hypot(dx, dz);
  if (moved < 20) failures.push(`el Eva apenas se movió (${moved.toFixed(1)} m)`);
  const facing = [-Math.sin(state.yaw), -Math.cos(state.yaw)];
  if ((facing[0] * dx + facing[1] * dz) / moved < 0.9) failures.push('el Eva no encara la dirección de movimiento');

  // Colisión: lanzar al Eva contra un edificio y comprobar que no lo atraviesa.
  // Hay un edificio en x=0, z=-280; sin colisión el Eva acabaría más allá de z=-300.
  await page.evaluate(() => {
    const { eva, cameraRig } = window.__reeva;
    eva.position.set(0, 0, -150);
    eva.velocity.set(0, 0, 0);
    eva.yaw = 0;
    cameraRig.yaw = 0;
  });
  await page.keyboard.down('KeyW');
  await simulate(page, 8);
  await page.keyboard.up('KeyW');
  const afterWall = await page.evaluate(() => window.__reeva.eva.position.toArray());
  if (afterWall[2] < -275) failures.push(`el Eva atravesó los edificios (z=${afterWall[2].toFixed(0)})`);

  if (process.argv[2]) await page.screenshot({ path: process.argv[2] });
  failures.push(...errors.map((e) => `error en consola: ${e}`));

  if (failures.length === 0) console.log(`SMOKE OK: desplazamiento ${moved.toFixed(1)} m, frenado contra edificios en z=${afterWall[2].toFixed(0)}`);
  else failures.forEach((f) => console.error('SMOKE FAIL:', f));
} finally {
  await browser.close();
  server.close();
}
process.exit(failures.length ? 1 : 0);
