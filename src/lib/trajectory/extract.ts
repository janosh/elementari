// Data extraction functions for trajectory analysis and plotting
import type {
  Trajectory,
  TrajectoryDataExtractor,
  TrajectoryFrame,
} from './index'

// Common data extractor that extracts energy and structural properties
export const energy_data_extractor: TrajectoryDataExtractor = (
  frame: TrajectoryFrame,
): Record<string, number> => {
  const data: Record<string, number> = {
    Step: frame.step,
  }

  if (frame.metadata) {
    // Extract energy-related properties
    const energy_fields = [
      `energy`,
      `energy_per_atom`,
      `potential_energy`,
      `kinetic_energy`,
      `total_energy`,
    ]

    for (const field of energy_fields) {
      if (
        field in frame.metadata &&
        typeof frame.metadata[field] === `number`
      ) {
        data[field] = frame.metadata[field] as number
      }
    }
  }

  return data
}

// Data extractor for forces and stresses
export const force_stress_data_extractor: TrajectoryDataExtractor = (
  frame: TrajectoryFrame,
): Record<string, number> => {
  const data: Record<string, number> = {
    Step: frame.step,
  }

  if (frame.metadata) {
    // Calculate force properties from forces array if available (preferred)
    if (frame.metadata.forces && Array.isArray(frame.metadata.forces)) {
      const forces = frame.metadata.forces as number[][]
      if (forces.length > 0) {
        const force_magnitudes = forces.map((force) =>
          Math.sqrt(force[0] ** 2 + force[1] ** 2 + force[2] ** 2),
        )
        data.force_max = Math.max(...force_magnitudes)
        data.force_norm = Math.sqrt(
          force_magnitudes.reduce((sum, f) => sum + f ** 2, 0) /
            force_magnitudes.length,
        )
      }
    } else {
      // Fallback to metadata values if forces array not available
      if (
        frame.metadata.force_max &&
        typeof frame.metadata.force_max === `number`
      ) {
        data.force_max = frame.metadata.force_max
      }
      // Prefer force_norm if available, fall back to force_rms
      if (
        frame.metadata.force_norm &&
        typeof frame.metadata.force_norm === `number`
      ) {
        data.force_norm = frame.metadata.force_norm
      } else if (
        frame.metadata.force_rms &&
        typeof frame.metadata.force_rms === `number`
      ) {
        data.force_norm = frame.metadata.force_rms // Use force_rms as fallback
      }
    }

    // Extract other stress and pressure properties (no duplicates expected)
    const other_stress_fields = [`stress_max`, `stress_trace`, `pressure`]
    for (const field of other_stress_fields) {
      if (
        field in frame.metadata &&
        typeof frame.metadata[field] === `number`
      ) {
        data[field] = frame.metadata[field] as number
      }
    }
  }

  return data
}

// Data extractor for structural properties
export const structural_data_extractor: TrajectoryDataExtractor = (
  frame: TrajectoryFrame,
): Record<string, number> => {
  const data: Record<string, number> = {
    Step: frame.step,
  }

  // Extract lattice properties (preferred source for volume)
  if (`lattice` in frame.structure) {
    const lattice = frame.structure.lattice
    data.volume = lattice.volume // Use consistent lowercase naming
    data.a = lattice.a
    data.b = lattice.b
    data.c = lattice.c
    data.alpha = lattice.alpha
    data.beta = lattice.beta
    data.gamma = lattice.gamma
  }

  if (frame.metadata) {
    // Extract other structural properties, avoiding volume duplicate
    const structural_fields = [`density`, `temperature`]

    for (const field of structural_fields) {
      if (
        field in frame.metadata &&
        typeof frame.metadata[field] === `number`
      ) {
        data[field] = frame.metadata[field] as number
      }
    }

    // Only use metadata volume if lattice volume is not available
    if (
      !data.volume &&
      frame.metadata.volume &&
      typeof frame.metadata.volume === `number`
    ) {
      data.volume = frame.metadata.volume
    }

    // Note: pressure is handled by force_stress_data_extractor to avoid duplication
  }

  return data
}

// Helper function to check if a property varies across trajectory frames
function property_varies(
  trajectory: Trajectory,
  property_key: string,
  tolerance = 1e-10,
): boolean {
  if (trajectory.frames.length <= 1) return false

  const values: number[] = []
  for (const frame of trajectory.frames) {
    // Check both direct structure properties and metadata
    let value: number | undefined

    if (`lattice` in frame.structure) {
      const lattice = frame.structure.lattice as {
        [key: string]: unknown
        volume: number
        a: number
        b: number
        c: number
        alpha: number
        beta: number
        gamma: number
      }
      if (
        property_key in lattice &&
        typeof lattice[property_key] === `number`
      ) {
        value = lattice[property_key] as number
      }
    }

    if (
      value === undefined &&
      frame.metadata &&
      property_key in frame.metadata
    ) {
      const metadata_value = frame.metadata[property_key]
      if (typeof metadata_value === `number`) {
        value = metadata_value
      }
    }

    if (value !== undefined) {
      values.push(value)
    }
  }

  if (values.length <= 1) return false

  const first_value = values[0]
  return values.some((value) => Math.abs(value - first_value) > tolerance)
}

// Combined data extractor that extracts all common properties
export const full_data_extractor: TrajectoryDataExtractor = (
  frame: TrajectoryFrame,
  trajectory: Trajectory,
): Record<string, number> => {
  const base_data = {
    ...energy_data_extractor(frame, trajectory),
    ...force_stress_data_extractor(frame, trajectory),
    ...structural_data_extractor(frame, trajectory),
  }

  // Check if lattice parameters vary and conditionally include them
  const lattice_params = [`a`, `b`, `c`, `alpha`, `beta`, `gamma`]
  const varying_lattice_params = lattice_params.filter((param) =>
    property_varies(trajectory, param),
  )

  // If lattice parameters don't vary, mark them for conditional visibility
  // (This doesn't remove them from data, but helps with default visibility logic)
  const result = { ...base_data }

  // Add metadata to help identify non-varying properties
  if (varying_lattice_params.length === 0) {
    // Add a special marker that can be used by plotting components
    // to identify that lattice parameters are constant
    result._constant_lattice_params = 1
  }

  return result
}
