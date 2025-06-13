// Parsing functions for trajectory data from various formats
import type { AnyStructure, ElementSymbol, Vector } from '$lib'
import { escape_html, is_binary } from '$lib'
import { parse_xyz } from '$lib/io/parse'
import type { Trajectory, TrajectoryFrame } from './index'

// Parse VASP XDATCAR format
export function parse_vasp_xdatcar(content: string): Trajectory {
  const lines = content.trim().split(/\r?\n/)
  let line_idx = 0

  if (lines.length < 10) {
    throw new Error(`XDATCAR file too short`)
  }

  // Parse header
  const title = lines[line_idx++].trim()
  const scale_factor = parseFloat(lines[line_idx++])

  if (isNaN(scale_factor)) {
    throw new Error(`Invalid scale factor in XDATCAR`)
  }

  // Parse lattice vectors (3 lines)
  const lattice_vectors: [Vector, Vector, Vector] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ]
  for (let i = 0; i < 3; i++) {
    const coords = lines[line_idx++].trim().split(/\s+/).map(Number)
    if (coords.length !== 3 || coords.some(isNaN)) {
      throw new Error(`Invalid lattice vector at line ${line_idx}`)
    }
    lattice_vectors[i] = coords.map((x) => x * scale_factor) as Vector
  }

  // Calculate lattice parameters
  const a_vec = lattice_vectors[0]
  const b_vec = lattice_vectors[1]
  const c_vec = lattice_vectors[2]

  const a = Math.sqrt(a_vec[0] ** 2 + a_vec[1] ** 2 + a_vec[2] ** 2)
  const b = Math.sqrt(b_vec[0] ** 2 + b_vec[1] ** 2 + b_vec[2] ** 2)
  const c = Math.sqrt(c_vec[0] ** 2 + c_vec[1] ** 2 + c_vec[2] ** 2)

  const volume = Math.abs(
    a_vec[0] * (b_vec[1] * c_vec[2] - b_vec[2] * c_vec[1]) +
      a_vec[1] * (b_vec[2] * c_vec[0] - b_vec[0] * c_vec[2]) +
      a_vec[2] * (b_vec[0] * c_vec[1] - b_vec[1] * c_vec[0]),
  )

  const alpha =
    (Math.acos(
      (b_vec[0] * c_vec[0] + b_vec[1] * c_vec[1] + b_vec[2] * c_vec[2]) /
        (b * c),
    ) *
      180) /
    Math.PI
  const beta =
    (Math.acos(
      (a_vec[0] * c_vec[0] + a_vec[1] * c_vec[1] + a_vec[2] * c_vec[2]) /
        (a * c),
    ) *
      180) /
    Math.PI
  const gamma =
    (Math.acos(
      (a_vec[0] * b_vec[0] + a_vec[1] * b_vec[1] + a_vec[2] * b_vec[2]) /
        (a * b),
    ) *
      180) /
    Math.PI

  const lattice = {
    matrix: lattice_vectors,
    a,
    b,
    c,
    alpha,
    beta,
    gamma,
    volume,
    pbc: [true, true, true] as [boolean, boolean, boolean],
  }

  // Parse element names and counts
  const element_line = lines[line_idx++].trim().split(/\s+/)
  const count_line = lines[line_idx++].trim().split(/\s+/).map(Number)

  if (element_line.length !== count_line.length || count_line.some(isNaN)) {
    throw new Error(`Element names and counts don't match`)
  }

  // Create element array for sites
  const elements: ElementSymbol[] = []
  for (let i = 0; i < element_line.length; i++) {
    for (let j = 0; j < count_line[i]; j++) {
      elements.push(element_line[i] as ElementSymbol)
    }
  }

  const total_atoms = count_line.reduce((sum, count) => sum + count, 0)
  const frames: TrajectoryFrame[] = []

  // Parse configurations
  while (line_idx < lines.length) {
    // Look for configuration header
    const config_line = lines[line_idx++]
    if (!config_line || !config_line.includes(`Direct configuration=`)) {
      continue
    }

    const config_match = config_line.match(/configuration=\s*(\d+)/)
    const step = config_match ? parseInt(config_match[1]) : frames.length + 1

    // Parse atomic positions
    const sites = []
    for (let atom_idx = 0; atom_idx < total_atoms; atom_idx++) {
      if (line_idx >= lines.length) {
        break
      }

      const pos_line = lines[line_idx++].trim()
      const parts = pos_line.split(/\s+/)

      // Handle different XDATCAR formats:
      // 1. Just coordinates: x y z
      // 2. Coordinates with element: x y z Element
      let coords: number[]
      let element: ElementSymbol

      if (parts.length >= 4 && isNaN(Number(parts[3]))) {
        // Format: x y z Element
        coords = parts.slice(0, 3).map(Number)
        element = parts[3] as ElementSymbol
      } else {
        // Format: x y z (use element from header)
        coords = parts.slice(0, 3).map(Number)
        element = elements[atom_idx]
      }

      if (coords.length < 3 || coords.some(isNaN)) {
        console.warn(`Invalid coordinate line: ${pos_line}`)
        continue
      }

      const abc: Vector = [coords[0], coords[1], coords[2]]

      // Convert fractional to Cartesian coordinates
      const xyz: Vector = [
        abc[0] * lattice_vectors[0][0] +
          abc[1] * lattice_vectors[1][0] +
          abc[2] * lattice_vectors[2][0],
        abc[0] * lattice_vectors[0][1] +
          abc[1] * lattice_vectors[1][1] +
          abc[2] * lattice_vectors[2][1],
        abc[0] * lattice_vectors[0][2] +
          abc[1] * lattice_vectors[1][2] +
          abc[2] * lattice_vectors[2][2],
      ]

      sites.push({
        species: [{ element, occu: 1, oxidation_state: 0 }],
        abc,
        xyz,
        label: `${element}${atom_idx + 1}`,
        properties: {},
      })
    }

    if (sites.length === total_atoms) {
      frames.push({
        structure: {
          sites,
          lattice,
          charge: 0,
        },
        step,
        metadata: { volume: lattice.volume },
      })
    }
  }

  if (frames.length === 0) {
    throw new Error(`No valid configurations found in XDATCAR`)
  }

  return {
    frames,
    metadata: {
      title,
      source_format: `vasp_xdatcar`,
      frame_count: frames.length,
      total_atoms,
      elements: element_line,
      element_counts: count_line,
    },
  }
}

