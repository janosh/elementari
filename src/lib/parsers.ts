import { elem_symbols, type ElementSymbol, type Site, type Vector } from '$lib'

// Import matrix functions for proper fractional coordinate calculation
function matrix_inverse_3x3(
  matrix: [Vector, Vector, Vector],
): [Vector, Vector, Vector] {
  /** Calculate the inverse of a 3x3 matrix */
  const [[a, b, c], [d, e, f], [g, h, i]] = matrix

  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)

  if (Math.abs(det) < 1e-10) {
    throw `Matrix is singular and cannot be inverted`
  }

  const inv_det = 1 / det

  return [
    [
      (e * i - f * h) * inv_det,
      (c * h - b * i) * inv_det,
      (b * f - c * e) * inv_det,
    ],
    [
      (f * g - d * i) * inv_det,
      (a * i - c * g) * inv_det,
      (c * d - a * f) * inv_det,
    ],
    [
      (d * h - e * g) * inv_det,
      (b * g - a * h) * inv_det,
      (a * e - b * d) * inv_det,
    ],
  ]
}

function matrix_vector_multiply(
  matrix: [Vector, Vector, Vector],
  vector: Vector,
): Vector {
  /** Multiply a 3x3 matrix by a 3D vector */
  return [
    matrix[0][0] * vector[0] +
      matrix[0][1] * vector[1] +
      matrix[0][2] * vector[2],
    matrix[1][0] * vector[0] +
      matrix[1][1] * vector[1] +
      matrix[1][2] * vector[2],
    matrix[2][0] * vector[0] +
      matrix[2][1] * vector[1] +
      matrix[2][2] * vector[2],
  ]
}

function transpose_matrix(
  matrix: [Vector, Vector, Vector],
): [Vector, Vector, Vector] {
  /** Transpose a 3x3 matrix */
  return [
    [matrix[0][0], matrix[1][0], matrix[2][0]],
    [matrix[0][1], matrix[1][1], matrix[2][1]],
    [matrix[0][2], matrix[1][2], matrix[2][2]],
  ]
}

export interface ParsedStructure {
  sites: Site[]
  lattice?: {
    matrix: [Vector, Vector, Vector]
    a: number
    b: number
    c: number
    alpha: number
    beta: number
    gamma: number
    volume: number
  }
}

// Normalize scientific notation in coordinate strings
// Handles eEdD and *^ notation variants
function normalize_scientific_notation(str: string): string {
  return str
    .toLowerCase()
    .replace(/d/g, `e`) // Replace D/d with e
    .replace(/\*\^/g, `e`) // Replace *^ with e
}

// Parse a coordinate value that might be in various scientific notation formats
function parse_coordinate(str: string): number {
  const normalized = normalize_scientific_notation(str.trim())
  const value = parseFloat(normalized)
  if (isNaN(value)) {
    throw new Error(`Invalid coordinate value: ${str}`)
  }
  return value
}

// Parse coordinates from a line, handling malformed formatting
function parse_coordinate_line(line: string): number[] {
  let tokens = line.trim().split(/\s+/)

  // Handle malformed coordinates like "1.0-2.0-3.0" (missing spaces)
  if (tokens.length < 3) {
    const new_tokens: string[] = []
    for (const token of tokens) {
      // Split on minus signs that aren't at the start or after 'e'/'E'
      const parts = token
        .split(/(?<!^|[eE])-/)
        .filter((part) => part.length > 0)
      if (parts.length > 1) {
        new_tokens.push(parts[0])
        for (let i = 1; i < parts.length; i++) {
          new_tokens.push(`-` + parts[i])
        }
      } else {
        new_tokens.push(token)
      }
    }
    tokens = new_tokens
  }

  if (tokens.length < 3) {
    throw new Error(`Insufficient coordinates in line: ${line}`)
  }

  return tokens.slice(0, 3).map(parse_coordinate)
}

/**
 * Calculate lattice parameters from lattice vectors
 */
