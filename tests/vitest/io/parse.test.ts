import {
  is_trajectory_file,
  parse_any_structure,
  parse_cif,
  parse_phonopy_yaml,
  parse_poscar,
  parse_structure_file,
  parse_xyz,
} from '$lib/io/parse'
import ba_ti_o3_tetragonal from '$site/structures/BaTiO3-tetragonal.poscar?raw'
import na_cl_cubic from '$site/structures/NaCl-cubic.poscar?raw'
import cyclohexane from '$site/structures/cyclohexane.xyz?raw'
import extended_xyz_quartz from '$site/structures/extended-xyz-quartz.xyz?raw'
import extra_data_xyz from '$site/structures/extra-data.xyz?raw'
import scientific_notation_poscar from '$site/structures/scientific-notation.poscar?raw'
import scientific_notation_xyz from '$site/structures/scientific-notation.xyz?raw'
import selective_dynamics from '$site/structures/selective-dynamics.poscar?raw'
import vasp4_format from '$site/structures/vasp4-format.poscar?raw'
import { readFileSync } from 'fs'
import process from 'node:process'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, test, vi } from 'vitest'
import { gunzipSync } from 'zlib'

// Suppress console.error for the entire test file since parse functions
// are expected to handle invalid input gracefully and log errors
let console_error_spy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  console_error_spy = vi.spyOn(console, `error`).mockImplementation(() => {})
})
afterEach(() => {
  console_error_spy.mockRestore()
})

// Load compressed phonopy files using Node.js built-in decompression
const agi_compressed = readFileSync(
  join(process.cwd(), `src/site/structures/AgI-fq978185p-phono3py_params.yaml.gz`),
)
const agi_phono3py_params = gunzipSync(agi_compressed).toString(`utf-8`)
const hea_hcp_filename = `nested-Hf36Mo36Nb36Ta36W36-hcp-mace-omat.json.gz`

const beo_compressed = readFileSync(
  join(process.cwd(), `src/site/structures/BeO-zw12zc18p-phono3py_params.yaml.gz`),
)
const beo_phono3py_params = gunzipSync(beo_compressed).toString(`utf-8`)

describe(`POSCAR Parser`, () => {
  it.each([
    {
      name: `basic direct coordinates`,
      content: ba_ti_o3_tetragonal,
      sites: 5,
      element: `Ba`,
      lattice_a: 4.001368,
    },
    {
      name: `Cartesian coordinates`,
      content: na_cl_cubic,
      sites: 8,
      element: `Na`,
    },
    {
      name: `selective dynamics`,
      content: selective_dynamics,
      sites: 8,
      element: `Si`,
    },
    {
      name: `scientific notation`,
      content: scientific_notation_poscar,
      sites: 2,
      element: `H`,
    },
    { name: `VASP 4 format`, content: vasp4_format, sites: 3, element: `H` },
  ])(`should parse $name`, ({ content, sites, element, lattice_a }) => {
    const result = parse_poscar(content)
    if (!result) throw `Failed to parse POSCAR`
    expect(result.sites).toHaveLength(sites)
    expect(result.sites[0].species[0].element).toBe(element)
    expect(result.lattice).toBeTruthy()
    if (lattice_a) expect(result.lattice?.a).toBeCloseTo(lattice_a, 5)
  })

  it.each([
    {
      name: `negative scale factor`,
      content:
        `Test\n-27.0\n3.0 0.0 0.0\n0.0 3.0 0.0\n0.0 0.0 3.0\nH\n1\nDirect\n0.0 0.0 0.0`,
      expected: { volume: 27.0 },
    },
    {
      name: `malformed coordinates`,
      content:
        `Test\n1.0\n3.0 0.0 0.0\n0.0 3.0 0.0\n0.0 0.0 3.0\nH\n1\nDirect\n0.1-0.2-0.3`,
      expected: { abc: [0.1, -0.2, -0.3] },
    },
    {
      name: `element symbol cleaning`,
      content:
        `Test\n1.0\n3.0 0.0 0.0\n0.0 3.0 0.0\n0.0 0.0 3.0\nH_pv O/12345abc\n1 1\nDirect\n0.0 0.0 0.0\n0.5 0.5 0.5`,
      expected: { elements: [`H`, `O`] },
    },
  ])(`should handle $name`, ({ content, expected }) => {
    const result = parse_poscar(content)
    if (!result) throw `Failed to parse POSCAR`
    if (expected.volume) {
      expect(result.lattice?.volume).toBeCloseTo(expected.volume, 1)
    }
    if (expected.abc) expect(result.sites[0].abc).toEqual(expected.abc)
    if (expected.elements) {
      expect(result.sites[0].species[0].element).toBe(expected.elements[0])
      expect(result.sites[1].species[0].element).toBe(expected.elements[1])
    }
  })

  it.each([
    {
      name: `too few coordinates`,
      content: `Test\n1.0\n3.0 0.0\n0.0 3.0 0.0\n0.0 0.0 3.0\nH\n1\nDirect\n0.0 0.0 0.0`,
      expected_error: `Invalid lattice vector on line 3: expected 3 coordinates, got 2`,
    },
    {
      name: `too many coordinates`,
      content:
        `Test\n1.0\n3.0 0.0 0.0\n0.0 3.0 0.0 5.0\n0.0 0.0 3.0\nH\n1\nDirect\n0.0 0.0 0.0`,
      expected_error: `Invalid lattice vector on line 4: expected 3 coordinates, got 4`,
    },
  ])(
    `should reject lattice vectors with $name`,
    ({ content, expected_error }) => {
      const result = parse_poscar(content)
      expect(result).toBeNull()
      expect(console_error_spy).toHaveBeenCalledWith(
        `Error parsing POSCAR file:`,
        expected_error,
      )
    },
  )
})