// Detect if content is VASP XDATCAR format
export function is_vasp_xdatcar(content: string, filename?: string): boolean {
  // Check filename patterns (XDATCAR files typically named "XDATCAR" or variants)
  if (filename) {
    const basename = filename.toLowerCase().split(`/`).pop() || ``
    if (basename === `xdatcar` || basename.startsWith(`xdatcar`)) {
      return true
    }
  }

  // Check content patterns - XDATCAR files have a specific structure:
  // 1. Title line
  // 2. Scale factor (single number)
  // 3. Three lattice vectors (3 numbers each)
  // 4. Element names
  // 5. Element counts
  // 6. Configurations starting with "Direct configuration="
  const lines = content.trim().split(/\r?\n/)
  if (lines.length < 10) return false

  // Look for "Direct configuration=" pattern which is unique to XDATCAR
  const has_config_pattern = lines.some((line) =>
    line.includes(`Direct configuration=`),
  )

  // Check if second line is a number (scale factor)
  const second_line_is_number = !isNaN(parseFloat(lines[1]))

  // Check if we have lattice vectors (lines 2-4 should be 3 numbers each)
  let has_lattice_vectors = true
  for (let i = 2; i < 5 && i < lines.length; i++) {
    const coords = lines[i].trim().split(/\s+/)
    if (
      coords.length !== 3 ||
      coords.some((coord) => isNaN(parseFloat(coord)))
    ) {
      has_lattice_vectors = false
      break
    }
  }

  return has_config_pattern && second_line_is_number && has_lattice_vectors
}