function calculate_lattice_parameters(matrix: [Vector, Vector, Vector]) {
  const [a_vec, b_vec, c_vec] = matrix

  const a = Math.sqrt(a_vec[0] ** 2 + a_vec[1] ** 2 + a_vec[2] ** 2)
  const b = Math.sqrt(b_vec[0] ** 2 + b_vec[1] ** 2 + b_vec[2] ** 2)
  const c = Math.sqrt(c_vec[0] ** 2 + c_vec[1] ** 2 + c_vec[2] ** 2)

  // Calculate angles in degrees
  const dot_ab = a_vec[0] * b_vec[0] + a_vec[1] * b_vec[1] + a_vec[2] * b_vec[2]
  const dot_ac = a_vec[0] * c_vec[0] + a_vec[1] * c_vec[1] + a_vec[2] * c_vec[2]
  const dot_bc = b_vec[0] * c_vec[0] + b_vec[1] * c_vec[1] + b_vec[2] * c_vec[2]

  const gamma = Math.acos(dot_ab / (a * b)) * (180 / Math.PI) // angle between a and b
  const beta = Math.acos(dot_ac / (a * c)) * (180 / Math.PI) // angle between a and c
  const alpha = Math.acos(dot_bc / (b * c)) * (180 / Math.PI) // angle between b and c

  // Calculate volume using scalar triple product
  const volume = Math.abs(
    a_vec[0] * (b_vec[1] * c_vec[2] - b_vec[2] * c_vec[1]) +
      a_vec[1] * (b_vec[2] * c_vec[0] - b_vec[0] * c_vec[2]) +
      a_vec[2] * (b_vec[0] * c_vec[1] - b_vec[1] * c_vec[0]),
  )

  return { a, b, c, alpha, beta, gamma, volume }
}

/**
 * Validate element symbol and provide fallback
 */
function validate_element_symbol(symbol: string, index: number): ElementSymbol {
  // Clean symbol (remove suffixes like _pv, /hash)
  const clean_symbol = symbol.split(/[_/]/)[0]

  if (elem_symbols.includes(clean_symbol as ElementSymbol)) {
    return clean_symbol as ElementSymbol
  }

  // Fallback to default elements by atomic number
  const fallback_elements = [
    `H`,
    `He`,
    `Li`,
    `Be`,
    `B`,
    `C`,
    `N`,
    `O`,
    `F`,
    `Ne`,
  ]
  const fallback = fallback_elements[index % fallback_elements.length]
  console.warn(
    `Invalid element symbol '${symbol}', using fallback '${fallback}'`,
  )
  return fallback as ElementSymbol
}

