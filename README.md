# Re:EVA

*Evangelion: Bardiel contenido*. Fangame no comercial de *Neon Genesis Evangelion* hecho para el navegador (HTML + JavaScript + [three.js](https://threejs.org)).

## Jugar

No hace falta compilar nada: es una web estática.

```
node tools/serve.mjs      # o: npm start
```

Abre http://localhost:8000. Los módulos ES no cargan desde `file://`, así que hay que servir la carpeta (sirve cualquier servidor estático, y también GitHub Pages).

| Acción | Teclado y ratón | Mando |
| --- | --- | --- |
| Moverse | WASD | Stick izquierdo |
| Cámara | Ratón | Stick derecho |
| Paso lateral | Espacio | B |
| Ataque ligero / pesado (placeholder) | Clic izquierdo / derecho | X / Y |
| Modo N64/PS2 (baja resolución) | R (o `?retro` en la URL) | |
| Música on/off | M | |
| Soltar el ratón | Esc | |

## Estructura

```
index.html        página, HUD y pantalla de inicio
src/main.js       arranque y bucle de juego
src/eva.js        modelo de la Unidad 01 (hecho con primitivas) y su control
src/camera.js     cámara en tercera persona sobre el hombro
src/arena.js      arena de prueba y colisiones
src/input.js      teclado, ratón y mando (Gamepad API)
src/audio.js      música procedural y efectos (WebAudio)
src/hud.css       estética NERV
vendor/           three.js 0.170.0 (MIT)
tools/serve.mjs   servidor estático sin dependencias
tests/smoke.mjs   prueba de humo en navegador headless
```

Escala: 1 unidad = 1 metro. Un Eva mide unos 40 m.

## Arte y música

Los modelos y el arte se generan por código. La música es procedural (WebAudio) y suena mientras no haya otra pista.

Si colocas un archivo en `assets/audio/combate.mp3`, el juego lo reproduce en su lugar. Esa carpeta está en `.gitignore`: la música oficial se usa solo en local y no se sube al repo.

## Pruebas

```
npm install && npm test
```

Carga el juego en Chromium headless, mueve al Eva y comprueba que se desplaza, que se orienta, que choca con los edificios y que no hay errores en consola.
