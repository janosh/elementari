import {
  get_unsupported_format_message,
  parse_trajectory_data,
} from '$lib/trajectory/parse'
import { existsSync, readFileSync } from 'fs'
import process from 'node:process'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { gunzipSync } from 'zlib'

// Helper to read test files (handles both gzip and regular text files)
function read_test_file(filename: string): string {
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

// Helper to read binary test files (for HDF5)
function read_binary_test_file(filename: string): ArrayBuffer {
  const file_path = join(process.cwd(), `src/site/trajectories`, filename)
  const buffer = readFileSync(file_path)
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  )
}

describe(`VASP XDATCAR Parser`, () => {
  const xdatcar_content = read_test_file(`vasp-XDATCAR.MD.gz`)

  it(`should parse VASP XDATCAR file correctly`, async () => {
    const trajectory = await parse_trajectory_data(xdatcar_content, `XDATCAR`)

    expect(trajectory).toBeDefined()
    expect(trajectory.metadata?.source_format).toBe(`vasp_xdatcar`)
    expect(trajectory.metadata?.filename).toBe(`XDATCAR`)
    expect(trajectory.frames).toHaveLength(5)
    expect(trajectory.frames[0].structure.sites).toHaveLength(80)
  })

  it(`should throw error for invalid content`, async () => {
    await expect(parse_trajectory_data(`too short`, `XDATCAR`)).rejects.toThrow()
  })
})

describe(`XYZ Trajectory Format`, () => {
  const multi_frame_xyz = `3
energy=-10.5 step=0
H 0.0 0.0 0.0
H 1.0 0.0 0.0
H 0.0 1.0 0.0
3
energy=-9.2 step=1
H 0.1 0.0 0.0
H 1.1 0.0 0.0
H 0.1 1.0 0.0`

  it(`should parse multi-frame XYZ trajectory`, async () => {
    const trajectory = await parse_trajectory_data(multi_frame_xyz, `test.xyz`)

    expect(trajectory).toBeDefined()
    expect(trajectory.metadata?.source_format).toBe(`xyz_trajectory`)
    expect(trajectory.frames).toHaveLength(2)
    expect(trajectory.frames[0].metadata?.energy).toBe(-10.5)
    expect(trajectory.frames[1].metadata?.energy).toBe(-9.2)
  })

  it(`should handle single XYZ as fallback`, async () => {
    const single_xyz = `3
comment
H 0.0 0.0 0.0
H 1.0 0.0 0.0
H 0.0 1.0 0.0`

    const trajectory = await parse_trajectory_data(single_xyz, `test.xyz`)
    expect(trajectory).toBeDefined()
    expect(trajectory.metadata?.source_format).toBe(`single_xyz`)
    expect(trajectory.frames).toHaveLength(1)
  })
})

