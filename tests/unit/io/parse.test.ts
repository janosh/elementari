import {
  parse_cif,
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
import { describe, expect, it, vi } from 'vitest'

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
    expect(result).toBeTruthy()
    expect(result!.sites).toHaveLength(sites)
    expect(result!.sites[0].species[0].element).toBe(element)
    expect(result!.lattice).toBeTruthy()
    if (lattice_a) expect(result!.lattice!.a).toBeCloseTo(lattice_a, 5)
  })

  it.each([
    {
      name: `negative scale factor`,
      content: `Test\n-27.0\n3.0 0.0 0.0\n0.0 3.0 0.0\n0.0 0.0 3.0\nH\n1\nDirect\n0.0 0.0 0.0`,
      expected: { volume: 27.0 },
    },
    {
      name: `malformed coordinates`,
      content: `Test\n1.0\n3.0 0.0 0.0\n0.0 3.0 0.0\n0.0 0.0 3.0\nH\n1\nDirect\n0.1-0.2-0.3`,
      expected: { abc: [0.1, -0.2, -0.3] },
    },
    {
      name: `element symbol cleaning`,
      content: `Test\n1.0\n3.0 0.0 0.0\n0.0 3.0 0.0\n0.0 0.0 3.0\nH_pv O/12345abc\n1 1\nDirect\n0.0 0.0 0.0\n0.5 0.5 0.5`,
      expected: { elements: [`H`, `O`] },
    },
  ])(`should handle $name`, ({ content, expected }) => {
    const result = parse_poscar(content)
    expect(result).toBeTruthy()
    if (expected.volume)
      expect(result!.lattice!.volume).toBeCloseTo(expected.volume, 1)
    if (expected.abc) expect(result!.sites[0].abc).toEqual(expected.abc)
    if (expected.elements) {
      expect(result!.sites[0].species[0].element).toBe(expected.elements[0])
      expect(result!.sites[1].species[0].element).toBe(expected.elements[1])
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
      content: `Test\n1.0\n3.0 0.0 0.0\n0.0 3.0 0.0 5.0\n0.0 0.0 3.0\nH\n1\nDirect\n0.0 0.0 0.0`,
      expected_error: `Invalid lattice vector on line 4: expected 3 coordinates, got 4`,
    },
  ])(
    `should reject lattice vectors with $name`,
    ({ content, expected_error }) => {
      const console_error_spy = vi
        .spyOn(console, `error`)
        .mockImplementation(() => {})

      const result = parse_poscar(content)
      expect(result).toBeNull()
      expect(console_error_spy).toHaveBeenCalledWith(
        `Error parsing POSCAR file:`,
        expected_error,
      )

      console_error_spy.mockRestore()
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
      expect(result).toBeTruthy()
      expect(result!.sites).toHaveLength(sites)
      expect(result!.sites[0].species[0].element).toBe(element)
      if (has_lattice) {
        expect(result!.lattice).toBeTruthy()
        if (lattice_a) expect(result!.lattice!.a).toBeCloseTo(lattice_a)
      } else {
        expect(result!.lattice).toBeUndefined()
      }
    },
  )

  it(`should handle scientific notation variants`, () => {
    const result = parse_xyz(scientific_notation_xyz)
    expect(result).toBeTruthy()
    expect(result!.sites[0].xyz[2]).toBeCloseTo(-7.22293142224e-6)
    expect(result!.sites[2].xyz[2]).toBeCloseTo(0.00567890123456)
    expect(result!.sites[3].xyz[0]).toBeCloseTo(-0.4440892098501)
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
    expect(result).toBeTruthy()
    expect(result?.sites).toHaveLength(sites)
  })

  it(`should handle non-orthogonal lattices with matrix inversion`, () => {
    // Test triclinic lattice (non-orthogonal) - this would fail with simple division method
    const triclinic_poscar = `Triclinic test\n1.0\n5.0 0.0 0.0\n2.5 4.33 0.0\n1.0 1.0 4.0\nC N\n1 1\nCartesian\n1.0 1.0 1.0\n3.5 2.5 2.0`
    const triclinic_xyz = `2\nLattice="5.0 0.0 0.0 2.5 4.33 0.0 1.0 1.0 4.0"\nC 1.0 1.0 1.0\nN 3.5 2.5 2.0`

    const poscar_result = parse_poscar(triclinic_poscar)
    const xyz_result = parse_xyz(triclinic_xyz)

    expect(poscar_result?.sites).toHaveLength(2)
    expect(xyz_result?.sites).toHaveLength(2)

    // Both parsers should give identical results for same coordinates
    for (let idx = 0; idx < 2; idx++) {
      const poscar_site = poscar_result!.sites[idx]
      const xyz_site = xyz_result!.sites[idx]

      // Fractional coordinates should match between parsers
      expect(poscar_site.abc).toEqual(
        expect.arrayContaining([
          expect.closeTo(xyz_site.abc[0], 10),
          expect.closeTo(xyz_site.abc[1], 10),
          expect.closeTo(xyz_site.abc[2], 10),
        ]),
      )

      // Verify perfect reconstruction: fractional → cartesian should match original
      const lattice = poscar_result!.lattice!.matrix
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
      content: `Test\n1.0\n3.0 0.0 0.0\n0.0 3.0 0.0\n0.0 0.0 3.0\nTi\n1\nSelective dynamics`,
    },
    {
      parser: parse_poscar,
      content: `Test\n1.0\n3.0 0.0 0.0\n0.0 3.0 0.0\n0.0 0.0 3.0\nTi\n2\nDirect\n0.0 0.0 0.0`,
    },
    { parser: parse_xyz, content: `3\nTest\nC 0.0 0.0 0.0\nH 1.0 0.0 0.0` },
    { parser: parse_xyz, content: `2\nTest\nC 0.0 0.0\nH 1.0 0.0 0.0` },
    { parser: parse_xyz, content: `invalid\nTest\nC 0.0 0.0 0.0` },
    {
      parser: parse_poscar,
      content: `Test\n1.0\n3.0 0.0 0.0\n0.0 3.0 0.0\n0.0 0.0 3.0\nTi\n1\nDirect\ninvalid 0.0 0.0`,
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
    expect(result).toBeTruthy()
    expect(result!.sites).toHaveLength(3)

    // Check lattice parameters
    expect(result!.lattice).toBeTruthy()
    expect(result!.lattice!.a).toBeCloseTo(4.916, 3)
    expect(result!.lattice!.b).toBeCloseTo(4.916, 3)
    expect(result!.lattice!.c).toBeCloseTo(5.405, 3)
    expect(result!.lattice!.alpha).toBe(90)
    expect(result!.lattice!.beta).toBe(90)
    expect(result!.lattice!.gamma).toBe(120)

    // Check sites
    expect(result!.sites[0].species[0].element).toBe(`Si`)
    expect(result!.sites[0].abc).toEqual([0.47, 0.0, 0.0])
    expect(result!.sites[0].label).toBe(`Si1`)

    expect(result!.sites[1].species[0].element).toBe(`O`)
    expect(result!.sites[1].abc).toEqual([0.41, 0.27, 0.12])
    expect(result!.sites[1].label).toBe(`O1`)

    expect(result!.sites[2].species[0].element).toBe(`O`)
    expect(result!.sites[2].abc).toEqual([0.41, 0.14, 0.88])
    expect(result!.sites[2].label).toBe(`O2`)
  })

  it(`should detect CIF format by extension`, () => {
    const result = parse_structure_file(quartz_cif, `quartz.cif`)
    expect(result).toBeTruthy()
    expect(result!.sites).toHaveLength(3)
  })

  it(`should detect CIF format by content`, () => {
    const result = parse_structure_file(quartz_cif)
    expect(result).toBeTruthy()
    expect(result!.sites).toHaveLength(3)
  })
})
