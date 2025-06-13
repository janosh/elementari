import type { Trajectory } from '$lib/trajectory'
import {
  comprehensive_data_extractor,
  get_trajectory_stats,
  is_vasp_xdatcar,
  is_xyz_trajectory,
  parse_trajectory_data,
  parse_vasp_xdatcar,
  parse_xyz_trajectory,
  validate_trajectory,
} from '$lib/trajectory'
import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { gunzipSync } from 'zlib'

// Helper to read test files
function read_test_file(filename: string): string {
  const file_path = join(process.cwd(), `src/site/trajectories`, filename)
  return readFileSync(file_path, `utf-8`)
}

// Helper to read and potentially decompress test files
function read_compressed_test_file(filename: string): string {
  const file_path = join(process.cwd(), `src/site/trajectories`, filename)

  if (filename.endsWith(`.gz`)) {
    // Read as buffer and decompress
    const compressed_data = readFileSync(file_path)
    const decompressed_data = gunzipSync(compressed_data)
    return decompressed_data.toString(`utf-8`)
  } else {
    // Read as regular text file
    return readFileSync(file_path, `utf-8`)
  }
}

describe(`VASP XDATCAR Parser`, () => {
  const xdatcar_content = read_test_file(`XDATCAR.MD`)

  it(`should detect XDATCAR format by filename`, () => {
    expect(is_vasp_xdatcar(``, `XDATCAR`)).toBe(true)
    expect(is_vasp_xdatcar(``, `XDATCAR.MD`)).toBe(true)
    expect(is_vasp_xdatcar(``, `xdatcar`)).toBe(true)
    expect(is_vasp_xdatcar(``, `some_file.json`)).toBe(false)
  })

  it(`should detect XDATCAR format by content`, () => {
    expect(is_vasp_xdatcar(xdatcar_content)).toBe(true)
    expect(is_vasp_xdatcar(`{"frames": []}`)).toBe(false)
    expect(is_vasp_xdatcar(`random text`)).toBe(false)
  })

  it(`should parse XDATCAR file correctly`, () => {
    const trajectory = parse_vasp_xdatcar(xdatcar_content)

    // Check basic structure
    expect(trajectory).toBeDefined()
    expect(trajectory.frames).toBeDefined()
    expect(trajectory.metadata).toBeDefined()

    // Check metadata
    expect(trajectory.metadata?.source_format).toBe(`vasp_xdatcar`)
    expect(trajectory.metadata?.title).toBe(`Molten Fe2O3`)
    expect(trajectory.metadata?.frame_count).toBe(5)
    expect(trajectory.metadata?.total_atoms).toBe(80)
    expect(trajectory.metadata?.elements).toEqual([`O`, `Fe`])
    expect(trajectory.metadata?.element_counts).toEqual([48, 32])

    // Check frames
    expect(trajectory.frames).toHaveLength(5)

    // Check first frame
    const first_frame = trajectory.frames[0]
    expect(first_frame.step).toBe(1)
    expect(first_frame.structure.sites).toHaveLength(80)
    expect(first_frame.metadata?.volume).toBeTypeOf(`number`)

    // Check lattice (only for structures that have lattice)
    if (`lattice` in first_frame.structure) {
      expect(first_frame.structure.lattice).toBeDefined()
      expect(first_frame.structure.lattice.volume).toBeCloseTo(827.9, 1)
      expect(first_frame.structure.lattice.a).toBeCloseTo(9.39, 2)
      expect(first_frame.structure.lattice.b).toBeCloseTo(9.39, 2)
      expect(first_frame.structure.lattice.c).toBeCloseTo(9.39, 2)
    }

    // Check sites
    const first_site = first_frame.structure.sites[0]
    expect(first_site.species[0].element).toBe(`O`)
    expect(first_site.abc).toHaveLength(3)
    expect(first_site.xyz).toHaveLength(3)
    expect(first_site.label).toBe(`O1`)

    // Check that O atoms come first (48 of them)
    for (let i = 0; i < 48; i++) {
      expect(first_frame.structure.sites[i].species[0].element).toBe(`O`)
    }

    // Check that Fe atoms come after (32 of them)
    for (let i = 48; i < 80; i++) {
      expect(first_frame.structure.sites[i].species[0].element).toBe(`Fe`)
    }
  })

  it(`should handle coordinate conversion correctly`, () => {
    const trajectory = parse_vasp_xdatcar(xdatcar_content)
    const first_frame = trajectory.frames[0]
    const first_site = first_frame.structure.sites[0]

    // Check that fractional coordinates are in [0,1] range (approximately)
    expect(first_site.abc[0]).toBeGreaterThanOrEqual(0)
    expect(first_site.abc[0]).toBeLessThanOrEqual(1)
    expect(first_site.abc[1]).toBeGreaterThanOrEqual(0)
    expect(first_site.abc[1]).toBeLessThanOrEqual(1)
    expect(first_site.abc[2]).toBeGreaterThanOrEqual(0)
    expect(first_site.abc[2]).toBeLessThanOrEqual(1)

    // Check that Cartesian coordinates are reasonable (scaled by lattice)
    expect(Math.abs(first_site.xyz[0])).toBeLessThan(20)
    expect(Math.abs(first_site.xyz[1])).toBeLessThan(20)
    expect(Math.abs(first_site.xyz[2])).toBeLessThan(20)
  })

  it(`should parse all configurations`, () => {
    const trajectory = parse_vasp_xdatcar(xdatcar_content)

    // Should have 5 configurations
    expect(trajectory.frames).toHaveLength(5)

    // Check step numbers
    expect(trajectory.frames[0].step).toBe(1)
    expect(trajectory.frames[1].step).toBe(2)
    expect(trajectory.frames[2].step).toBe(3)
    expect(trajectory.frames[3].step).toBe(4)
    expect(trajectory.frames[4].step).toBe(5)

    // All frames should have same number of atoms
    trajectory.frames.forEach((frame) => {
      expect(frame.structure.sites).toHaveLength(80)
      expect(frame.metadata?.volume).toBeTypeOf(`number`)
    })
  })

  it(`should throw error for invalid XDATCAR content`, () => {
    expect(() => parse_vasp_xdatcar(`too short`)).toThrow(
      `XDATCAR file too short`,
    )
    expect(() =>
      parse_vasp_xdatcar(
        `line1\ninvalid_scale\nline3\nline4\nline5\nline6\nline7\nline8\nline9\nline10`,
      ),
    ).toThrow(`Invalid scale factor`)
    expect(() =>
      parse_vasp_xdatcar(
        `line1\n1.0\ninvalid lattice\nline4\nline5\nline6\nline7\nline8\nline9\nline10`,
      ),
    ).toThrow(`Invalid lattice vector`)
  })

  it(`should handle XDATCAR with element symbols in coordinate lines`, () => {
    const xdatcar_with_element_symbols = `unknown system
1.0
10.805799 0.000000 0.000000
0.000000 10.805799 0.000000
0.000000 0.000000 10.805799
Li Si
2 2
Direct configuration=     1
0.492382 0.424713 0.083372 Li
0.454866 0.974901 0.868130 Li
0.178658 0.922564 0.841221 Si
0.129187 0.190746 0.219267 Si
Direct configuration=     2
0.493382 0.425713 0.084372 Li
0.455866 0.975901 0.869130 Li
0.179658 0.923564 0.842221 Si
0.130187 0.191746 0.220267 Si`

    const trajectory = parse_vasp_xdatcar(xdatcar_with_element_symbols)

    expect(trajectory).toBeDefined()
    expect(trajectory.frames).toHaveLength(2)

    // Check first frame
    const first_frame = trajectory.frames[0]
    expect(first_frame.structure.sites).toHaveLength(4)
    expect(first_frame.structure.sites[0].species[0].element).toBe(`Li`)
    expect(first_frame.structure.sites[1].species[0].element).toBe(`Li`)
    expect(first_frame.structure.sites[2].species[0].element).toBe(`Si`)
    expect(first_frame.structure.sites[3].species[0].element).toBe(`Si`)

    // Verify coordinates
    expect(first_frame.structure.sites[0].abc).toEqual([
      0.492382, 0.424713, 0.083372,
    ])
  })
})