// Parse multi-frame XYZ format for trajectories
export function parse_xyz_trajectory(content: string): Trajectory {
  const lines = content.trim().split(/\r?\n/)
  let line_idx = 0
  const frames: TrajectoryFrame[] = []

  while (line_idx < lines.length) {
    // Skip empty lines
    if (!lines[line_idx] || lines[line_idx].trim() === ``) {
      line_idx++
      continue
    }

    // Parse number of atoms (line 1 of each frame)
    const num_atoms_line = lines[line_idx]?.trim()
    if (!num_atoms_line) break

    const num_atoms = parseInt(num_atoms_line, 10)
    if (isNaN(num_atoms) || num_atoms <= 0) {
      line_idx++
      continue
    }

    // Check if we have enough lines for this frame
    if (line_idx + num_atoms + 1 >= lines.length) {
      break
    }

    // Parse comment line (line 2 of each frame) - may contain metadata
    line_idx++
    const comment_line = lines[line_idx] || ``
    const frame_metadata: Record<string, unknown> = {}

    // Try to extract step number from comment
    const step_match = comment_line.match(/step\s*[=:]?\s*(\d+)/i)
    const frame_match = comment_line.match(/frame\s*[=:]?\s*(\d+)/i)
    const energy_match = comment_line.match(
      /energy\s*[=:]?\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/i,
    )

    const step = step_match
      ? parseInt(step_match[1])
      : frame_match
        ? parseInt(frame_match[1])
        : frames.length

    if (energy_match) {
      frame_metadata.energy = parseFloat(energy_match[1])
    }

    // Parse atomic coordinates (lines 3 to N+2)
    const sites = []
    line_idx++

    for (let atom_idx = 0; atom_idx < num_atoms; atom_idx++) {
      if (line_idx >= lines.length) {
        throw new Error(`Incomplete XYZ frame: missing atomic coordinates`)
      }

      const coord_line = lines[line_idx].trim()
      if (!coord_line) {
        throw new Error(`Empty coordinate line in XYZ frame`)
      }

      const parts = coord_line.split(/\s+/)
      if (parts.length < 4) {
        throw new Error(`Invalid coordinate line in XYZ frame: ${coord_line}`)
      }

      const element = parts[0] as ElementSymbol
      const x = parseFloat(parts[1])
      const y = parseFloat(parts[2])
      const z = parseFloat(parts[3])

      if (isNaN(x) || isNaN(y) || isNaN(z)) {
        throw new Error(`Invalid coordinates in XYZ frame: ${coord_line}`)
      }

      // XYZ coordinates are typically in Angstroms (Cartesian)
      const xyz: Vector = [x, y, z]

      // For XYZ files without lattice info, we can't compute fractional coordinates
      // so we set abc to [0, 0, 0] or use xyz directly
      const abc: Vector = [0, 0, 0]

      sites.push({
        species: [{ element, occu: 1, oxidation_state: 0 }],
        abc,
        xyz,
        label: `${element}${atom_idx + 1}`,
        properties: {},
      })

      line_idx++
    }

    // Create structure for this frame
    const structure: AnyStructure = {
      sites,
      charge: 0,
      // XYZ files typically don't contain lattice information
      // If needed, this could be extended to parse extended XYZ format
    }

    frames.push({
      structure,
      step,
      metadata: frame_metadata,
    })
  }

  if (frames.length === 0) {
    throw new Error(`No valid frames found in XYZ trajectory`)
  }

  return {
    frames,
    metadata: {
      source_format: `xyz_trajectory`,
      frame_count: frames.length,
      total_atoms: frames[0]?.structure.sites.length || 0,
    },
  }
}

// Detect if content is multi-frame XYZ trajectory format
export function is_xyz_trajectory(content: string, filename?: string): boolean {
  // Check filename patterns
  if (filename) {
    const basename = filename.toLowerCase().split(`/`).pop() || ``
    if (basename.endsWith(`.xyz`)) {
      // Check if it's a multi-frame XYZ by looking for multiple atom count lines
      const lines = content.trim().split(/\r?\n/)
      let atom_count_lines = 0

      for (let i = 0; i < Math.min(lines.length, 100); i++) {
        const line = lines[i]?.trim()
        if (line && !isNaN(parseInt(line)) && parseInt(line) > 0) {
          // Check if this looks like it could be followed by XYZ data
          const potential_atoms = parseInt(line)
          if (i + potential_atoms + 1 < lines.length) {
            // Check if the line after comment looks like coordinates
            const coord_line = lines[i + 2]?.trim()
            if (coord_line) {
              const parts = coord_line.split(/\s+/)
              if (parts.length >= 4) {
                const first_token = parts[0]
                const coords = parts.slice(1, 4)
                const is_element =
                  isNaN(parseInt(first_token)) && first_token.length <= 3
                const are_coords = coords.every(
                  (coord) => !isNaN(parseFloat(coord)),
                )
                if (is_element && are_coords) {
                  atom_count_lines++
                  if (atom_count_lines >= 2) return true // Multi-frame detected
                }
              }
            }
          }
        }
      }
    }
  }

  return false
}