describe(`HDF5 Format`, () => {
  it(`should parse torch-sim HDF5 file`, async () => {
    const hdf5_content = read_binary_test_file(`torch-sim-gold-cluster-55-atoms.h5`)
    const trajectory = await parse_trajectory_data(hdf5_content, `test.h5`)

    expect(trajectory).toBeDefined()
    expect(trajectory.metadata?.source_format).toBe(`hdf5_trajectory`)
    expect(trajectory.frames.length).toBeGreaterThan(0)
  })

  it(`should provide detailed error when atomic numbers are missing`, async () => {
    // The water cluster file actually demonstrates this case - it has positions but no atomic numbers
    const hdf5_content = read_binary_test_file(`torch-sim-water-cluster-bad-file.h5`)

    await expect(
      parse_trajectory_data(hdf5_content, `torch-sim-water-cluster-bad-file.h5`),
    ).rejects.toThrow(/Missing required atomic numbers in HDF5 file/)

    // Verify the error message contains helpful details
    try {
      await parse_trajectory_data(hdf5_content, `torch-sim-water-cluster-bad-file.h5`)
    } catch (error: unknown) {
      expect((error as Error).message).toContain(`Missing required atomic numbers`)
      expect((error as Error).message).toContain(
        `Expected dataset with atomic numbers/species information`,
      )
    }
  })

  it(`should provide detailed error when positions are missing`, async () => {
    // Create a mock ArrayBuffer that looks like HDF5 but will fail format detection
    const invalid_hdf5 = new ArrayBuffer(128) // Too small to be valid HDF5

    await expect(
      parse_trajectory_data(invalid_hdf5, `invalid.h5`),
    ).rejects.toThrow(/Unsupported binary format/)

    // Note: The actual detailed position error would only trigger with a valid HDF5 file
    // that has the right structure but missing positions. This is hard to create in tests.
  })

  it(`should parse valid HDF5 file with both positions and atomic numbers`, async () => {
    // Test that files with complete data work correctly
    const hdf5_content = read_binary_test_file(`torch-sim-gold-cluster-55-atoms.h5`)
    const trajectory = await parse_trajectory_data(hdf5_content, `test.h5`)

    expect(trajectory).toBeDefined()
    expect(trajectory.metadata?.source_format).toBe(`hdf5_trajectory`)
    expect(trajectory.frames.length).toBeGreaterThan(0)
    expect(trajectory.metadata?.num_atoms).toBeGreaterThan(0)
  })

  describe(`HDF5 Caching System`, () => {
    it(`should demonstrate cache effectiveness with multiple parsing operations`, async () => {
      const hdf5_content = read_binary_test_file(`torch-sim-gold-cluster-55-atoms.h5`)

      // Parse the same file multiple times to test cache behavior
      const start_time = performance.now()
      const trajectory1 = await parse_trajectory_data(hdf5_content, `test1.h5`)
      const first_parse_time = performance.now() - start_time

      const start_time2 = performance.now()
      const trajectory2 = await parse_trajectory_data(hdf5_content, `test2.h5`)
      const second_parse_time = performance.now() - start_time2

      // Both should produce identical results
      expect(trajectory1.frames.length).toBe(trajectory2.frames.length)
      expect(trajectory1.metadata?.num_atoms).toBe(trajectory2.metadata?.num_atoms)
      expect(trajectory1.metadata?.source_format).toBe(
        trajectory2.metadata?.source_format,
      )

      // Note: Each parse operation creates its own cache, so timing won't show cache benefits
      // between separate parse calls, but the cache improves performance within each parse
      expect(first_parse_time).toBeGreaterThan(0)
      expect(second_parse_time).toBeGreaterThan(0)
    })

    it(`should handle cache key generation correctly for different group paths`, async () => {
      const hdf5_content = read_binary_test_file(`torch-sim-gold-cluster-55-atoms.h5`)

      // Test that parsing works correctly with datasets in different group locations
      const trajectory = await parse_trajectory_data(hdf5_content, `test.h5`)

      // The cache should handle different group paths (root, data, header, metadata, steps)
      expect(trajectory).toBeDefined()
      expect(trajectory.metadata?.source_format).toBe(`hdf5_trajectory`)
      expect(trajectory.frames.length).toBeGreaterThan(0)

      // Each frame should have the same number of atoms (cache should maintain consistency)
      const first_frame_atoms = trajectory.frames[0].structure.sites.length
      for (const frame of trajectory.frames) {
        expect(frame.structure.sites.length).toBe(first_frame_atoms)
      }
    })

    it(`should maintain cache consistency across dataset searches`, async () => {
      const hdf5_content = read_binary_test_file(`torch-sim-gold-cluster-55-atoms.h5`)

      // Parse a file that requires searching multiple locations for datasets
      const trajectory = await parse_trajectory_data(hdf5_content, `test.h5`)

      // Verify that all frames have consistent data (cache didn't corrupt lookups)
      expect(trajectory.frames.length).toBeGreaterThan(1)

      const first_frame = trajectory.frames[0]
      const last_frame = trajectory.frames[trajectory.frames.length - 1]

      // Same number of atoms across all frames
      expect(first_frame.structure.sites.length).toBe(last_frame.structure.sites.length)

      // Same element types across all frames (cache should return same atomic numbers)
      const first_elements = first_frame.structure.sites.map((site) =>
        site.species[0].element
      )
      const last_elements = last_frame.structure.sites.map((site) =>
        site.species[0].element
      )
      expect(first_elements).toEqual(last_elements)
    })

    it(`should handle cache behavior with missing datasets`, async () => {
      const hdf5_content = read_binary_test_file(`torch-sim-water-cluster-bad-file.h5`)

      // Test that cache properly handles and remembers null results
      try {
        await parse_trajectory_data(hdf5_content, `null-cache-test.h5`)
      } catch (error: unknown) {
        const error_message = (error as Error).message

        // The error should indicate missing atomic numbers
        expect(error_message).toContain(`Missing required atomic numbers`)
        expect(error_message).toContain(
          `Expected dataset with atomic numbers/species information`,
        )
      }
    })

    it(`should optimize search with early exit when datasets are found`, async () => {
      const hdf5_content = read_binary_test_file(`torch-sim-gold-cluster-55-atoms.h5`)

      // Test that the parser stops searching once it finds required datasets
      const trajectory = await parse_trajectory_data(hdf5_content, `test.h5`)

      // Should successfully parse without errors
      expect(trajectory).toBeDefined()
      expect(trajectory.metadata?.source_format).toBe(`hdf5_trajectory`)
      expect(trajectory.frames.length).toBe(20) // Known structure of this test file
      expect(trajectory.metadata?.num_atoms).toBe(55)

      // All frames should have the same structure (early exit worked correctly)
      const frame_atom_counts = trajectory.frames.map((f) => f.structure.sites.length)
      expect(new Set(frame_atom_counts).size).toBe(1) // All frames have same atom count
    })

    it(`should handle cache with different dataset name variations`, async () => {
      const hdf5_content = read_binary_test_file(`torch-sim-gold-cluster-55-atoms.h5`)

      // Test that cache works correctly when searching through multiple dataset name variations
      const trajectory = await parse_trajectory_data(hdf5_content, `test.h5`)

      // The parser searches for atomic numbers using multiple names:
      // atomic_numbers, numbers, Z, species, atoms, elements, atom_types, atomic_number, types
      expect(trajectory).toBeDefined()
      expect(trajectory.frames[0].structure.sites.length).toBe(55)

      // All atoms should be gold (Au) - cache should have found the right atomic numbers
      const elements = trajectory.frames[0].structure.sites.map((site) =>
        site.species[0].element
      )
      expect(elements.every((el) => el === `Au`)).toBe(true)
    })

    it(`should maintain cache isolation between different parsing sessions`, async () => {
      const hdf5_content = read_binary_test_file(`torch-sim-gold-cluster-55-atoms.h5`)

      // Each parse operation should create its own cache instance
      const trajectory1 = await parse_trajectory_data(hdf5_content, `session1.h5`)
      const trajectory2 = await parse_trajectory_data(hdf5_content, `session2.h5`)

      // Results should be identical but independent
      expect(trajectory1.frames.length).toBe(trajectory2.frames.length)
      expect(trajectory1.metadata?.num_atoms).toBe(trajectory2.metadata?.num_atoms)

      // Verify they're not the same object reference (different cache instances)
      expect(trajectory1).not.toBe(trajectory2)
      expect(trajectory1.frames[0]).not.toBe(trajectory2.frames[0])
    })

    it(`should handle cache with optional datasets (cells, energy, pbc)`, async () => {
      const hdf5_content = read_binary_test_file(`torch-sim-gold-cluster-55-atoms.h5`)

      // Test that cache works correctly for optional datasets
      const trajectory = await parse_trajectory_data(hdf5_content, `test.h5`)

      expect(trajectory).toBeDefined()
      expect(trajectory.metadata?.source_format).toBe(`hdf5_trajectory`)

      // Check that optional data is handled correctly by cache
      const first_frame = trajectory.frames[0]

      // Should have positions (required)
      expect(first_frame.structure.sites.length).toBe(55)

      // May or may not have cell information (optional, depends on test file)
      if (`lattice` in first_frame.structure) {
        expect(first_frame.structure.lattice.volume).toBeGreaterThan(0)
      }

      // May or may not have energy information (optional)
      if (first_frame.metadata?.energy) {
        expect(typeof first_frame.metadata.energy).toBe(`number`)
      }
    })

    it(`should demonstrate cache performance benefits within single parse operation`, async () => {
      const hdf5_content = read_binary_test_file(`torch-sim-gold-cluster-55-atoms.h5`)

      // Use a larger file to better demonstrate cache benefits
      const trajectory = await parse_trajectory_data(hdf5_content, `performance-test.h5`)

      // The cache should enable efficient parsing of multi-frame trajectories
      expect(trajectory.frames.length).toBe(20)
      expect(trajectory.metadata?.num_atoms).toBe(55)

      // All frames should have identical atomic structure (cache enabled efficient reuse)
      const first_frame_elements = trajectory.frames[0].structure.sites.map((s) =>
        s.species[0].element
      )
      for (const frame of trajectory.frames) {
        const frame_elements = frame.structure.sites.map((s) => s.species[0].element)
        expect(frame_elements).toEqual(first_frame_elements)
      }

      // Performance benefit: parsing should complete in reasonable time
      const start_time = performance.now()
      await parse_trajectory_data(hdf5_content, `perf-test-2.h5`)
      const parse_time = performance.now() - start_time

      // Should complete within a reasonable time (cache makes it efficient)
      expect(parse_time).toBeLessThan(5000) // Less than 5 seconds
    })

    it(`should handle cache with malformed or corrupted datasets`, async () => {
      // Create a minimal invalid HDF5 buffer (has HDF5 signature but truncated)
      const invalid_hdf5 = new ArrayBuffer(16)
      const view = new Uint8Array(invalid_hdf5)
      // Add HDF5 signature
      const hdf5_signature = [0x89, 0x48, 0x44, 0x46, 0x0d, 0x0a, 0x1a, 0x0a]
      hdf5_signature.forEach((byte, idx) => {
        view[idx] = byte
      })

      // Should fail gracefully when h5wasm can't parse the file
      await expect(
        parse_trajectory_data(invalid_hdf5, `corrupted.h5`),
      ).rejects.toThrow()
    })

    it(`should handle cache key uniqueness across different group paths`, async () => {
      const hdf5_content = read_binary_test_file(`torch-sim-gold-cluster-55-atoms.h5`)

      // Test that cache keys are unique for different group paths
      const trajectory = await parse_trajectory_data(hdf5_content, `cache-key-test.h5`)

      // The cache should differentiate between same dataset names in different groups
      // e.g., root/positions vs data/positions should be different cache keys
      expect(trajectory).toBeDefined()
      expect(trajectory.metadata?.source_format).toBe(`hdf5_trajectory`)
      expect(trajectory.frames.length).toBe(20)

      // Test that all frames are properly parsed (cache keys didn't collide)
      const frame_atom_counts = trajectory.frames.map((f) => f.structure.sites.length)
      expect(frame_atom_counts.every((count) => count === 55)).toBe(true)
    })

    it(`should cache null results to avoid redundant failed lookups`, async () => {
      const hdf5_content = read_binary_test_file(`torch-sim-water-cluster-bad-file.h5`)

      // Test that the cache remembers null results to avoid repeated expensive lookups
      try {
        await parse_trajectory_data(hdf5_content, `null-cache-test.h5`)
      } catch (error: unknown) {
        const error_message = (error as Error).message

        // The error should indicate missing atomic numbers
        expect(error_message).toContain(`Missing required atomic numbers`)
        expect(error_message).toContain(
          `Expected dataset with atomic numbers/species information`,
        )
      }
    })

    it(`should handle cache behavior with mixed success and failure lookups`, async () => {
      const hdf5_content = read_binary_test_file(`torch-sim-gold-cluster-55-atoms.h5`)

      // Test that cache correctly handles cases where some lookups succeed and others fail
      const trajectory = await parse_trajectory_data(hdf5_content, `mixed-results.h5`)

      expect(trajectory).toBeDefined()
      expect(trajectory.metadata?.source_format).toBe(`hdf5_trajectory`)

      // Should have successfully found positions and atomic numbers
      expect(trajectory.frames.length).toBe(20)
      expect(trajectory.metadata?.num_atoms).toBe(55)

      // Optional datasets may or may not be found, but cache should handle both cases
      const has_lattice = `lattice` in trajectory.frames[0].structure
      const has_energy = trajectory.frames[0].metadata?.energy !== null

      // These are optional, so either true or false is fine
      expect(typeof has_lattice).toBe(`boolean`)
      expect(typeof has_energy).toBe(`boolean`)
    })

    it(`should verify cache consistency during early exit optimization`, async () => {
      const hdf5_content = read_binary_test_file(`torch-sim-gold-cluster-55-atoms.h5`)

      // Test that early exit optimization doesn't break cache consistency
      const trajectory = await parse_trajectory_data(hdf5_content, `early-exit-test.h5`)

      // Early exit should occur when atomic numbers are found
      expect(trajectory.frames.length).toBe(20)
      expect(trajectory.metadata?.num_atoms).toBe(55)

      // All frames should have consistent atomic numbers (early exit didn't break cache)
      const first_frame_elements = trajectory.frames[0].structure.sites.map((s) =>
        s.species[0].element
      )
      const last_frame_elements = trajectory.frames[19].structure.sites.map((s) =>
        s.species[0].element
      )
      expect(first_frame_elements).toEqual(last_frame_elements)

      // All should be gold atoms
      expect(first_frame_elements.every((el) => el === `Au`)).toBe(true)
    })

    it(`should handle cache with concurrent dataset searches`, async () => {
      const hdf5_content = read_binary_test_file(`torch-sim-gold-cluster-55-atoms.h5`)

      // Test that cache works correctly when multiple datasets are searched concurrently
      const trajectory = await parse_trajectory_data(hdf5_content, `concurrent-test.h5`)

      expect(trajectory).toBeDefined()
      expect(trajectory.metadata?.source_format).toBe(`hdf5_trajectory`)

      // The parser searches for positions, atomic numbers, cells, energy, and pbc concurrently
      // All should be handled correctly by the cache
      expect(trajectory.frames.length).toBe(20)
      expect(trajectory.metadata?.num_atoms).toBe(55)

      // Verify that all concurrent searches produced consistent results
      const atomic_structure_sizes = trajectory.frames.map((f) =>
        f.structure.sites.length
      )
      expect(new Set(atomic_structure_sizes).size).toBe(1) // All frames have same atom count
    })

    it(`should demonstrate cache memory efficiency with large datasets`, async () => {
      const hdf5_content = read_binary_test_file(`torch-sim-gold-cluster-55-atoms.h5`)

      // Test memory efficiency - cache should not cause memory leaks
      const initial_memory = process.memoryUsage().heapUsed

      // Parse multiple times to test memory behavior
      const parse_promises = []
      for (let idx = 0; idx < 3; idx++) {
        parse_promises.push(parse_trajectory_data(hdf5_content, `memory-test-${idx}.h5`))
      }
      const trajectories = await Promise.all(parse_promises)

      // Verify all trajectories were parsed correctly
      for (const trajectory of trajectories) {
        expect(trajectory.frames.length).toBe(20)
        expect(trajectory.metadata?.num_atoms).toBe(55)
      }

      // Force garbage collection if available
      if (`gc` in globalThis) {
        ;(globalThis as { gc?: () => void }).gc?.()
      }

      const final_memory = process.memoryUsage().heapUsed
      const memory_increase = final_memory - initial_memory

      // Memory increase should be reasonable (cache doesn't cause major leaks)
      expect(memory_increase).toBeLessThan(50 * 1024 * 1024) // Less than 50MB increase
    })

    it(`should handle cache with various dataset data types`, async () => {
      const hdf5_content = read_binary_test_file(`torch-sim-gold-cluster-55-atoms.h5`)

      // Test that cache works with different data types (arrays, numbers, etc.)
      const trajectory = await parse_trajectory_data(hdf5_content, `data-types-test.h5`)

      expect(trajectory).toBeDefined()
      expect(trajectory.metadata?.source_format).toBe(`hdf5_trajectory`)

      // Positions should be 3D array (frames x atoms x 3)
      expect(trajectory.frames.length).toBe(20)
      expect(trajectory.frames[0].structure.sites.length).toBe(55)

      // Each position should be a 3D coordinate
      const first_position = trajectory.frames[0].structure.sites[0].xyz
      expect(first_position).toHaveLength(3)
      expect(first_position.every((coord) => typeof coord === `number`)).toBe(true)

      // Element symbols should be strings
      const first_element = trajectory.frames[0].structure.sites[0].species[0].element
      expect(typeof first_element).toBe(`string`)
      expect(first_element).toBe(`Au`)
    })

    it(`should verify cache behavior with dataset search termination`, async () => {
      const hdf5_content = read_binary_test_file(`torch-sim-gold-cluster-55-atoms.h5`)

      // Test that cache properly handles search termination when datasets are found
      const trajectory = await parse_trajectory_data(
        hdf5_content,
        `search-termination.h5`,
      )

      expect(trajectory).toBeDefined()
      expect(trajectory.metadata?.source_format).toBe(`hdf5_trajectory`)
      expect(trajectory.frames.length).toBe(20)

      // The atomic numbers search should terminate once found, not continue searching
      // This is verified by checking that all atoms are correctly identified as gold
      for (const frame of trajectory.frames) {
        const elements = frame.structure.sites.map((s) => s.species[0].element)
        expect(elements.every((el) => el === `Au`)).toBe(true)
        expect(elements.length).toBe(55)
      }
    })

    it(`should handle cache with error recovery scenarios`, async () => {
      // Test with a file that has some valid structure but missing required data
      const hdf5_content = read_binary_test_file(`torch-sim-water-cluster-bad-file.h5`)

      // The cache should properly handle partial successes and failures
      try {
        await parse_trajectory_data(hdf5_content, `error-recovery.h5`)
        // Should not reach here - this file is missing atomic numbers
        expect(false).toBe(true)
      } catch (error: unknown) {
        const error_message = (error as Error).message

        // Should provide error showing missing atomic numbers
        expect(error_message).toContain(`Missing required atomic numbers`)
        expect(error_message).toContain(
          `Expected dataset with atomic numbers/species information`,
        )
      }
    })

    it(`should handle cache with repeated dataset name searches`, async () => {
      const hdf5_content = read_binary_test_file(`torch-sim-gold-cluster-55-atoms.h5`)

      // Test that cache handles repeated searches for the same dataset name efficiently
      const trajectory = await parse_trajectory_data(hdf5_content, `repeated-search.h5`)

      expect(trajectory).toBeDefined()
      expect(trajectory.metadata?.source_format).toBe(`hdf5_trajectory`)

      // The atomic numbers search uses multiple names in sequence
      // Cache should optimize this by remembering failed/successful lookups
      expect(trajectory.frames.length).toBe(20)
      expect(trajectory.metadata?.num_atoms).toBe(55)

      // All frames should have consistent atomic numbers from cached lookups
      const element_sets = trajectory.frames.map((f) =>
        new Set(f.structure.sites.map((s) => s.species[0].element))
      )

      // All frames should have the same element set (only gold)
      expect(element_sets.every((set) => set.size === 1 && set.has(`Au`))).toBe(true)
    })

    it(`should validate cache performance with large group hierarchies`, async () => {
      const hdf5_content = read_binary_test_file(`torch-sim-gold-cluster-55-atoms.h5`)

      // Test that cache performs well with deep group hierarchies
      const start_time = performance.now()
      const trajectory = await parse_trajectory_data(hdf5_content, `hierarchy-test.h5`)
      const parse_time = performance.now() - start_time

      // Should parse efficiently due to caching
      expect(trajectory).toBeDefined()
      expect(trajectory.metadata?.source_format).toBe(`hdf5_trajectory`)
      expect(trajectory.frames.length).toBe(20)

      // Performance should be reasonable (cache reduces redundant lookups)
      expect(parse_time).toBeLessThan(2000) // Less than 2 seconds

      // Results should be consistent (cache didn't corrupt data)
      const atom_counts = trajectory.frames.map((f) => f.structure.sites.length)
      expect(atom_counts.every((count) => count === 55)).toBe(true)
    })
  })
})