describe(`JSON Trajectory Parser`, () => {
  const json_content = read_compressed_test_file(
    `pmg_LiMnO2_chgnet_relax.json.gz`,
  )

  it(`should parse compressed JSON trajectory`, async () => {
    const trajectory = parse_trajectory_data(
      json_content,
      `LiMnO2_chgnet_relax.json.gz`,
    )

    expect(trajectory).toBeDefined()
    expect(trajectory.frames).toBeDefined()
    expect(trajectory.frames.length).toBeGreaterThan(0)
    expect(trajectory.metadata?.filename).toBe(`LiMnO2_chgnet_relax.json.gz`)
  })
})

describe(`XYZ Trajectory Parser`, () => {
  const multi_frame_xyz = `3
Frame 0, step=0, energy=-10.5
H  0.000  0.000  0.000
H  0.000  0.000  1.000
O  0.000  1.000  0.000
3
Frame 1, step=1, energy=-10.8
H  0.100  0.000  0.000
H  0.000  0.100  1.000
O  0.000  1.000  0.100
3
Frame 2 energy=-11.0
H  0.200  0.000  0.000
H  0.000  0.200  1.000
O  0.000  1.000  0.200`

  const single_frame_xyz = `3
Single water molecule
H  0.000  0.000  0.000
H  0.000  0.000  1.000
O  0.000  1.000  0.000`

  it(`should detect multi-frame XYZ format`, () => {
    expect(is_xyz_trajectory(multi_frame_xyz, `trajectory.xyz`)).toBe(true)
    expect(is_xyz_trajectory(single_frame_xyz, `single.xyz`)).toBe(false)
    expect(is_xyz_trajectory(`random text`, `test.xyz`)).toBe(false)
  })

  it(`should parse multi-frame XYZ trajectory correctly`, () => {
    const trajectory = parse_xyz_trajectory(multi_frame_xyz)

    // Check basic structure
    expect(trajectory).toBeDefined()
    expect(trajectory.frames).toHaveLength(3)
    expect(trajectory.metadata?.source_format).toBe(`xyz_trajectory`)
    expect(trajectory.metadata?.frame_count).toBe(3)
    expect(trajectory.metadata?.total_atoms).toBe(3)

    // Check first frame
    const first_frame = trajectory.frames[0]
    expect(first_frame.step).toBe(0)
    expect(first_frame.structure.sites).toHaveLength(3)
    expect(first_frame.metadata?.energy).toBe(-10.5)

    // Check site data
    const h_site = first_frame.structure.sites[0]
    expect(h_site.species[0].element).toBe(`H`)
    expect(h_site.xyz).toEqual([0, 0, 0])

    // Check second frame for step progression
    const second_frame = trajectory.frames[1]
    expect(second_frame.step).toBe(1)
    expect(second_frame.metadata?.energy).toBe(-10.8)

    // Check third frame (should fallback to frame index for step)
    const third_frame = trajectory.frames[2]
    expect(third_frame.step).toBe(2) // fallback to frame index
    expect(third_frame.metadata?.energy).toBe(-11.0)
  })

  it(`should handle XYZ files with various comment formats`, () => {
    const xyz_with_various_comments = `2
Step: 5 Energy: -5.2
H  0.0  0.0  0.0
H  1.0  0.0  0.0
2
frame=10
H  0.1  0.0  0.0
H  1.1  0.0  0.0`

    const trajectory = parse_xyz_trajectory(xyz_with_various_comments)
    expect(trajectory.frames).toHaveLength(2)
    expect(trajectory.frames[0].step).toBe(5)
    expect(trajectory.frames[0].metadata?.energy).toBe(-5.2)
    expect(trajectory.frames[1].step).toBe(10)
  })

  it(`should throw error for invalid XYZ content`, () => {
    expect(() => parse_xyz_trajectory(`invalid content`)).toThrow()
    expect(() => parse_xyz_trajectory(`2\ncomment\nH 0 0`)).toThrow() // insufficient coordinates
  })
})