describe(`XYZ Parser`, () => {
  it.each([
    {
      name: `basic format`,
      content: cyclohexane,
      sites: 18,
      element: `C`,
      has_lattice: false,
    },
    {
      name: `extended with lattice`,
      content: extended_xyz_quartz,
      sites: 6,
      element: `Si`,
      has_lattice: true,
      lattice_a: 4.916,
    },
    {
      name: `with extra data`,
      content: extra_data_xyz,
      sites: 5,
      element: `C`,
      has_lattice: false,
    },
  ])(
    `should parse $name`,
    ({ content, sites, element, has_lattice, lattice_a }) => {
      const result = parse_xyz(content)
      if (!result) throw `Failed to parse XYZ`
      expect(result.sites).toHaveLength(sites)
      expect(result.sites[0].species[0].element).toBe(element)
      if (has_lattice) {
        expect(result.lattice).toBeTruthy()
        if (lattice_a) expect(result.lattice?.a).toBeCloseTo(lattice_a)
      } else {
        expect(result.lattice).toBeUndefined()
      }
    },
  )

  it(`should handle scientific notation variants`, () => {
    const result = parse_xyz(scientific_notation_xyz)
    if (!result) throw `Failed to parse XYZ`
    expect(result.sites[0].xyz[2]).toBeCloseTo(-7.22293142224e-6)
    expect(result.sites[2].xyz[2]).toBeCloseTo(0.00567890123456)
    expect(result.sites[3].xyz[0]).toBeCloseTo(-0.4440892098501)
  })
})

