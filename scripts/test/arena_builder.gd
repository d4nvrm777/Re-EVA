extends Node3D
## Genera una cuadrícula de edificios placeholder alrededor del centro,
## dejando libre una plaza para moverse. Solo para la escena de prueba.

@export var seed_value := 3
@export var grid_radius := 6
@export var cell_size := 140.0
@export var clear_radius := 260.0
@export var min_height := 25.0
@export var max_height := 100.0


func _ready() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var material := StandardMaterial3D.new()
	material.albedo_color = Color(0.38, 0.4, 0.43)

	for gx in range(-grid_radius, grid_radius + 1):
		for gz in range(-grid_radius, grid_radius + 1):
			var center := Vector3(gx * cell_size, 0.0, gz * cell_size)
			if center.length() < clear_radius:
				continue
			var size := Vector3(
				rng.randf_range(40.0, 80.0),
				rng.randf_range(min_height, max_height),
				rng.randf_range(40.0, 80.0))
			add_child(_make_building(center, size, material))


func _make_building(center: Vector3, size: Vector3, material: Material) -> StaticBody3D:
	var body := StaticBody3D.new()
	body.position = center + Vector3.UP * size.y * 0.5

	var mesh := BoxMesh.new()
	mesh.size = size
	mesh.material = material
	var mesh_instance := MeshInstance3D.new()
	mesh_instance.mesh = mesh
	body.add_child(mesh_instance)

	var shape := BoxShape3D.new()
	shape.size = size
	var collision := CollisionShape3D.new()
	collision.shape = shape
	body.add_child(collision)
	return body