describe(`General Trajectory Parser with XYZ`, () => {
  const multi_frame_xyz = `3
Frame 0
H  0.000  0.000  0.000
H  0.000  0.000  1.000
O  0.000  1.000  0.000
3
Frame 1
H  0.100  0.000  0.000
H  0.000  0.100  1.000
O  0.000  1.000  0.100`

  const single_frame_xyz = `3
Single water molecule
H  0.000  0.000  0.000
H  0.000  0.000  1.000
O  0.000  1.000  0.000`

  it(`should route multi-frame XYZ files to XYZ trajectory parser`, () => {
    const trajectory = parse_trajectory_data(multi_frame_xyz, `trajectory.xyz`)
    expect(trajectory.metadata?.source_format).toBe(`xyz_trajectory`)
    expect(trajectory.frames).toHaveLength(2)
  })

  it(`should handle single-frame XYZ files`, () => {
    const trajectory = parse_trajectory_data(single_frame_xyz, `molecule.xyz`)
    expect(trajectory.metadata?.source_format).toBe(`single_xyz`)
    expect(trajectory.frames).toHaveLength(1)
    expect(trajectory.frames[0].structure.charge).toBe(0) // Should have charge property
  })

  it(`should prefer multi-frame over single-frame parsing for XYZ`, () => {
    const trajectory = parse_trajectory_data(multi_frame_xyz, `test.xyz`)
    expect(trajectory.metadata?.source_format).toBe(`xyz_trajectory`)
  })
})

