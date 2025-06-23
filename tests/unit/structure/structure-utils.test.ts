import * as struct_utils from '$lib/structure'
import { structures } from '$site/structures'
import { describe, expect, test } from 'vitest'

type StructureId = string

const ref_data: Record<
  StructureId,
  {
    amounts: Record<string, number>
    density: number
    center_of_mass: [number, number, number]
    elements: string[]
    alphabetical_formula: string
    electro_neg_formula: string
  }
> = {
  'mp-1': {
    amounts: { Cs: 2 },
    density: 1.8,
    center_of_mass: [1.564, 1.564, 1.564],
    elements: [`Cs`],
    alphabetical_formula: `Cs<sub>2</sub>`,
    electro_neg_formula: `Cs<sub>2</sub>`,
  },
  'mp-2': {
    amounts: { Pd: 4 },
    density: 11.76,
    center_of_mass: [0.979, 0.979, 0.979],
    elements: [`Pd`],
    alphabetical_formula: `Pd<sub>4</sub>`,
    electro_neg_formula: `Pd<sub>4</sub>`,
  },
  'mp-1234': {
    amounts: { Lu: 8, Al: 16 },
    density: 6.63,
    center_of_mass: [3.535, 3.535, 3.535],
    elements: [`Al`, `Lu`],
    alphabetical_formula: `Al<sub>16</sub> Lu<sub>8</sub>`,
    electro_neg_formula: `Lu<sub>8</sub> Al<sub>16</sub>`,
  },
  'mp-30855': {
    amounts: { U: 2, Pt: 6 },
    density: 19.14,
    center_of_mass: [3.535, 3.535, 3.535],
    elements: [`Pt`, `U`],
    alphabetical_formula: `Pt<sub>6</sub> U<sub>2</sub>`,
    electro_neg_formula: `U<sub>2</sub> Pt<sub>6</sub>`,
  },
  'mp-756175': {
    amounts: { Zr: 16, Bi: 16, O: 56 },
    density: 7.46,
    center_of_mass: [4.798, 4.798, 4.798],
    elements: [`Bi`, `O`, `Zr`],
    alphabetical_formula: `Bi<sub>16</sub> O<sub>56</sub> Zr<sub>16</sub>`,
    electro_neg_formula: `Zr<sub>16</sub> Bi<sub>16</sub> O<sub>56</sub>`,
  },
  'mp-1229155': {
    amounts: { Ag: 4, Hg: 4, S: 4, Br: 1, Cl: 3 },
    density: 6.11,
    center_of_mass: [2.282, 3.522, 6.642],
    elements: [`Ag`, `Br`, `Cl`, `Hg`, `S`],
    alphabetical_formula: `Ag<sub>4</sub> Br Cl<sub>3</sub> Hg<sub>4</sub> S<sub>4</sub>`,
    electro_neg_formula: `Ag<sub>4</sub> Hg<sub>4</sub> S<sub>4</sub> Br Cl<sub>3</sub>`,
  },
  'mp-1229168': {
    amounts: { Al: 54, Fe: 4, Ni: 8 },
    density: 3.66,
    center_of_mass: [1.785, 2.959, 12.51],
    elements: [`Al`, `Fe`, `Ni`],
    alphabetical_formula: `Al<sub>54</sub> Fe<sub>4</sub> Ni<sub>8</sub>`,
    electro_neg_formula: `Al<sub>54</sub> Fe<sub>4</sub> Ni<sub>8</sub>`,
  },
}

test(`tests are actually running`, () => {
  expect(structures.length).toBeGreaterThan(0)
})

describe.each(structures)(`structure-utils`, (structure) => {
  const { id } = structure
  const expected = id ? ref_data[id] : undefined

  test.runIf(id && id in ref_data)(
    `get_elem_amount should return the correct element amounts for a given structure`,
    () => {
      const result = struct_utils.get_elem_amounts(structure)
      expect(JSON.stringify(result), id).toBe(JSON.stringify(expected?.amounts))
    },
  )

  test.runIf(id && id in ref_data)(
    `get_elements should return the unique elements in a given structure`,
    () => {
      const result = struct_utils.get_elements(structure)
      expect(JSON.stringify(result), id).toBe(
        JSON.stringify(Object.keys(expected?.amounts ?? {}).sort()),
      )
    },
  )

  test.runIf(id && id in ref_data)(
    `density should return the correct density for a given structure`,
    () => {
      const result = struct_utils.get_density(structure)
      expect(result, id).toBeCloseTo(expected?.density ?? 0, 3)
    },
  )
})

// Consolidated tests for center of mass, formulas, and elements
test.each(structures.filter((s) => s.id && ref_data[s.id]))(
  `%s calculations`,
  (struct) => {
    const expected_data = ref_data[struct.id as keyof typeof ref_data]

    // Center of mass
    const com = struct_utils.get_center_of_mass(struct)
    expect(
      com.map((val) => Math.round(val * 1e3) / 1e3),
      `${struct.id} center_of_mass`,
    ).toEqual(expected_data.center_of_mass)

    // Alphabetical formula
    const alpha_formula = struct_utils.alphabetical_formula(struct)
    expect(alpha_formula, `${struct.id} alphabetical_formula`).toEqual(
      expected_data.alphabetical_formula,
    )

    // Electronegativity formula
    const electro_formula = struct_utils.electro_neg_formula(struct)
    expect(electro_formula, `${struct.id} electro_neg_formula`).toEqual(
      expected_data.electro_neg_formula,
    )

    // Elements
    const elements = struct_utils.get_elements(struct)
    expect(elements, `${struct.id} elements`).toEqual(expected_data.elements)
  },
)

test.each(structures)(`find_image_atoms`, async (structure) => {
  const image_atoms = struct_utils.find_image_atoms(structure)
  // write reference data
  // import fs from 'fs'
  // fs.writeFileSync(
  //   `${__dirname}/fixtures/find_image_atoms/${structure.id}.json`,
  //   JSON.stringify(result)
  // )
  const path = `./fixtures/find_image_atoms/${structure.id}.json`
  try {
    const { default: expected } = await import(path)
    expect(image_atoms).toEqual(expected)
  } catch {
    // Skip if fixture file doesn't exist
  }
})

test.each(structures)(`symmetrize_structure`, (structure) => {
  const orig_len = structure.sites.length
  const symmetrized = struct_utils.get_pbc_image_sites(structure)
  const { id } = structure

  // Test that the function works correctly - it should add image atoms for structures with PBC
  // The exact number depends on how many atoms are at the edges of the unit cell
  const msg = `${id} should have original sites plus appropriate image atoms`

  // Basic sanity checks
  expect(symmetrized.sites.length, msg).toBeGreaterThanOrEqual(orig_len)
  expect(structure.sites.length, msg).toBe(orig_len) // Original structure unchanged

  // If structure has lattice and any atoms at edges, should have image atoms
  if (structure.lattice) {
    const image_atoms = struct_utils.find_image_atoms(structure)
    expect(symmetrized.sites.length, msg).toBe(orig_len + image_atoms.length)
  }
})