// Parse pymatgen Trajectory format
export function parse_pymatgen_trajectory(
  obj_data: Record<string, unknown>,
): Trajectory {
  const species = obj_data.species as Array<{ element: ElementSymbol }>
  const coords = obj_data.coords as number[][][] // [frame][atom][xyz]
  const lattice = obj_data.lattice as number[][] // lattice vectors
  const frame_properties = obj_data.frame_properties as Array<
    Record<string, unknown>
  >
  const _site_properties = obj_data.site_properties as Array<
    Record<string, unknown>
  >

  // Calculate lattice parameters from lattice vectors
  const a_vec = lattice[0]
  const b_vec = lattice[1]
  const c_vec = lattice[2]

  const a = Math.sqrt(a_vec[0] ** 2 + a_vec[1] ** 2 + a_vec[2] ** 2)
  const b = Math.sqrt(b_vec[0] ** 2 + b_vec[1] ** 2 + b_vec[2] ** 2)
  const c = Math.sqrt(c_vec[0] ** 2 + c_vec[1] ** 2 + c_vec[2] ** 2)

  // Calculate volume
  const volume = Math.abs(
    a_vec[0] * (b_vec[1] * c_vec[2] - b_vec[2] * c_vec[1]) +
      a_vec[1] * (b_vec[2] * c_vec[0] - b_vec[0] * c_vec[2]) +
      a_vec[2] * (b_vec[0] * c_vec[1] - b_vec[1] * c_vec[0]),
  )

  // Calculate angles
  const dot_ab = a_vec[0] * b_vec[0] + a_vec[1] * b_vec[1] + a_vec[2] * b_vec[2]
  const dot_ac = a_vec[0] * c_vec[0] + a_vec[1] * c_vec[1] + a_vec[2] * c_vec[2]
  const dot_bc = b_vec[0] * c_vec[0] + b_vec[1] * c_vec[1] + b_vec[2] * c_vec[2]

  const gamma = Math.acos(dot_ab / (a * b)) * (180 / Math.PI)
  const beta = Math.acos(dot_ac / (a * c)) * (180 / Math.PI)
  const alpha = Math.acos(dot_bc / (b * c)) * (180 / Math.PI)

  const frames: TrajectoryFrame[] = coords.map((frame_coords, frame_idx) => {
    // Convert coordinates and species to sites
    const sites = frame_coords.map((xyz, site_idx) => ({
      species: [
        {
          element: species[site_idx].element,
          occu: 1,
          oxidation_state: 0,
        },
      ],
      abc: [xyz[0], xyz[1], xyz[2]] as Vector, // pymatgen uses fractional coordinates
      xyz: [
        xyz[0] * a_vec[0] + xyz[1] * b_vec[0] + xyz[2] * c_vec[0],
        xyz[0] * a_vec[1] + xyz[1] * b_vec[1] + xyz[2] * c_vec[1],
        xyz[0] * a_vec[2] + xyz[1] * b_vec[2] + xyz[2] * c_vec[2],
      ] as Vector,
      label: species[site_idx].element,
      properties: {},
    }))

    // Extract frame metadata
    const frame_props = frame_properties[frame_idx] || {}
    const metadata: Record<string, unknown> = { ...frame_props }

    // Process forces if available
    if (frame_props.forces && typeof frame_props.forces === `object`) {
      const forces_obj = frame_props.forces as { data?: number[][] }
      if (forces_obj.data && Array.isArray(forces_obj.data)) {
        metadata.forces = forces_obj.data

        // Calculate max force
        const forces = forces_obj.data as number[][]
        if (forces.length > 0) {
          const force_magnitudes = forces.map((force: number[]) =>
            Math.sqrt(force[0] ** 2 + force[1] ** 2 + force[2] ** 2),
          )
          metadata.force_max = Math.max(...force_magnitudes)
          metadata.force_rms = Math.sqrt(
            force_magnitudes.reduce((sum, f) => sum + f ** 2, 0) /
              force_magnitudes.length,
          )
        }
      }
    }

    // Process stress if available
    if (frame_props.stress && typeof frame_props.stress === `object`) {
      const stress_obj = frame_props.stress as { data?: number[][] }
      if (stress_obj.data && Array.isArray(stress_obj.data)) {
        metadata.stress = stress_obj.data

        // Calculate max stress (von Mises equivalent)
        const stress = stress_obj.data as number[][]
        if (stress.length === 3 && stress[0].length === 3) {
          const s11 = stress[0][0],
            s22 = stress[1][1],
            s33 = stress[2][2]
          const s12 = stress[0][1],
            s13 = stress[0][2],
            s23 = stress[1][2]

          metadata.stress_max = Math.sqrt(
            0.5 * ((s11 - s22) ** 2 + (s22 - s33) ** 2 + (s33 - s11) ** 2) +
              3 * (s12 ** 2 + s13 ** 2 + s23 ** 2),
          )

          // Calculate pressure (negative trace/3)
          metadata.pressure = -(s11 + s22 + s33) / 3
        }
      }
    }

    return {
      structure: {
        sites,
        charge: (obj_data.charge as number) || 0,
        lattice: {
          matrix: lattice as [Vector, Vector, Vector],
          pbc: [true, true, true] as [boolean, boolean, boolean],
          a,
          b,
          c,
          alpha,
          beta,
          gamma,
          volume,
        },
      },
      step: frame_idx,
      metadata,
    }
  })

  return {
    frames,
    metadata: {
      filename: obj_data.filename,
      source_format: `pymatgen_trajectory`,
      species_list: species.map((s) => s.element),
      constant_lattice: obj_data.constant_lattice as boolean,
      frame_count: frames.length,
    },
  }
}

