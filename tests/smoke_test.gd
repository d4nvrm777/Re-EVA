extends SceneTree
## Prueba de humo: carga la arena, empuja al Eva hacia delante y comprueba que se mueve,
## que gira hacia la dirección de movimiento y que no atraviesa el suelo.
## Uso: godot --headless --path . -s res://tests/smoke_test.gd

const FRAMES := 180


func _initialize() -> void:
	var arena: Node = load("res://scenes/test/test_arena.tscn").instantiate()
	root.add_child(arena)
	_run.call_deferred(arena)


func _run(arena: Node) -> void:
	var eva: CharacterBody3D = arena.get_node("Eva")
	await physics_frame
	var start := eva.global_position

	Input.action_press("move_right")
	for i in FRAMES:
		await physics_frame
	Input.action_release("move_right")

	var moved := eva.global_position - start
	var horizontal := Vector2(moved.x, moved.z).length()
	var failures: PackedStringArray = []
	if horizontal < 20.0:
		failures.append("el Eva apenas se movió (%.1f m)" % horizontal)
	if eva.global_position.y < -1.0:
		failures.append("el Eva atravesó el suelo (y=%.1f)" % eva.global_position.y)
	if not eva.is_on_floor():
		failures.append("el Eva no está en el suelo")
	var facing := -eva.global_basis.z
	if facing.dot(moved.normalized()) < 0.9:
		failures.append("el Eva no encara la dirección de movimiento")

	if failures.is_empty():
		print("SMOKE OK: desplazamiento %.1f m, velocidad %.1f m/s" % [horizontal, Vector2(eva.velocity.x, eva.velocity.z).length()])
		quit(0)
	else:
		for f in failures:
			printerr("SMOKE FAIL: ", f)
		quit(1)