// Parse VASP POSCAR file format
export function parse_poscar(content: string): ParsedStructure | null {
  try {
    const lines = content.replace(/^\s+/, ``).split(/\r?\n/)

    if (lines.length < 8) {
      console.error(`POSCAR file too short`)
      return null
    }

    // Parse scaling factor (line 2)
    let scale_factor = parseFloat(lines[1])
    if (isNaN(scale_factor)) {
      console.error(`Invalid scaling factor in POSCAR`)
      return null
    }

    // Parse lattice vectors (lines 3-5)
    const parse_vector = (line: string, line_num: number): Vector => {
      const coords = line.trim().split(/\s+/).map(parse_coordinate)
      if (coords.length !== 3) {
        throw `Invalid lattice vector on line ${line_num}: expected 3 coordinates, got ${coords.length}`
      }
      return coords as Vector
    }

    const lattice_vecs: [Vector, Vector, Vector] = [
      parse_vector(lines[2], 3),
      parse_vector(lines[3], 4),
      parse_vector(lines[4], 5),
    ]

    // Handle negative scale factor (volume-based scaling)
    if (scale_factor < 0) {
      const volume = Math.abs(
        lattice_vecs[0][0] *
          (lattice_vecs[1][1] * lattice_vecs[2][2] -
            lattice_vecs[1][2] * lattice_vecs[2][1]) +
          lattice_vecs[0][1] *
            (lattice_vecs[1][2] * lattice_vecs[2][0] -
              lattice_vecs[1][0] * lattice_vecs[2][2]) +
          lattice_vecs[0][2] *
            (lattice_vecs[1][0] * lattice_vecs[2][1] -
              lattice_vecs[1][1] * lattice_vecs[2][0]),
      )
      scale_factor = Math.pow(-scale_factor / volume, 1 / 3)
    }

    // Scale lattice vectors
    const scaled_lattice: [Vector, Vector, Vector] = [
      lattice_vecs[0].map((x) => x * scale_factor) as Vector,
      lattice_vecs[1].map((x) => x * scale_factor) as Vector,
      lattice_vecs[2].map((x) => x * scale_factor) as Vector,
    ]

    // Parse element symbols and atom counts (may span multiple lines)
    let line_index = 5
    let element_symbols: string[] = []
    let atom_counts: number[] = []

    // Detect if this is VASP 5+ format (has element symbols)
    // Try to parse the first token as a number - if it succeeds, it's VASP 4 format
    const first_token = lines[line_index].trim().split(/\s+/)[0]
    const first_token_as_number = parseInt(first_token)
    const has_element_symbols = isNaN(first_token_as_number)

    if (has_element_symbols) {
      // VASP 5+ format - parse element symbols (may span multiple lines)
      let symbol_lines = 1

      // Look ahead to find where numbers start (atom counts)
      for (let i = 1; i < 10; i++) {
        if (line_index + i >= lines.length) break
        const next_line_first_token = lines[line_index + i]
          .trim()
          .split(/\s+/)[0]
        const next_token_as_number = parseInt(next_line_first_token)
        if (!isNaN(next_token_as_number)) {
          symbol_lines = i
          break
        }
      }

      // Collect all element symbols from the symbol lines
      for (let i = 0; i < symbol_lines; i++) {
        if (line_index + i < lines.length) {
          element_symbols.push(...lines[line_index + i].trim().split(/\s+/))
        }
      }

      // Parse atom counts (may span multiple lines)
      for (let i = 0; i < symbol_lines; i++) {
        if (line_index + symbol_lines + i < lines.length) {
          const counts = lines[line_index + symbol_lines + i]
            .trim()
            .split(/\s+/)
            .map(Number)
          atom_counts.push(...counts)
        }
      }

      line_index += 2 * symbol_lines
    } else {
      // VASP 4 format - only atom counts, generate default element symbols
      atom_counts = lines[line_index].trim().split(/\s+/).map(Number)
      element_symbols = atom_counts.map((_, i) =>
        validate_element_symbol(`Element${i}`, i),
      )
      line_index += 1
    }

    if (element_symbols.length !== atom_counts.length) {
      console.error(`Mismatch between element symbols and atom counts`)
      return null
    }

    // Check for selective dynamics
    let has_selective_dynamics = false
    if (line_index < lines.length) {
      let coordinate_mode = lines[line_index].trim().toUpperCase()

      if (coordinate_mode.startsWith(`S`)) {
        has_selective_dynamics = true
        line_index += 1
        if (line_index < lines.length) {
          coordinate_mode = lines[line_index].trim().toUpperCase()
        } else {
          console.error(`Missing coordinate mode after selective dynamics`)
          return null
        }
      }

      // Determine coordinate mode
      const is_direct = coordinate_mode.startsWith(`D`)
      const is_cartesian =
        coordinate_mode.startsWith(`C`) || coordinate_mode.startsWith(`K`)

      if (!is_direct && !is_cartesian) {
        console.error(`Unknown coordinate mode in POSCAR: ${coordinate_mode}`)
        return null
      }

      // Parse atomic positions
      const sites: Site[] = []
      let atom_index = 0

      for (let i = 0; i < element_symbols.length; i++) {
        const element = validate_element_symbol(element_symbols[i], i)
        const count = atom_counts[i]

        for (let j = 0; j < count; j++) {
          const coord_line_idx = line_index + 1 + atom_index + j
          if (coord_line_idx >= lines.length) {
            console.error(`Not enough coordinate lines in POSCAR`)
            return null
          }

          const coords = parse_coordinate_line(lines[coord_line_idx])

          // Parse selective dynamics if present
          let selective_dynamics: [boolean, boolean, boolean] | undefined
          if (has_selective_dynamics) {
            const tokens = lines[coord_line_idx].trim().split(/\s+/)
            if (tokens.length >= 6) {
              selective_dynamics = [
                tokens[3] === `T`,
                tokens[4] === `T`,
                tokens[5] === `T`,
              ]
            }
          }

          let xyz: Vector
          let abc: Vector

          if (is_direct) {
            // Store fractional coordinates
            abc = [coords[0], coords[1], coords[2]]
            // Convert fractional to Cartesian coordinates
            xyz = [
              coords[0] * scaled_lattice[0][0] +
                coords[1] * scaled_lattice[1][0] +
                coords[2] * scaled_lattice[2][0],
              coords[0] * scaled_lattice[0][1] +
                coords[1] * scaled_lattice[1][1] +
                coords[2] * scaled_lattice[2][1],
              coords[0] * scaled_lattice[0][2] +
                coords[1] * scaled_lattice[1][2] +
                coords[2] * scaled_lattice[2][2],
            ]
          } else {
            // Already Cartesian, scale if needed
            xyz = [
              coords[0] * scale_factor,
              coords[1] * scale_factor,
              coords[2] * scale_factor,
            ]
            // Calculate fractional coordinates using proper matrix inversion
            // Note: Our lattice matrix is stored as row vectors, but for coordinate conversion
            // we need column vectors, so we transpose before inversion
            try {
              const lattice_transposed = transpose_matrix(scaled_lattice)
              const lattice_inv = matrix_inverse_3x3(lattice_transposed)
              abc = matrix_vector_multiply(lattice_inv, xyz)
            } catch {
              // Fallback to simplified method if matrix is singular
              abc = [
                xyz[0] / scaled_lattice[0][0],
                xyz[1] / scaled_lattice[1][1],
                xyz[2] / scaled_lattice[2][2],
              ]
            }
          }

          const site: Site = {
            species: [{ element, occu: 1, oxidation_state: 0 }],
            abc,
            xyz,
            label: `${element}${atom_index + j + 1}`,
            properties: selective_dynamics
              ? { selective_dynamics: selective_dynamics }
              : {},
          }

          sites.push(site)
        }

        atom_index += count
      }

      const lattice_params = calculate_lattice_parameters(scaled_lattice)

      const structure: ParsedStructure = {
        sites,
        lattice: {
          matrix: scaled_lattice,
          ...lattice_params,
        },
      }

      return structure
    } else {
      console.error(`Missing coordinate mode line in POSCAR`)
      return null
    }
  } catch (error) {
    console.error(`Error parsing POSCAR file:`, error)
    return null
  }
}

