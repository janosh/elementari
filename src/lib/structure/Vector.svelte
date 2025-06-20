<script lang="ts">
  import type { Vec3 } from '$lib'
  import * as math from '$lib/math'
  import { T } from '@threlte/core'
  import { Euler, Quaternion, Vector3 } from 'three'

  interface Props {
    // Starting position of the vector (atom position)
    position: Vec3
    // Vector components [x, y, z] in appropriate units
    vector: Vec3
    // Scale factor for vector visualization
    scale?: number
    // Color of the vector
    color?: string
  }
  let { position, vector, scale = 0.05, color = `#ff6b6b` }: Props = $props()

  // Calculate vector magnitude and normalized direction
  let vector_magnitude = $derived(math.norm(vector))
  let vector_direction = $derived(
    vector_magnitude > 0 ? math.scale(vector, 1 / vector_magnitude) : [0, 1, 0],
  )

  // Scaled vector length
  let vector_length = $derived(vector_magnitude * scale)

  // Arrow dimensions - consistent thickness for all vectors
  let shaft_radius = $derived(0.02)
  let arrow_head_radius = $derived(0.08)
  let arrow_head_length = $derived(Math.min(vector_length * 3.0, 0.2))
  let shaft_length = $derived(Math.max(0, vector_length - arrow_head_length * 0.5))

  // Calculate positions using math helpers
  let shaft_center = $derived(
    math.add(position, math.scale(vector_direction, shaft_length * 0.5)) as Vec3,
  )
  let arrow_head_position = $derived(
    math.add(
      position,
      math.scale(vector_direction, shaft_length + arrow_head_length * 0.5),
    ) as Vec3,
  )

  // Calculate rotation to align Y-axis with vector direction
  let rotation = $derived.by((): Vec3 => {
    const quaternion = new Quaternion().setFromUnitVectors(
      new Vector3(0, 1, 0),
      new Vector3(...vector_direction).normalize(),
    )
    const euler = new Euler().setFromQuaternion(quaternion)
    return euler.toArray().slice(0, 3) as Vec3
  })
</script>

<!-- Vector shaft (cylinder) -->
{#if shaft_length > 0}
  <T.Mesh position={shaft_center} {rotation}>
    <T.CylinderGeometry args={[shaft_radius, shaft_radius, shaft_length, 8]} />
    <T.MeshStandardMaterial {color} />
  </T.Mesh>
{/if}

<!-- Arrow head (cone) -->
<T.Mesh position={arrow_head_position} {rotation}>
  <T.ConeGeometry args={[arrow_head_radius, arrow_head_length, 8]} />
  <T.MeshStandardMaterial {color} />
</T.Mesh>