describe(`Auto-detection & Error Handling`, () => {
  it.each([
    {
      name: `XYZ by extension`,
      content: cyclohexane,
      filename: `test.xyz`,
      sites: 18,
    },
    {
      name: `POSCAR by filename`,
      content: vasp4_format,
      filename: `POSCAR`,
      sites: 3,
    },
    { name: `XYZ by content`, content: cyclohexane, sites: 18 },
    { name: `POSCAR by content`, content: ba_ti_o3_tetragonal, sites: 5 },
  ])(`should detect $name`, ({ content, filename, sites }) => {
    const result = parse_structure_file(content, filename)
    if (!result) throw `Failed to parse structure file`
    expect(result.sites).toHaveLength(sites)
  })

  it(`should handle non-orthogonal lattices with matrix inversion`, () => {
    // Test triclinic lattice (non-orthogonal) - this would fail with simple division method
    const triclinic_poscar =
      `Triclinic test\n1.0\n5.0 0.0 0.0\n2.5 4.33 0.0\n1.0 1.0 4.0\nC N\n1 1\nCartesian\n1.0 1.0 1.0\n3.5 2.5 2.0`
    const triclinic_xyz =
      `2\nLattice="5.0 0.0 0.0 2.5 4.33 0.0 1.0 1.0 4.0"\nC 1.0 1.0 1.0\nN 3.5 2.5 2.0`

    const poscar_result = parse_poscar(triclinic_poscar)
    const xyz_result = parse_xyz(triclinic_xyz)

    if (!poscar_result || !xyz_result) throw `Failed to parse POSCAR or XYZ`
    expect(poscar_result.sites).toHaveLength(2)
    expect(xyz_result.sites).toHaveLength(2)

    // Both parsers should give identical results for same coordinates
    for (let idx = 0; idx < 2; idx++) {
      const poscar_site = poscar_result.sites[idx]
      const xyz_site = xyz_result.sites[idx]

      // Fractional coordinates should match between parsers
      expect(poscar_site.abc).toEqual(
        expect.arrayContaining([
          expect.closeTo(xyz_site.abc[0], 10),
          expect.closeTo(xyz_site.abc[1], 10),
          expect.closeTo(xyz_site.abc[2], 10),
        ]),
      )

      // Verify perfect reconstruction: fractional → cartesian should match original
      const lattice = poscar_result.lattice?.matrix
      if (!lattice) throw `Failed to get lattice matrix`
      const reconstructed = [
        poscar_site.abc[0] * lattice[0][0] +
        poscar_site.abc[1] * lattice[1][0] +
        poscar_site.abc[2] * lattice[2][0],
        poscar_site.abc[0] * lattice[0][1] +
        poscar_site.abc[1] * lattice[1][1] +
        poscar_site.abc[2] * lattice[2][1],
        poscar_site.abc[0] * lattice[0][2] +
        poscar_site.abc[1] * lattice[1][2] +
        poscar_site.abc[2] * lattice[2][2],
      ]

      expect(reconstructed[0]).toBeCloseTo(poscar_site.xyz[0], 12)
      expect(reconstructed[1]).toBeCloseTo(poscar_site.xyz[1], 12)
      expect(reconstructed[2]).toBeCloseTo(poscar_site.xyz[2], 12)
    }
  })

  it.each([
    // Parser-specific errors
    { parser: parse_poscar, content: `Too short` },
    { parser: parse_xyz, content: `` },
    {
      parser: parse_poscar,
      content:
        `Test\n1.0\n3.0 0.0 0.0\n0.0 3.0 0.0\n0.0 0.0 3.0\nTi\n1\nSelective dynamics`,
    },
    {
      parser: parse_poscar,
      content:
        `Test\n1.0\n3.0 0.0 0.0\n0.0 3.0 0.0\n0.0 0.0 3.0\nTi\n2\nDirect\n0.0 0.0 0.0`,
    },
    { parser: parse_xyz, content: `3\nTest\nC 0.0 0.0 0.0\nH 1.0 0.0 0.0` },
    { parser: parse_xyz, content: `2\nTest\nC 0.0 0.0\nH 1.0 0.0 0.0` },
    { parser: parse_xyz, content: `invalid\nTest\nC 0.0 0.0 0.0` },
    {
      parser: parse_poscar,
      content:
        `Test\n1.0\n3.0 0.0 0.0\n0.0 3.0 0.0\n0.0 0.0 3.0\nTi\n1\nDirect\ninvalid 0.0 0.0`,
    },
    { parser: parse_xyz, content: `1\nTest\nC invalid 0.0 0.0` },
    // Auto-detection errors
    { parser: parse_structure_file, content: `not a structure file` },
    {
      parser: parse_structure_file,
      content: `2\nTest\n123 0.0 0.0 0.0\n456 1.0 1.0 1.0`,
    },
    {
      parser: parse_structure_file,
      content: `2\nTest\nC abc def ghi\nH 1.0 1.0 1.0`,
    },
  ])(`should handle errors gracefully`, ({ parser, content }) => {
    const result = parser(content)
    expect(result).toBeNull()
  })
})

describe(`CIF Parser`, () => {
  const quartz_cif = `data_quartz_alpha
_chemical_name_mineral                 'Quartz'
_chemical_formula_sum                  'Si O2'
_cell_length_a                         4.916
_cell_length_b                         4.916
_cell_length_c                         5.405
_cell_angle_alpha                      90
_cell_angle_beta                       90
_cell_angle_gamma                      120
_space_group_name_H-M_alt              'P 31 2 1'
_space_group_IT_number                 152

loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
_atom_site_occupancy
Si1  Si  0.470  0.000  0.000  1.000
O1   O   0.410  0.270  0.120  1.000
O2   O   0.410  0.140  0.880  1.000`

  it(`should parse CIF format correctly`, () => {
    const result = parse_cif(quartz_cif)
    if (!result) throw `Failed to parse CIF`
    expect(result.sites).toHaveLength(3)

    // Check lattice parameters
    if (!result.lattice) throw `Failed to get lattice`
    expect(result.lattice.a).toBeCloseTo(4.916, 3)
    expect(result.lattice.b).toBeCloseTo(4.916, 3)
    expect(result.lattice.c).toBeCloseTo(5.405, 3)
    expect(result.lattice.alpha).toBeCloseTo(90, 6)
    expect(result.lattice.beta).toBeCloseTo(90, 6)
    expect(result.lattice.gamma).toBeCloseTo(120, 6)

    // Check sites
    expect(result.sites[0].species[0].element).toBe(`Si`)
    expect(result.sites[0].abc).toEqual([0.47, 0.0, 0.0])
    expect(result.sites[0].label).toBe(`Si1`)

    expect(result.sites[1].species[0].element).toBe(`O`)
    expect(result.sites[1].abc).toEqual([0.41, 0.27, 0.12])
    expect(result.sites[1].label).toBe(`O1`)

    expect(result.sites[2].species[0].element).toBe(`O`)
    expect(result.sites[2].abc).toEqual([0.41, 0.14, 0.88])
    expect(result.sites[2].label).toBe(`O2`)
  })

  it(`should detect CIF format by extension`, () => {
    const result = parse_structure_file(quartz_cif, `quartz.cif`)
    if (!result) throw `Failed to parse CIF`
    expect(result.sites).toHaveLength(3)
  })

  it(`should detect CIF format by content`, () => {
    const result = parse_structure_file(quartz_cif)
    if (!result) throw `Failed to parse CIF`
    expect(result.sites).toHaveLength(3)
  })
})

