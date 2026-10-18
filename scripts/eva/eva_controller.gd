class_name EvaController
extends CharacterBody3D
## Control base de un Eva: movimiento pesado relativo a la cámara y paso lateral.
## Escala del proyecto: 1 unidad = 1 metro. Un Eva mide unos 40 m.

signal sidestep_started(direction: Vector3)
signal attack_requested(kind: StringName)

@export_group("Movimiento")
@export var max_speed := 22.0
@export var acceleration := 16.0
@export var deceleration := 30.0
## Velocidad de giro en rad/s. Baja a propósito: el Eva tarda en encararse.
@export var turn_speed := 2.8

@export_group("Paso lateral")
@export var sidestep_speed := 60.0
@export var sidestep_duration := 0.3
@export var sidestep_cooldown := 0.8

var _gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")
var _sidestep_time_left := 0.0
var _sidestep_cooldown_left := 0.0
var _sidestep_direction := Vector3.ZERO


func _physics_process(delta: float) -> void:
	var input := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	var move_direction := _camera_relative(input)

	_sidestep_cooldown_left = maxf(_sidestep_cooldown_left - delta, 0.0)
	if Input.is_action_just_pressed("sidestep") and _sidestep_cooldown_left == 0.0:
		_start_sidestep(move_direction)

	if _sidestep_time_left > 0.0:
		_sidestep_time_left -= delta
		velocity.x = _sidestep_direction.x * sidestep_speed
		velocity.z = _sidestep_direction.z * sidestep_speed
	else:
		_apply_walk(move_direction, delta)

	if not is_on_floor():
		velocity.y -= _gravity * delta
	move_and_slide()

	if Input.is_action_just_pressed("attack_light"):
		attack_requested.emit(&"light")
	if Input.is_action_just_pressed("attack_heavy"):
		attack_requested.emit(&"heavy")


func _apply_walk(move_direction: Vector3, delta: float) -> void:
	var horizontal := Vector3(velocity.x, 0.0, velocity.z)
	var target := move_direction * max_speed
	var rate := acceleration if move_direction != Vector3.ZERO else deceleration
	horizontal = horizontal.move_toward(target, rate * delta)
	velocity.x = horizontal.x
	velocity.z = horizontal.z

	if move_direction.length_squared() > 0.01:
		var target_yaw := atan2(-move_direction.x, -move_direction.z)
		rotation.y = rotate_toward(rotation.y, target_yaw, turn_speed * delta)


func _start_sidestep(move_direction: Vector3) -> void:
	# Sin dirección pulsada, el paso es hacia atrás respecto a donde mira el Eva.
	_sidestep_direction = move_direction.normalized() if move_direction != Vector3.ZERO else global_basis.z
	_sidestep_time_left = sidestep_duration
	_sidestep_cooldown_left = sidestep_cooldown
	sidestep_started.emit(_sidestep_direction)


func _camera_relative(input: Vector2) -> Vector3:
	var camera := get_viewport().get_camera_3d()
	if camera == null:
		return Vector3(input.x, 0.0, input.y)
	var forward := -camera.global_basis.z
	forward.y = 0.0
	forward = forward.normalized()
	var right := Vector3(-forward.z, 0.0, forward.x)
	return right * input.x - forward * input.y