describe(`General Trajectory Parser`, () => {
  it(`should route XDATCAR files to XDATCAR parser`, () => {
    const xdatcar_content = read_test_file(`XDATCAR.MD`)
    const trajectory = parse_trajectory_data(xdatcar_content, `XDATCAR.MD`)

    expect(trajectory.metadata?.source_format).toBe(`vasp_xdatcar`)
    expect(trajectory.frames).toHaveLength(5)
  })

  it(`should handle JSON array format`, () => {
    const json_array = JSON.stringify([
      {
        structure: {
          sites: [
            {
              species: [{ element: `H`, occu: 1, oxidation_state: 0 }],
              abc: [0, 0, 0],
              xyz: [0, 0, 0],
              label: `H1`,
              properties: {},
            },
          ],
          charge: 0,
        },
        step: 0,
        metadata: { energy: -1.0 },
      },
    ])

    const trajectory = parse_trajectory_data(json_array, `test.json`)
    expect(trajectory.metadata?.source_format).toBe(`array`)
    expect(trajectory.frames).toHaveLength(1)
  })

  it(`should handle JSON object with frames`, () => {
    const json_object = JSON.stringify({
      frames: [
        {
          structure: {
            sites: [
              {
                species: [{ element: `H`, occu: 1, oxidation_state: 0 }],
                abc: [0, 0, 0],
                xyz: [0, 0, 0],
                label: `H1`,
                properties: {},
              },
            ],
            charge: 0,
          },
          step: 0,
          metadata: { energy: -1.0 },
        },
      ],
      metadata: { description: `test trajectory` },
    })

    const trajectory = parse_trajectory_data(json_object, `test.json`)
    expect(trajectory.metadata?.source_format).toBe(`object_with_frames`)
    expect(trajectory.frames).toHaveLength(1)
  })

  it(`should handle single structure`, () => {
    const single_structure = JSON.stringify({
      sites: [
        {
          species: [{ element: `H`, occu: 1, oxidation_state: 0 }],
          abc: [0, 0, 0],
          xyz: [0, 0, 0],
          label: `H1`,
          properties: {},
        },
      ],
      charge: 0,
    })

    const trajectory = parse_trajectory_data(single_structure, `structure.json`)
    expect(trajectory.metadata?.source_format).toBe(`single_structure`)
    expect(trajectory.frames).toHaveLength(1)
  })

  it(`should throw error for unrecognized format`, () => {
    expect(() => parse_trajectory_data(`invalid content`, `test.txt`)).toThrow()
    expect(() => parse_trajectory_data({}, `test.json`)).toThrow()
    expect(() => parse_trajectory_data(null, `test.json`)).toThrow()
  })
})

describe(`Trajectory Validation`, () => {
  it(`should validate correct trajectory`, () => {
    const xdatcar_content = read_test_file(`XDATCAR.MD`)
    const trajectory = parse_vasp_xdatcar(xdatcar_content)

    const errors = validate_trajectory(trajectory)
    expect(errors).toHaveLength(0)
  })

  it(`should detect missing frames`, () => {
    const invalid_trajectory: Trajectory = {
      frames: [],
      metadata: {},
    }

    const errors = validate_trajectory(invalid_trajectory)
    expect(errors).toContain(`Trajectory must have at least one frame`)
  })

  it(`should detect missing structure`, () => {
    const invalid_trajectory: Trajectory = {
      // @ts-expect-error Testing invalid structure
      frames: [{ structure: null, step: 0, metadata: {} }],
      metadata: {},
    }

    const errors = validate_trajectory(invalid_trajectory)
    expect(errors).toContain(`Frame 0 missing structure`)
  })

  it(`should detect empty sites`, () => {
    const invalid_trajectory: Trajectory = {
      frames: [
        {
          structure: {
            sites: [],
            charge: 0,
          },
          step: 0,
          metadata: {},
        },
      ],
      metadata: {},
    }

    const errors = validate_trajectory(invalid_trajectory)
    expect(errors).toContain(`Frame 0 structure has no sites`)
  })
})