describe(`Phonopy YAML Parser`, () => {
  const simple_phonopy_yaml = `
phono3py:
  version: 2.3.0
  frequency_unit_conversion_factor: 15.633302

space_group:
  type: "P6_3mc"
  number: 186
  Hall_symbol: "P 6c -2c"

primitive_cell:
  lattice:
  - [     4.556340561269590,     0.000000000000000,     0.000000000000000 ]
  - [    -2.278170280634795,     3.945906674352911,     0.000000000000000 ]
  - [     0.000000000000000,     0.000000000000000,     7.446308720723541 ]
  points:
  - symbol: Ag
    coordinates: [  0.333333333333333,  0.666666666666667,  0.001734192635380 ]
    mass: 107.868200
  - symbol: I
    coordinates: [  0.333333333333333,  0.666666666666667,  0.376708787364615 ]
    mass: 126.904470

unit_cell:
  lattice:
  - [     4.556340561269590,     0.000000000000000,     0.000000000000000 ]
  - [    -2.278170280634795,     3.945906674352912,     0.000000000000000 ]
  - [     0.000000000000000,     0.000000000000000,     7.446308720723541 ]
  points:
  - symbol: Ag
    coordinates: [  0.333333333333333,  0.666666666666667,  0.001734192635380 ]
    mass: 107.868200
    reduced_to: 1
  - symbol: I
    coordinates: [  0.333333333333333,  0.666666666666667,  0.376708787364615 ]
    mass: 126.904470
    reduced_to: 3
`

  it.each([
    {
      name: `basic phonopy YAML structure`,
      content: simple_phonopy_yaml,
      expected_result: `structure`,
      expected_sites: 2,
      expected_lattice_a: 4.556340561269590,
      site_checks: [
        {
          idx: 0,
          element: `Ag`,
          abc: [0.333333333333333, 0.666666666666667, 0.001734192635380],
          mass: 107.868200,
        },
        {
          idx: 1,
          element: `I`,
          abc: [0.333333333333333, 0.666666666666667, 0.376708787364615],
          mass: 126.904470,
        },
      ],
    },
    {
      name: `phonopy YAML with phonon_displacements`,
      content: simple_phonopy_yaml +
        `\nphonon_displacements:\n- # This should be ignored for performance\n  - 0.1\n  - 0.2\n  - 0.3`,
      expected_result: `structure`,
      expected_sites: 2,
    },
    {
      name: `invalid phonopy YAML`,
      content: `invalid: yaml: content:`,
      expected_result: `null`,
    },
    {
      name: `phonopy YAML without any cells`,
      content: `\nphono3py:\n  version: 2.3.0\nspace_group:\n  type: "P6_3mc"\n`,
      expected_result: `null`,
    },
  ])(
    `should handle $name`,
    ({ content, expected_result, expected_sites, expected_lattice_a, site_checks }) => {
      const structure = parse_phonopy_yaml(content)

      if (expected_result === `null`) {
        expect(structure).toBeNull()
      } else {
        expect(structure).toBeDefined()
        if (!expected_sites) throw `Expected sites to be number`
        expect(structure?.sites).toHaveLength(expected_sites)
        expect(structure?.lattice).toBeDefined()

        if (expected_lattice_a) {
          expect(structure?.lattice?.a).toBeCloseTo(expected_lattice_a, 6)
          expect(structure?.lattice?.volume).toBeGreaterThan(0)
        }

        if (site_checks) {
          for (const check of site_checks) {
            const site = structure?.sites[check.idx]
            expect(site?.species[0].element).toBe(check.element)
            expect(site?.abc).toEqual(check.abc)
            expect(site?.properties.mass).toBe(check.mass)
          }
        }
      }
    },
  )

  it.each([
    {
      name: `AgI phonopy file`,
      content: agi_phono3py_params,
      filename: `AgI-fq978185p-phono3py_params.yaml.gz`,
      expected_min_sites: 70,
      space_group: `P6_3mc`,
    },
    {
      name: `BeO phonopy file`,
      content: beo_phono3py_params,
      filename: `BeO-zw12zc18p-phono3py_params.yaml.gz`,
      expected_min_sites: 60,
      space_group: `F-43m`,
    },
    {
      name: `simple phonopy YAML`,
      content: simple_phonopy_yaml,
      filename: `phono3py_params.yaml`,
      expected_min_sites: 1,
      space_group: `P6_3mc`,
    },
  ])(
    `should parse and detect $name`,
    ({ content, filename, expected_min_sites }) => {
      // Test direct parsing
      const direct_result = parse_phonopy_yaml(content)
      expect(direct_result).toBeDefined()
      expect(direct_result?.sites.length).toBeGreaterThan(expected_min_sites)
      expect(direct_result?.lattice).toBeDefined()
      expect(direct_result?.lattice?.volume).toBeGreaterThan(0)

      // Test auto-detection by extension
      const by_extension = parse_structure_file(content, filename)
      expect(by_extension).toBeDefined()
      expect(by_extension?.sites.length).toBeGreaterThan(expected_min_sites)

      // Test auto-detection by content
      const by_content = parse_structure_file(content)
      expect(by_content).toBeDefined()
      expect(by_content?.sites.length).toBeGreaterThan(expected_min_sites)
    },
  )

  it.each([
    {
      name: `specific primitive cell`,
      content: simple_phonopy_yaml,
      cell_type: `primitive_cell` as const,
      expected_result: `structure`,
      expected_sites: 2,
    },
    {
      name: `specific unit cell`,
      content: simple_phonopy_yaml,
      cell_type: `unit_cell` as const,
      expected_result: `structure`,
      expected_sites: 2,
    },
    {
      name: `auto mode (explicit)`,
      content: simple_phonopy_yaml,
      cell_type: `auto` as const,
      expected_result: `structure`,
      expected_sites: 2,
    },
    {
      name: `non-existent cell type`,
      content: simple_phonopy_yaml,
      cell_type: `supercell` as const,
      expected_result: `null`,
    },
  ])(
    `should handle $name when requested`,
    ({ content, cell_type, expected_result, expected_sites }) => {
      const result = parse_phonopy_yaml(content, cell_type)

      if (expected_result === `null`) {
        expect(result).toBeNull()
      } else {
        expect(result).toBeDefined()
        if (!expected_sites) throw `Expected sites to be number`
        expect(result?.sites).toHaveLength(expected_sites)
        expect(result?.lattice).toBeDefined()
      }
    },
  )
})

