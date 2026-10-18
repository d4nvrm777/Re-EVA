# Re:EVA

*Evangelion: Bardiel contenido*. Fangame no comercial de *Neon Genesis Evangelion* hecho en Godot.

## Requisitos

Godot 4.4 (versión estándar, GDScript).

## Abrir y jugar

Abre `project.godot` desde el gestor de proyectos de Godot y pulsa F5. Arranca en la arena de prueba (`scenes/test/test_arena.tscn`).

| Acción | Teclado y ratón | Mando |
| --- | --- | --- |
| Moverse | WASD | Stick izquierdo |
| Cámara | Ratón | Stick derecho |
| Paso lateral | Espacio | B |
| Ataque ligero / pesado (placeholder) | Clic izquierdo / derecho | X / Y |
| Soltar el ratón | Esc | |

## Estructura

```
scenes/   escenas (.tscn): eva/, test/
scripts/  GDScript, por sistema: eva/, camera/, test/
assets/   models/, textures/, audio/, shaders/
tests/    pruebas headless
```

Escala: 1 unidad = 1 metro. Un Eva mide unos 40 m.

## Pruebas

```
godot --headless --path . -s res://tests/smoke_test.gd
```

Carga la arena, mueve al Eva y comprueba que se desplaza, se orienta y no atraviesa el suelo.