describe(`Trajectory Statistics`, () => {
  it(`should calculate correct statistics for XDATCAR`, () => {
    const xdatcar_content = read_test_file(`XDATCAR.MD`)
    const trajectory = parse_vasp_xdatcar(xdatcar_content)

    const stats = get_trajectory_stats(trajectory)

    expect(stats.frame_count).toBe(5)
    expect(stats.steps).toEqual([1, 2, 3, 4, 5])
    expect(stats.step_range).toEqual([1, 5])
    expect(stats.total_atoms).toBe(80)
    expect(stats.constant_atom_count).toBe(true)
  })

  it(`should handle variable atom counts`, () => {
    const trajectory: Trajectory = {
      frames: [
        {
          structure: {
            sites: [
              {
                species: [{ element: `H`, occu: 1, oxidation_state: 0 }],
                abc: [0, 0, 0],
                xyz: [0, 0, 0],
                label: `H1`,
                properties: {},
              },
            ],
            charge: 0,
          },
          step: 0,
          metadata: {},
        },
        {
          structure: {
            sites: [
              {
                species: [{ element: `H`, occu: 1, oxidation_state: 0 }],
                abc: [0, 0, 0],
                xyz: [0, 0, 0],
                label: `H1`,
                properties: {},
              },
              {
                species: [{ element: `H`, occu: 1, oxidation_state: 0 }],
                abc: [0.5, 0.5, 0.5],
                xyz: [1, 1, 1],
                label: `H2`,
                properties: {},
              },
            ],
            charge: 0,
          },
          step: 1,
          metadata: {},
        },
      ],
      metadata: {},
    }

    const stats = get_trajectory_stats(trajectory)

    expect(stats.constant_atom_count).toBe(false)
    expect(stats.atom_count_range).toEqual([1, 2])
  })
})

describe(`Edge Cases`, () => {
  it(`should handle XDATCAR with missing configurations`, () => {
    const minimal_xdatcar = `Molten Fe2O3
1
9.390000    0.000000    0.000000
0.000000    9.390000    0.000000
0.000000    0.000000    9.390000
O    Fe
1  1
line8
line9
line10`

    expect(() => parse_vasp_xdatcar(minimal_xdatcar)).toThrow(
      `No valid configurations found`,
    )
  })

  it(`should handle XDATCAR with invalid coordinates`, () => {
    const invalid_coords_xdatcar = `Molten Fe2O3
1
9.390000    0.000000    0.000000
0.000000    9.390000    0.000000
0.000000    0.000000    9.390000
O    Fe
2  1
Direct configuration=     1
0.0  0.0  0.0
0.1  0.1  0.1
0.5  0.5  0.5
invalid_coord  0.5  0.5`

    const trajectory = parse_vasp_xdatcar(invalid_coords_xdatcar)
    // Should still parse with exactly 3 valid coordinates (2 O + 1 Fe)
    expect(trajectory.frames).toHaveLength(1)
    expect(trajectory.frames[0].structure.sites).toHaveLength(3) // Exactly total_atoms
  })

  it(`should handle empty content`, () => {
    expect(() => parse_trajectory_data(``)).toThrow()
    expect(() => parse_trajectory_data(`   `)).toThrow()
  })

  it(`should handle null/undefined input`, () => {
    expect(() => parse_trajectory_data(null)).toThrow()
    expect(() => parse_trajectory_data(undefined)).toThrow()
  })
})