describe(`Trajectory File Detection`, () => {
  it(`should detect plain .xyz files as potential trajectory files`, () => {
    // This test ensures the bug reported with Cr0.25Fe0.25Co0.25Ni0.25-mace-omat-qha.xyz.gz doesn't regress
    expect(is_trajectory_file(`trajectory.xyz`)).toBe(true)
    expect(is_trajectory_file(`Cr0.25Fe0.25Co0.25Ni0.25-mace-omat-qha.xyz`)).toBe(true)
    expect(is_trajectory_file(`single-molecule.xyz`)).toBe(true)
    expect(is_trajectory_file(`md-run.xyz`)).toBe(true)
  })

  it(`should detect various trajectory file extensions`, () => {
    expect(is_trajectory_file(`file.traj`)).toBe(true)
    expect(is_trajectory_file(`file.extxyz`)).toBe(true)
    expect(is_trajectory_file(`file.h5`)).toBe(true)
    expect(is_trajectory_file(`file.hdf5`)).toBe(true)
  })

  it(`should detect trajectory files by keyword in filename`, () => {
    expect(is_trajectory_file(`trajectory_data.json`)).toBe(true)
    expect(is_trajectory_file(`md_simulation.cif`)).toBe(true)
    expect(is_trajectory_file(`relax_output.poscar`)).toBe(true)
    expect(is_trajectory_file(`XDATCAR`)).toBe(true)
  })

  it(`should not detect non-trajectory files`, () => {
    expect(is_trajectory_file(`structure.cif`)).toBe(false)
    expect(is_trajectory_file(`molecule.json`)).toBe(false)
    expect(is_trajectory_file(`POSCAR`)).toBe(false)
    expect(is_trajectory_file(`data.txt`)).toBe(false)
  })
})