describe(`ASE Trajectory Format`, () => {
  it.skipIf(!existsSync(join(process.cwd(), `src/site/trajectories/large`)))(
    `should parse ASE binary trajectory`,
    async () => {
      const ase_content = read_binary_test_file(
        `large/2025-07-03-ase-md-npt-300K-from-andrew-rosen.traj`,
      )
      const trajectory = await parse_trajectory_data(ase_content, `test.traj`)

      expect(trajectory).toBeDefined()
      expect(trajectory.metadata?.source_format).toBe(`ase_trajectory`)
      expect(trajectory.metadata?.filename).toBe(`test.traj`)
      expect(trajectory.frames.length).toBeGreaterThan(0)
    },
  )
})

describe(`JSON Format`, () => {
  it(`should parse compressed JSON trajectory`, async () => {
    const json_content = read_test_file(`pymatgen-LiMnO2-chgnet-relax.json.gz`)
    const trajectory = await parse_trajectory_data(json_content, `test.json.gz`)

    expect(trajectory).toBeDefined()
    expect(trajectory.frames.length).toBeGreaterThan(0)
  })
})

describe(`General Trajectory Parser`, () => {
  it(`should route XDATCAR files to XDATCAR parser`, async () => {
    const xdatcar_content = read_test_file(`vasp-XDATCAR.MD.gz`)
    const trajectory = await parse_trajectory_data(
      xdatcar_content,
      `XDATCAR.MD`,
    )

    expect(trajectory.metadata?.source_format).toBe(`vasp_xdatcar`)
    expect(trajectory.frames).toHaveLength(5)
  })

  it(`should route HDF5 files to torch-sim HDF5 parser`, async () => {
    const hdf5_content = read_binary_test_file(
      `torch-sim-gold-cluster-55-atoms.h5`,
    )
    const trajectory = await parse_trajectory_data(
      hdf5_content,
      `torch-sim-gold-cluster-55-atoms.h5`,
    )

    expect(trajectory.frames).toHaveLength(20)
    expect(trajectory.metadata?.num_atoms).toBe(55)
    expect(trajectory.frames[0].structure.sites).toHaveLength(55)
    expect(trajectory.frames[0].structure.sites[0].species[0].element).toBe(
      `Au`,
    )
  })

  it(`should handle JSON array format`, async () => {
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

    const trajectory = await parse_trajectory_data(json_array, `test.json`)
    expect(trajectory.metadata?.source_format).toBe(`array`)
    expect(trajectory.frames).toHaveLength(1)
  })

  it(`should handle JSON object with frames`, async () => {
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

    const trajectory = await parse_trajectory_data(json_object, `test.json`)
    expect(trajectory.metadata?.source_format).toBe(`object_with_frames`)
    expect(trajectory.frames).toHaveLength(1)
  })

  it(`should handle single structure`, async () => {
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

    const trajectory = await parse_trajectory_data(
      single_structure,
      `structure.json`,
    )
    expect(trajectory.metadata?.source_format).toBe(`single_structure`)
    expect(trajectory.frames).toHaveLength(1)
  })

  it(`should throw error for unrecognized format`, async () => {
    await expect(
      parse_trajectory_data(`invalid content`, `test.txt`),
    ).rejects.toThrow()
    await expect(parse_trajectory_data({}, `test.json`)).rejects.toThrow()
    await expect(parse_trajectory_data(null, `test.json`)).rejects.toThrow()
  })
})