// Parse trajectory from various common formats
export function parse_trajectory_data(
  data: unknown,
  filename?: string,
): Trajectory {
  // Handle string data (raw file content)
  if (typeof data === `string`) {
    const content = data.trim()

    // Try multi-frame XYZ format first (before single XYZ)
    if (is_xyz_trajectory(content, filename)) {
      return parse_xyz_trajectory(content)
    }

    // Try VASP XDATCAR format
    if (is_vasp_xdatcar(content, filename)) {
      return parse_vasp_xdatcar(content)
    }

    // Try single-frame XYZ (convert to trajectory format)
    if (filename?.toLowerCase().endsWith(`.xyz`)) {
      try {
        const single_structure = parse_xyz(content)
        if (single_structure) {
          return {
            frames: [
              {
                structure: {
                  ...single_structure,
                  charge: 0, // Add missing charge property for AnyStructure compatibility
                },
                step: 0,
                metadata: {},
              },
            ],
            metadata: {
              filename,
              source_format: `single_xyz`,
              frame_count: 1,
            },
          }
        }
      } catch (error) {
        console.warn(`Failed to parse as single XYZ:`, error)
      }
    }

    // Try JSON parsing for other formats
    try {
      data = JSON.parse(content)
    } catch {
      throw new Error(
        `Content is not valid JSON, XYZ trajectory, single XYZ, or VASP XDATCAR format`,
      )
    }
  }

  if (!data || typeof data !== `object`) {
    throw new Error(`Invalid trajectory data: must be an object or array`)
  }

  // Handle array format (list of frames)
  if (Array.isArray(data)) {
    const frames: TrajectoryFrame[] = data.map((frame_data, idx) => {
      if (typeof frame_data !== `object` || frame_data === null) {
        throw new Error(`Invalid frame data at index ${idx}`)
      }

      // Try different possible structure keys
      const frame_obj = frame_data as Record<string, unknown>
      let structure: AnyStructure

      if (frame_obj.structure && typeof frame_obj.structure === `object`) {
        structure = frame_obj.structure as AnyStructure
      } else if (frame_obj.sites) {
        // Frame data is itself a structure
        structure = frame_data as AnyStructure
      } else {
        throw new Error(`No structure found in frame ${idx}`)
      }

      return {
        structure,
        step: typeof frame_obj.step === `number` ? frame_obj.step : idx,
        metadata: (frame_obj.metadata as Record<string, unknown>) || frame_obj,
      }
    })

    return {
      frames,
      metadata: {
        filename,
        source_format: `array`,
        frame_count: frames.length,
      },
    }
  }

  // Handle object format
  const obj_data = data as Record<string, unknown>

  // Check if it's a pymatgen Trajectory format
  if (
    obj_data[`@class`] === `Trajectory` &&
    obj_data.species &&
    Array.isArray(obj_data.species) &&
    obj_data.coords &&
    Array.isArray(obj_data.coords) &&
    obj_data.lattice &&
    obj_data.frame_properties &&
    Array.isArray(obj_data.frame_properties)
  ) {
    return parse_pymatgen_trajectory(obj_data)
  }

  // Check if it has a frames property
  if (obj_data.frames && Array.isArray(obj_data.frames)) {
    return {
      frames: obj_data.frames as TrajectoryFrame[],
      metadata: {
        ...(obj_data.metadata as Record<string, unknown>),
        filename,
        source_format: `object_with_frames`,
      },
    }
  }

  // Check if it's a single structure
  if (obj_data.sites) {
    return {
      frames: [
        {
          structure: data as AnyStructure,
          step: 0,
          metadata: {},
        },
      ],
      metadata: {
        filename,
        source_format: `single_structure`,
        frame_count: 1,
      },
    }
  }

  throw new Error(
    `Unrecognized trajectory format: expected array of frames, object with frames property, single structure, or VASP XDATCAR format`,
  )
}