describe(`parse_structure_file`, () => {
  test(`parses nested JSON structure correctly`, () => {
    // Read the actual test file
    const compressed = readFileSync(
      `./src/site/structures/${hea_hcp_filename}`,
    )
    const content = gunzipSync(compressed).toString(`utf8`)

    const result = parse_structure_file(content, hea_hcp_filename)

    expect(result).toBeTruthy()
    expect(result?.sites).toBeDefined()
    expect(result?.sites.length).toBeGreaterThan(0)
    expect(result?.lattice).toBeDefined()

    // Check first site
    const first_site = result?.sites[0]
    expect(first_site?.species).toBeDefined()
    expect(first_site?.species[0]?.element).toBe(`Ta`)
    expect(first_site?.abc).toBeDefined()
    expect(first_site?.xyz).toBeDefined()

    // Check lattice
    expect(result?.lattice?.matrix).toBeDefined()
    expect(result?.lattice?.volume).toBeCloseTo(3218.0139605153627, 5)
  })

  test(`parses simple JSON structure correctly`, () => {
    const simple_structure = {
      sites: [
        {
          species: [{ element: `H`, occu: 1, oxidation_state: 0 }],
          abc: [0, 0, 0],
          xyz: [0, 0, 0],
          label: `H1`,
          properties: {},
        },
      ],
      lattice: {
        matrix: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        a: 1,
        b: 1,
        c: 1,
        alpha: 90,
        beta: 90,
        gamma: 90,
        volume: 1,
      },
    }

    const content = JSON.stringify(simple_structure)
    const result = parse_structure_file(content, `simple.json`)

    expect(result).toBeTruthy()
    expect(result?.sites.length).toBe(1)
    expect(result?.sites[0].species[0].element).toBe(`H`)
  })

  test(`handles multiple levels of nesting`, () => {
    const deeply_nested = {
      data: {
        materials: [
          {
            id: `test-1`,
            structure: {
              sites: [
                {
                  species: [{ element: `C`, occu: 1, oxidation_state: 0 }],
                  abc: [0.5, 0.5, 0.5],
                  xyz: [1, 1, 1],
                  label: `C1`,
                  properties: {},
                },
              ],
              lattice: {
                matrix: [[2, 0, 0], [0, 2, 0], [0, 0, 2]],
                a: 2,
                b: 2,
                c: 2,
                alpha: 90,
                beta: 90,
                gamma: 90,
                volume: 8,
              },
            },
          },
        ],
      },
    }

    const content = JSON.stringify(deeply_nested)
    const result = parse_structure_file(content, `nested.json`)

    expect(result).toBeTruthy()
    expect(result?.sites.length).toBe(1)
    expect(result?.sites[0].species[0].element).toBe(`C`)
    expect(result?.lattice?.volume).toBe(8)
  })

  test(`returns null for invalid JSON structure`, () => {
    const invalid_structure = {
      not_a_structure: `this is not a structure`,
      some_data: [1, 2, 3],
    }

    const content = JSON.stringify(invalid_structure)
    const result = parse_structure_file(content, `invalid.json`)

    expect(result).toBeNull()
  })

  test(`handles array with structure at different positions`, () => {
    const array_with_structure = [
      { id: `first`, type: `metadata` },
      { id: `second`, type: `other_data` },
      {
        id: `third`,
        structure: {
          sites: [
            {
              species: [{ element: `N`, occu: 1, oxidation_state: 0 }],
              abc: [0.25, 0.25, 0.25],
              xyz: [0.5, 0.5, 0.5],
              label: `N1`,
              properties: {},
            },
          ],
          lattice: {
            matrix: [[2, 0, 0], [0, 2, 0], [0, 0, 2]],
            a: 2,
            b: 2,
            c: 2,
            alpha: 90,
            beta: 90,
            gamma: 90,
            volume: 8,
          },
        },
      },
    ]

    const content = JSON.stringify(array_with_structure)
    const result = parse_structure_file(content, `array_structure.json`)

    expect(result).toBeTruthy()
    expect(result?.sites.length).toBe(1)
    expect(result?.sites[0].species[0].element).toBe(`N`)
  })

  test(`parses compressed HEA structure file correctly`, () => {
    // Test parsing of a real compressed JSON structure file
    const compressed = readFileSync(`./src/site/structures/${hea_hcp_filename}`)
    const content = gunzipSync(compressed).toString(`utf8`)

    // Verify the file contains valid JSON with expected structure
    const parsed = JSON.parse(content)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed.length).toBeGreaterThan(0)
    expect(parsed[0]).toHaveProperty(`structure`)

    // Validate the nested structure format
    const nested_structure = parsed[0].structure
    expect(nested_structure).toBeDefined()
    expect(typeof nested_structure).toBe(`object`)
    expect(nested_structure).toHaveProperty(`sites`)
    expect(Array.isArray(nested_structure.sites)).toBe(true)
    expect(nested_structure.sites.length).toBeGreaterThan(0)

    // Test the actual parsing function can handle this format
    const result = parse_structure_file(content, hea_hcp_filename)
    expect(result).toBeTruthy()
    expect(result?.sites).toBeDefined()
    expect(result?.sites.length).toBeGreaterThan(0)
    expect(result?.sites[0]).toHaveProperty(`species`)
    expect(result?.sites[0].species[0]).toHaveProperty(`element`)
    expect(result?.lattice).toBeDefined()
  })

  describe(`comprehensive nested structure parsing`, () => {
    const valid_structure = {
      sites: [
        {
          species: [{ element: `Fe`, occu: 1, oxidation_state: 0 }],
          abc: [0, 0, 0],
          xyz: [0, 0, 0],
          label: `Fe1`,
          properties: {},
        },
      ],
      lattice: {
        matrix: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        a: 1,
        b: 1,
        c: 1,
        alpha: 90,
        beta: 90,
        gamma: 90,
        volume: 1,
      },
    }

    test.each([
      [`simple object wrapper`, { data: valid_structure }],
      [`nested object`, { results: { structure: valid_structure } }],
      [`array wrapper`, [{ structure: valid_structure }]],
      [`mixed nesting`, { data: [{ item: { structure: valid_structure } }] }],
      [`deep nesting`, { a: { b: { c: { d: valid_structure } } } }],
      [`structure array`, { structures: [valid_structure] }],
      [`multiple items with structure`, [{ id: 1 }, { structure: valid_structure }]],
    ])(`finds structure in %s`, (_description, wrapper) => {
      const content = JSON.stringify(wrapper)
      const result = parse_structure_file(content, `test.json`)

      expect(result).toBeTruthy()
      expect(result?.sites.length).toBe(1)
      expect(result?.sites[0].species[0].element).toBe(`Fe`)
      expect(result?.lattice?.volume).toBe(1)
    })

    test.each([
      [`empty object`, {}],
      [`null structure`, { structure: null }],
      [`invalid sites`, { sites: `not_an_array` }],
      [`empty sites array`, { sites: [] }],
      [`missing species`, { sites: [{ abc: [0, 0, 0] }] }],
      [`malformed species`, { sites: [{ species: `not_array`, abc: [0, 0, 0] }] }],
      [`missing coordinates`, { sites: [{ species: [{ element: `H` }] }] }],
      [`array of invalid objects`, [{ no_structure: true }, { also_invalid: true }]],
    ])(`returns null for %s`, (_description, invalid_data) => {
      const content = JSON.stringify(invalid_data)
      const result = parse_structure_file(content, `invalid.json`)

      expect(result).toBeNull()
    })

    test.each([
      [`very deep nesting`, 10],
      [`moderate nesting`, 5],
      [`minimal nesting`, 2],
    ])(`handles %s (depth %d)`, (_description, depth) => {
      let nested_obj: object = valid_structure
      for (let idx = 0; idx < depth; idx++) {
        nested_obj = { [`level_${idx}`]: nested_obj }
      }

      const content = JSON.stringify(nested_obj)
      const result = parse_structure_file(content, `deep.json`)

      expect(result).toBeTruthy()
      expect(result?.sites[0].species[0].element).toBe(`Fe`)
    })

    test(`finds valid structure when multiple structures exist`, () => {
      const structure_a = { ...valid_structure }
      structure_a.sites[0].species[0].element = `Li`

      const structure_b = { ...valid_structure }
      structure_b.sites[0].species[0].element = `Na`

      // Test with multiple structures - should find at least one
      const data = [
        { type: `first`, structure: structure_a },
        { type: `second`, structure: structure_b },
      ]

      const content = JSON.stringify(data)
      const result = parse_structure_file(content, `multiple.json`)

      expect(result).toBeTruthy()
      expect(result?.sites.length).toBe(1)
      // Should find one of the structures (order may vary due to recursive search)
      const found_element = result?.sites[0].species[0].element
      expect([`Li`, `Na`]).toContain(found_element)
    })

    test(`handles arrays with mixed valid/invalid structures`, () => {
      const test_structure = { ...valid_structure }
      test_structure.sites[0].species[0].element = `Cu` // Use unique element

      const mixed_array = [
        { invalid: `data` },
        { sites: `not_array` }, // Invalid structure
        test_structure, // First valid structure - should be found
        { another: `structure`, ...valid_structure }, // Another valid one with Fe
      ]

      const content = JSON.stringify(mixed_array)
      const result = parse_structure_file(content, `mixed.json`)

      expect(result).toBeTruthy()
      expect(result?.sites[0].species[0].element).toBe(`Cu`) // Should find first valid structure
    })
  })

  describe(`data passing and transformation logic`, () => {
    // Using the actual implementation from shared utility
    // This ensures tests validate the real production logic
    // rather than potentially outdated mock implementations

    test.each([
      [`simple direct structure`, {
        sites: [{ species: [{ element: `H` }], abc: [0, 0, 0] }],
        charge: 0, // Include charge to match expected behavior
      }],
      [`nested in object`, {
        structure: { sites: [{ species: [{ element: `He` }], abc: [0, 0, 0] }] },
      }],
      [`nested in array`, [{
        structure: { sites: [{ species: [{ element: `Li` }], abc: [0, 0, 0] }] },
      }]],
    ])(`parse_any_structure handles %s correctly`, (description, input) => {
      const content = JSON.stringify(input)
      const result = parse_any_structure(content, `test.json`)

      expect(result).toBeTruthy()
      expect(result?.sites).toBeDefined()
      expect(result?.sites.length).toBeGreaterThan(0)

      // For direct structures, charge may be preserved; for nested, it's set to 0
      if (description.includes(`simple direct`)) {
        expect(result?.charge).toBe(0) // Direct structure should preserve charge
      } else {
        expect(result?.charge).toBe(0) // Nested structures get transformed charge
      }
    })

    test(`transforms lattice properties correctly`, () => {
      const nested_structure = {
        data: {
          structure: {
            sites: [{ species: [{ element: `C` }], abc: [0, 0, 0] }],
            lattice: {
              matrix: [[2, 0, 0], [0, 2, 0], [0, 0, 2]],
              volume: 8,
            },
          },
        },
      }

      const content = JSON.stringify(nested_structure)
      const result = parse_any_structure(content, `test.json`)

      expect(result).toBeTruthy()

      // Check if it's a crystal structure with lattice
      if (result && `lattice` in result && result.lattice) {
        expect(result.lattice.pbc).toEqual([true, true, true])
        expect(result.lattice.volume).toBe(8)
        expect(result.lattice.matrix).toEqual([[2, 0, 0], [0, 2, 0], [0, 0, 2]])
      }
    })

    test.each([
      [`malformed JSON`, `{invalid json`],
      [`completely invalid structure`, `{ "no_structure": true }`],
      [`empty string`, ``],
      [`only whitespace`, `   \n\t   `],
    ])(`handles invalid input gracefully: %s`, (_description, invalid_content) => {
      const result = parse_any_structure(invalid_content, `test.json`)
      expect(result).toBeNull()
    })

    test(`preserves all structure properties during transformation`, () => {
      const nested_with_properties = {
        result: {
          structure: {
            sites: [
              {
                species: [{ element: `Au`, occu: 0.8, oxidation_state: 1 }],
                abc: [0.5, 0.5, 0.5],
                xyz: [1, 1, 1],
                label: `Au1_site`,
                properties: { magnetic_moment: 2.5, custom_data: `test` },
              },
            ],
            lattice: {
              matrix: [[3, 0, 0], [0, 3, 0], [0, 0, 3]],
              a: 3,
              b: 3,
              c: 3,
              alpha: 90,
              beta: 90,
              gamma: 90,
              volume: 27,
              pbc: [true, false, true], // Custom PBC that should be overridden
            },
            properties: { formula: `Au`, energy: -5.2 },
            charge: 2, // Custom charge that should be overridden
          },
        },
      }

      const content = JSON.stringify(nested_with_properties)
      const result = parse_any_structure(content, `test.json`)

      expect(result).toBeTruthy()

      // Check site properties are preserved
      const site = result?.sites[0]
      expect(site?.species[0].occu).toBe(0.8)
      expect(site?.properties?.magnetic_moment).toBe(2.5)
      expect(site?.label).toBe(`Au1_site`)

      // Check lattice properties are preserved but PBC is overridden (for crystal structures)
      if (result && `lattice` in result && result.lattice) {
        expect(result.lattice.volume).toBe(27)
        expect(result.lattice.pbc).toEqual([true, true, true]) // Overridden
      }

      // Check charge is overridden
      expect(result?.charge).toBe(0) // Overridden

      // Structure-level properties may not be preserved in transformation
      // The transformation focuses on sites and lattice
      expect(result?.sites.length).toBe(1)
      if (result && `lattice` in result && result.lattice) {
        expect(result.lattice).toBeDefined()
      }
    })
  })
})