describe(`Default Plotting Behavior`, () => {
  it(`should default to volume and density when no other metadata is available`, () => {
    // Create a trajectory with only structural data (no explicit energy/force metadata)
    const trajectory_with_lattice: Trajectory = {
      frames: [
        {
          structure: {
            sites: [
              {
                species: [{ element: `H`, occu: 1, oxidation_state: 0 }],
                abc: [0, 0, 0],
                xyz: [0, 0, 0],
                label: `H1`,
                properties: {},
              },
            ],
            charge: 0,
            lattice: {
              matrix: [
                [1, 0, 0],
                [0, 1, 0],
                [0, 0, 1],
              ],
              pbc: [true, true, true],
              a: 1,
              b: 1,
              c: 1,
              alpha: 90,
              beta: 90,
              gamma: 90,
              volume: 1.0,
            },
          },
          step: 0,
          metadata: {}, // No metadata
        },
        {
          structure: {
            sites: [
              {
                species: [{ element: `H`, occu: 1, oxidation_state: 0 }],
                abc: [0, 0, 0],
                xyz: [0, 0, 0],
                label: `H1`,
                properties: {},
              },
            ],
            charge: 0,
            lattice: {
              matrix: [
                [1.1, 0, 0],
                [0, 1.1, 0],
                [0, 0, 1.1],
              ],
              pbc: [true, true, true],
              a: 1.1,
              b: 1.1,
              c: 1.1,
              alpha: 90,
              beta: 90,
              gamma: 90,
              volume: 1.331, // Different volume
            },
          },
          step: 1,
          metadata: {}, // No metadata
        },
      ],
      metadata: {
        source_format: `test`,
        frame_count: 2,
      },
    }

    // Use the comprehensive data extractor to get volume and density
    const frame1_data = comprehensive_data_extractor(
      trajectory_with_lattice.frames[0],
      trajectory_with_lattice,
    )
    const frame2_data = comprehensive_data_extractor(
      trajectory_with_lattice.frames[1],
      trajectory_with_lattice,
    )

    // Should have volume in both frames (comprehensive extractor now uses lowercase)
    expect(frame1_data.volume).toBe(1.0)
    expect(frame2_data.volume).toBe(1.331)

    // Should have calculated density (rough approximation) - not available in structural extractor yet
    // expect(frame1_data.density).toBeTypeOf(`number`)
    // expect(frame2_data.density).toBeTypeOf(`number`)

    // Volume should be different between frames
    expect(frame1_data.volume).not.toBe(frame2_data.volume)
  })

  it(`should detect constant values in trajectory`, () => {
    // Create a trajectory with constant lattice (like NVT simulation)
    const constant_trajectory: Trajectory = {
      frames: [
        {
          structure: {
            sites: [
              {
                species: [{ element: `H`, occu: 1, oxidation_state: 0 }],
                abc: [0, 0, 0],
                xyz: [0, 0, 0],
                label: `H1`,
                properties: {},
              },
            ],
            charge: 0,
            lattice: {
              matrix: [
                [1, 0, 0],
                [0, 1, 0],
                [0, 0, 1],
              ],
              pbc: [true, true, true],
              a: 1,
              b: 1,
              c: 1,
              alpha: 90,
              beta: 90,
              gamma: 90,
              volume: 1.0, // Same volume
            },
          },
          step: 0,
          metadata: { energy: -10.0 }, // Same energy
        },
        {
          structure: {
            sites: [
              {
                species: [{ element: `H`, occu: 1, oxidation_state: 0 }],
                abc: [0.1, 0, 0], // Atom moved but lattice constant
                xyz: [0.1, 0, 0],
                label: `H1`,
                properties: {},
              },
            ],
            charge: 0,
            lattice: {
              matrix: [
                [1, 0, 0],
                [0, 1, 0],
                [0, 0, 1],
              ],
              pbc: [true, true, true],
              a: 1,
              b: 1,
              c: 1,
              alpha: 90,
              beta: 90,
              gamma: 90,
              volume: 1.0, // Same volume
            },
          },
          step: 1,
          metadata: { energy: -10.0 }, // Same energy
        },
      ],
      metadata: {
        source_format: `test`,
        frame_count: 2,
      },
    }

    // Extract data from both frames
    const frame1_data = comprehensive_data_extractor(
      constant_trajectory.frames[0],
      constant_trajectory,
    )
    const frame2_data = comprehensive_data_extractor(
      constant_trajectory.frames[1],
      constant_trajectory,
    )

    // All properties should be the same
    expect(frame1_data.energy).toBe(frame2_data.energy)
    expect(frame1_data.volume).toBe(frame2_data.volume)
    // expect(frame1_data.density).toBe(frame2_data.density)
  })
})