// Parse XYZ file format. Supports both standard XYZ and extended XYZ formats with multi-frame support
export function parse_xyz(content: string): ParsedStructure | null {
  try {
    const normalized_content = content.trim()
    if (!normalized_content) {
      console.error(`Empty XYZ file`)
      return null
    }

    // Split into frames using regex pattern similar to pymatgen
    const frame_pattern =
      /^\s*\d+\s*\n[^\n]*\n((?:\s*\w+\s+[0-9\-\+\.*^eEdD]+\s+[0-9\-\+\.*^eEdD]+\s+[0-9\-\+\.*^eEdD]+.*\n?)+)/gm
    const frames = []
    let match

    while ((match = frame_pattern.exec(normalized_content)) !== null) {
      frames.push(match[0])
    }

    // If no frames found, try simple parsing
    if (frames.length === 0) {
      frames.push(normalized_content)
    }

    // Parse the last frame (or only frame)
    const frame_content = frames[frames.length - 1]
    const lines = frame_content.trim().split(/\r?\n/)

    if (lines.length < 2) {
      console.error(`XYZ frame too short`)
      return null
    }

    // Parse number of atoms (line 1)
    const num_atoms = parseInt(lines[0].trim())
    if (isNaN(num_atoms) || num_atoms <= 0) {
      console.error(`Invalid number of atoms in XYZ file`)
      return null
    }

    // Parse comment line (line 2) - may contain lattice info for extended XYZ
    const comment_line = lines[1]
    let lattice: ParsedStructure[`lattice`] | undefined

    // Check for extended XYZ lattice information in comment line
    const lattice_match = comment_line.match(/Lattice="([^"]+)"/)
    if (lattice_match) {
      const lattice_values = lattice_match[1].split(/\s+/).map(parse_coordinate)
      if (lattice_values.length === 9) {
        const lattice_vectors: [Vector, Vector, Vector] = [
          [lattice_values[0], lattice_values[1], lattice_values[2]],
          [lattice_values[3], lattice_values[4], lattice_values[5]],
          [lattice_values[6], lattice_values[7], lattice_values[8]],
        ]

        const lattice_params = calculate_lattice_parameters(lattice_vectors)
        lattice = {
          matrix: lattice_vectors,
          ...lattice_params,
        }
      }
    }

    // Parse atomic coordinates (starting from line 3)
    const sites: Site[] = []

    for (let i = 0; i < num_atoms; i++) {
      const line_idx = i + 2
      if (line_idx >= lines.length) {
        console.error(`Not enough coordinate lines in XYZ file`)
        return null
      }

      const parts = lines[line_idx].trim().split(/\s+/)
      if (parts.length < 4) {
        console.error(`Invalid coordinate line in XYZ file`)
        return null
      }

      const element = validate_element_symbol(parts[0], i)
      const coords = [
        parse_coordinate(parts[1]),
        parse_coordinate(parts[2]),
        parse_coordinate(parts[3]),
      ]

      // For XYZ files, coordinates are typically in Cartesian
      const xyz: Vector = [coords[0], coords[1], coords[2]]

      // Calculate fractional coordinates if lattice is available
      let abc: Vector = [0, 0, 0]
      if (lattice) {
        // Calculate fractional coordinates using proper matrix inversion
        // Note: Our lattice matrix is stored as row vectors, but for coordinate conversion
        // we need column vectors, so we transpose before inversion
        try {
          const lattice_transposed = transpose_matrix(lattice.matrix)
          const lattice_inv = matrix_inverse_3x3(lattice_transposed)
          abc = matrix_vector_multiply(lattice_inv, xyz)
        } catch {
          // Fallback to simplified method if matrix is singular
          abc = [xyz[0] / lattice.a, xyz[1] / lattice.b, xyz[2] / lattice.c]
        }
      }

      const site: Site = {
        species: [{ element, occu: 1, oxidation_state: 0 }],
        abc,
        xyz,
        label: `${element}${i + 1}`,
        properties: {},
      }

      sites.push(site)
    }

    const structure: ParsedStructure = {
      sites,
      ...(lattice && { lattice }),
    }

    return structure
  } catch (error) {
    console.error(`Error parsing XYZ file:`, error)
    return null
  }
}