// Helper function to detect unsupported file formats and provide helpful messages
export function get_unsupported_format_message(
  filename: string,
  content: string,
): string | null {
  const lower_filename = filename.toLowerCase()

  // Check for binary ASE trajectory files
  if (lower_filename.endsWith(`.traj`)) {
    return create_format_error(`ASE Binary Trajectory`, filename, [
      {
        tool: `ASE`,
        code: `from ase.io import read, write
# Read ASE trajectory
traj = read('${filename}', index=':')
# Convert to multi-frame XYZ
write('${filename.replace(`.traj`, `.xyz`)}', traj)`,
      },
      {
        tool: `pymatgen`,
        code: `from pymatgen.io.ase import AseAtomsAdaptor
from ase.io import read
import json

# Read ASE trajectory and convert to pymatgen
traj = read('${filename}', index=':')
structures = [AseAtomsAdaptor.get_structure(atoms) for atoms in traj]

# Save as JSON for elementari
trajectory_data = {
    "frames": [{"structure": struct.as_dict(), "step": i} for i, struct in enumerate(structures)]
}
with open('${filename.replace(`.traj`, `.json`)}', 'w') as file:
    json.dump(trajectory_data, file)`,
      },
    ])
  }

  // Check for LAMMPS trajectory files
  if (
    lower_filename.endsWith(`.dump`) ||
    lower_filename.endsWith(`.lammpstrj`)
  ) {
    return create_format_error(`LAMMPS Trajectory`, filename, [
      {
        tool: `pymatgen`,
        code: `from pymatgen.io.lammps.data import LammpsData
# Convert LAMMPS trajectory to supported format
# (specific code depends on LAMMPS trajectory format)`,
      },
    ])
  }

  // Check for NetCDF files (common in MD simulations)
  if (lower_filename.endsWith(`.nc`) || lower_filename.endsWith(`.netcdf`)) {
    return create_format_error(`NetCDF Trajectory`, filename, [
      {
        tool: `MDAnalysis`,
        code: `import MDAnalysis as mda
# Convert NetCDF to XYZ format
u = mda.Universe('topology.pdb', '${filename}')
u.atoms.write('${filename.replace(/\.(nc|netcdf)$/, `.xyz`)}', frames='all')`,
      },
    ])
  }

  // Check for DCD files (CHARMM/NAMD trajectories) # codespell:ignore
  if (lower_filename.endsWith(`.dcd`)) {
    return create_format_error(`DCD Trajectory`, filename, [
      {
        tool: `MDAnalysis`,
        code: `import MDAnalysis as mda
# You'll need a topology file (PSF, PDB, etc.)
u = mda.Universe('topology.psf', '${filename}')
u.atoms.write('${filename.replace(`.dcd`, `.xyz`)}', frames='all')`,
      },
    ])
  }

  // Check if content looks like binary data
  if (content.length > 0 && is_binary(content)) {
    return `
      <div class="unsupported-format">
        <h4>🚫 Unsupported Format: Binary File</h4>
        <p>The file <code>${escape_html(filename)}</code> appears to be a binary file and cannot be parsed as text.</p>
        <div class="code-options">
          <h5>💡 Supported Formats:</h5>
          <ul>
            <li>Multi-frame XYZ files (text-based)</li>
            <li>Pymatgen trajectory JSON</li>
            <li>VASP XDATCAR files</li>
            <li>Compressed versions (.gz) of the above</li>
          </ul>
          <p>Please convert your trajectory to one of these text-based formats.</p>
        </div>
      </div>
    `
  }

  return null
}

// Simplified format error creation
function create_format_error(
  format_name: string,
  filename: string,
  conversions: Array<{ tool: string; code: string }>,
): string {
  const conversion_html = conversions
    .map(
      ({ tool, code }) => `
        <div>
          <strong>${tool}:</strong>
          <pre class="language-python">${code}</pre>
        </div>`,
    )
    .join(``)

  return `
    <div class="unsupported-format">
      <h4>🚫 Unsupported Format: ${escape_html(format_name)}</h4>
      <p>The file <code>${escape_html(filename)}</code> appears to be a ${escape_html(format_name.toLowerCase())} file, which is not directly supported.</p>
      <h5>💡 Conversion Options:</h5>
      <div class="code-options">
        ${conversion_html}
      </div>
    </div>
  `
}
