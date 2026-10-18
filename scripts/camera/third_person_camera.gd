class_name ThirdPersonCamera
extends Node3D
## Cámara en tercera persona sobre el hombro. Sigue al objetivo con algo de retardo
## para transmitir peso. Se mueve con el ratón o con el stick derecho.

@export var target: Node3D
## Altura del pivote sobre los pies del objetivo.
@export var pivot_height := 34.0
@export var follow_speed := 6.0
@export var mouse_sensitivity := 0.0025
@export var stick_sensitivity := 2.2
@export_range(-89.0, 0.0) var min_pitch_degrees := -55.0
@export_range(0.0, 89.0) var max_pitch_degrees := 25.0

var _yaw := 0.0
var _pitch := deg_to_rad(-18.0)

@onready var _pitch_pivot: Node3D = $Pitch


func _ready() -> void:
	top_level = true
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	if target:
		_yaw = target.global_rotation.y
		global_position = _target_point()
	_apply_rotation()


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		_yaw -= event.relative.x * mouse_sensitivity
		_pitch -= event.relative.y * mouse_sensitivity
	elif event.is_action_pressed("release_mouse"):
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	elif event is InputEventMouseButton and event.pressed and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
		get_viewport().set_input_as_handled()


func _process(delta: float) -> void:
	var look := Input.get_vector("look_left", "look_right", "look_up", "look_down")
	_yaw -= look.x * stick_sensitivity * delta
	_pitch -= look.y * stick_sensitivity * delta
	_apply_rotation()

	if target:
		var weight := 1.0 - exp(-follow_speed * delta)
		global_position = global_position.lerp(_target_point(), weight)


func _apply_rotation() -> void:
	_pitch = clampf(_pitch, deg_to_rad(min_pitch_degrees), deg_to_rad(max_pitch_degrees))
	rotation = Vector3(0.0, _yaw, 0.0)
	_pitch_pivot.rotation = Vector3(_pitch, 0.0, 0.0)


func _target_point() -> Vector3:
	# Transform interpolado: el objetivo se mueve en física y la cámara en cada frame.
	return target.get_global_transform_interpolated().origin + Vector3.UP * pivot_height