// Parse CIF (Crystallographic Information File) format
export function parse_cif(content: string): ParsedStructure | null {
  try {
    const lines = content.trim().split(/\r?\n/)

    if (lines.length < 2) {
      console.error(`CIF file too short`)
      return null
    }

    // Parse unit cell parameters
    let a = 1,
      b = 1,
      c = 1
    let alpha = 90,
      beta = 90,
      gamma = 90

    // Find unit cell parameters
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith(`_cell_length_a`)) {
        a = parseFloat(trimmed.split(/\s+/)[1])
      } else if (trimmed.startsWith(`_cell_length_b`)) {
        b = parseFloat(trimmed.split(/\s+/)[1])
      } else if (trimmed.startsWith(`_cell_length_c`)) {
        c = parseFloat(trimmed.split(/\s+/)[1])
      } else if (trimmed.startsWith(`_cell_angle_alpha`)) {
        alpha = parseFloat(trimmed.split(/\s+/)[1])
      } else if (trimmed.startsWith(`_cell_angle_beta`)) {
        beta = parseFloat(trimmed.split(/\s+/)[1])
      } else if (trimmed.startsWith(`_cell_angle_gamma`)) {
        gamma = parseFloat(trimmed.split(/\s+/)[1])
      }
    }

    // Convert angles to radians for calculation
    const alpha_rad = (alpha * Math.PI) / 180
    const beta_rad = (beta * Math.PI) / 180
    const gamma_rad = (gamma * Math.PI) / 180

    // Calculate lattice vectors from unit cell parameters
    // Standard crystallographic convention
    const cos_alpha = Math.cos(alpha_rad)
    const cos_beta = Math.cos(beta_rad)
    const cos_gamma = Math.cos(gamma_rad)
    const sin_gamma = Math.sin(gamma_rad)

    const vol_factor = Math.sqrt(
      1 -
        cos_alpha ** 2 -
        cos_beta ** 2 -
        cos_gamma ** 2 +
        2 * cos_alpha * cos_beta * cos_gamma,
    )

    const lattice_matrix: [Vector, Vector, Vector] = [
      [a, 0, 0],
      [b * cos_gamma, b * sin_gamma, 0],
      [
        c * cos_beta,
        (c * (cos_alpha - cos_beta * cos_gamma)) / sin_gamma,
        (c * vol_factor) / sin_gamma,
      ],
    ]

    const volume = a * b * c * vol_factor

    // Find atom site data
    const sites: Site[] = []
    let in_atom_site_loop = false
    let atom_site_headers: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Look for atom site loop
      if (line === `loop_`) {
        // Check if next few lines contain atom site labels
        let next_line_idx = i + 1
        const potential_headers: string[] = []

        while (next_line_idx < lines.length) {
          const next_line = lines[next_line_idx].trim()
          if (next_line.startsWith(`_atom_site_`)) {
            potential_headers.push(next_line)
            next_line_idx++
          } else {
            break
          }
        }

        if (potential_headers.length > 0) {
          in_atom_site_loop = true
          atom_site_headers = potential_headers
          i = next_line_idx - 1 // Skip to data section
          continue
        }
      }

      // Parse atom site data
      if (
        in_atom_site_loop &&
        line &&
        !line.startsWith(`_`) &&
        !line.startsWith(`#`)
      ) {
        const tokens = line.split(/\s+/)

        if (tokens.length >= atom_site_headers.length) {
          // Map headers to indices
          const label_idx = atom_site_headers.findIndex((h) =>
            h.includes(`_atom_site_label`),
          )
          const symbol_idx = atom_site_headers.findIndex((h) =>
            h.includes(`_atom_site_type_symbol`),
          )
          const x_idx = atom_site_headers.findIndex((h) =>
            h.includes(`_atom_site_fract_x`),
          )
          const y_idx = atom_site_headers.findIndex((h) =>
            h.includes(`_atom_site_fract_y`),
          )
          const z_idx = atom_site_headers.findIndex((h) =>
            h.includes(`_atom_site_fract_z`),
          )
          const occ_idx = atom_site_headers.findIndex((h) =>
            h.includes(`_atom_site_occupancy`),
          )

          if (symbol_idx >= 0 && x_idx >= 0 && y_idx >= 0 && z_idx >= 0) {
            try {
              const element_symbol = tokens[symbol_idx]
              const fract_x = parseFloat(tokens[x_idx])
              const fract_y = parseFloat(tokens[y_idx])
              const fract_z = parseFloat(tokens[z_idx])
              const occupancy = occ_idx >= 0 ? parseFloat(tokens[occ_idx]) : 1.0
              const label = label_idx >= 0 ? tokens[label_idx] : element_symbol

              if (isNaN(fract_x) || isNaN(fract_y) || isNaN(fract_z)) {
                continue
              }

              const element = validate_element_symbol(
                element_symbol,
                sites.length,
              )
              const abc: Vector = [fract_x, fract_y, fract_z]

              // Convert fractional to Cartesian coordinates
              const xyz: Vector = [
                fract_x * lattice_matrix[0][0] +
                  fract_y * lattice_matrix[1][0] +
                  fract_z * lattice_matrix[2][0],
                fract_x * lattice_matrix[0][1] +
                  fract_y * lattice_matrix[1][1] +
                  fract_z * lattice_matrix[2][1],
                fract_x * lattice_matrix[0][2] +
                  fract_y * lattice_matrix[1][2] +
                  fract_z * lattice_matrix[2][2],
              ]

              const site: Site = {
                species: [{ element, occu: occupancy, oxidation_state: 0 }],
                abc,
                xyz,
                label,
                properties: {},
              }

              sites.push(site)
            } catch (error) {
              console.warn(`Error parsing CIF atom site line: ${line}`, error)
            }
          }
        }
      }

      // End of loop or start of new section
      if (
        in_atom_site_loop &&
        (line.startsWith(`loop_`) || line.startsWith(`data_`) || line === ``)
      ) {
        in_atom_site_loop = false
      }
    }

    if (sites.length === 0) {
      console.error(`No atom sites found in CIF file`)
      return null
    }

    const lattice_params = {
      a,
      b,
      c,
      alpha,
      beta,
      gamma,
      volume,
    }

    const structure: ParsedStructure = {
      sites,
      lattice: {
        matrix: lattice_matrix,
        ...lattice_params,
      },
    }

    return structure
  } catch (error) {
    console.error(`Error parsing CIF file:`, error)
    return null
  }
}