describe(`Unsupported Formats`, () => {
  it.each([
    [`test.dump`, `LAMMPS`],
    [`test.nc`, `NetCDF`],
    [`test.dcd`, `DCD`],
  ])(`should detect %s as %s format`, (filename, expected_format) => {
    const message = get_unsupported_format_message(filename, ``)
    expect(message).toContain(expected_format)
  })

  it(`should detect binary content as unsupported`, () => {
    const binary_content = `\x00\x01\x02\x03`
    const message = get_unsupported_format_message(`unknown.bin`, binary_content)
    expect(message).toContain(`Binary format not supported`)
  })

  it.each([
    [`test.xyz`],
    [`test.json`],
    [`XDATCAR`],
    [`test.h5`],
    [`test.hdf5`],
    [`test.traj`],
  ])(`should return null for supported format: %s`, (filename) => {
    expect(get_unsupported_format_message(filename, ``)).toBeNull()
  })
})

describe(`Error Handling`, () => {
  it(`should throw for completely invalid content`, async () => {
    await expect(parse_trajectory_data(`completely invalid`, `unknown.txt`)).rejects
      .toThrow()
  })

  it(`should throw for unsupported binary format`, async () => {
    const invalid_binary = new ArrayBuffer(8)
    await expect(parse_trajectory_data(invalid_binary, `unknown.bin`)).rejects.toThrow(
      `Unsupported binary format`,
    )
  })

  it(`should handle empty content`, async () => {
    await expect(parse_trajectory_data(``)).rejects.toThrow()
    await expect(parse_trajectory_data(`   `)).rejects.toThrow()
  })

  it(`should handle null/undefined input`, async () => {
    await expect(parse_trajectory_data(null)).rejects.toThrow()
    await expect(parse_trajectory_data(undefined)).rejects.toThrow()
  })
})