// Auto-detect file format and parse accordingly
export function parse_structure_file(
  content: string,
  filename?: string,
): ParsedStructure | null {
  // If a filename is provided, try to detect format by file extension first
  if (filename) {
    const ext = filename.toLowerCase().split(`.`).pop()

    // Try to detect format by file extension
    if (ext === `xyz`) {
      return parse_xyz(content)
    }

    // CIF files
    if (ext === `cif`) {
      return parse_cif(content)
    }

    // POSCAR files may not have extensions or have various names
    if (ext === `poscar` || filename.toLowerCase().includes(`poscar`)) {
      return parse_poscar(content)
    }
  }

  // Try to auto-detect based on content
  const lines = content.trim().split(/\r?\n/)

  if (lines.length < 2) {
    console.error(`File too short to determine format`)
    return null
  }

  // XYZ format detection: first line should be a number, second line is comment
  const first_line_number = parseInt(lines[0].trim())
  if (!isNaN(first_line_number) && first_line_number > 0) {
    // Check if this looks like XYZ format
    if (lines.length >= first_line_number + 2) {
      // Try to parse a coordinate line to see if it looks like XYZ
      const coord_line_idx = 2 // First coordinate line in XYZ
      if (coord_line_idx < lines.length) {
        const parts = lines[coord_line_idx].trim().split(/\s+/)
        // XYZ format: element symbol followed by 3 coordinates
        if (parts.length >= 4) {
          const first_token = parts[0]
          const coords = parts.slice(1, 4)

          // Check if first token looks like an element symbol (not a number)
          // and the next 3 tokens look like coordinates (numbers)
          const is_element_symbol =
            isNaN(parseInt(first_token)) && first_token.length <= 3
          const are_coordinates = coords.every(
            (coord) => !isNaN(parseFloat(coord)),
          )

          if (is_element_symbol && are_coordinates) {
            // First token is likely an element symbol, likely XYZ
            return parse_xyz(content)
          }
        }
      }
    }
  }

  // POSCAR format detection: look for typical structure
  if (lines.length >= 8) {
    const second_line_number = parseFloat(lines[1].trim())
    if (!isNaN(second_line_number)) {
      // Second line is a number (scale factor), likely POSCAR
      return parse_poscar(content)
    }
  }

  // CIF format detection: look for CIF-specific keywords
  const has_cif_keywords = lines.some(
    (line) =>
      line.startsWith(`data_`) ||
      line.includes(`_cell_length_`) ||
      line.includes(`_atom_site_`) ||
      line.trim() === `loop_`,
  )
  if (has_cif_keywords) {
    return parse_cif(content)
  }

  console.error(`Unable to determine file format`)
  return null
}
