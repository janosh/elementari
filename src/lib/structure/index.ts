// Utilities for dealing with pymatgen Structures
import type { ElementSymbol, Vector } from '$lib'
import { format_num, scale } from '$lib'
import element_data from '$lib/element/data'

export { default as Bond } from './Bond.svelte'
export * as bonding_strategies from './bonding'
export { default as Lattice } from './Lattice.svelte'
export * from './pbc'
export { default as Structure } from './Structure.svelte'
export { default as StructureCard } from './StructureCard.svelte'
export { default as StructureControls } from './StructureControls.svelte'
export { default as StructureLegend } from './StructureLegend.svelte'
export { default as StructureScene } from './StructureScene.svelte'

export const CELL_DEFAULTS = {
  edge_opacity: 0.4,
  surface_opacity: 0.05,
  color: `#ffffff`,
  line_width: 1.5,
} as const

export const BOND_DEFAULTS = {
  thickness: 0.25,
  offset: 0,
  color: `white`,
  from_color: `white`,
  to_color: `white`,
} as const

export type Species = {
  element: ElementSymbol
  occu: number
  oxidation_state: number
}

export type Site = {
  species: Species[]
  abc: Vector
  xyz: Vector
  label: string
  properties: Record<string, unknown>
}

export const lattice_param_keys = [
  `a`,
  `b`,
  `c`,
  `alpha`,
  `beta`,
  `gamma`,
] as const

export type LatticeParams = { [key in (typeof lattice_param_keys)[number]]: number }

export type PymatgenLattice = {
  matrix: [Vector, Vector, Vector]
  pbc: [boolean, boolean, boolean]
  volume: number
} & LatticeParams

export type PymatgenMolecule = { sites: Site[]; charge?: number; id?: string }
export type PymatgenStructure = PymatgenMolecule & { lattice: PymatgenLattice }

export type Edge = {
  to_jimage: [number, number, number]
  id: number
  key: number
}

export type Graph = {
  directed: boolean
  multigraph: boolean
  graph: [
    [`edge_weight_name`, null] | [`edge_weight_units`, null] | [`name`, string],
  ]
  nodes: { id: number }[]
  adjacency: Edge[][]
}

export type StructureGraph = {
  '@module': string
  '@class': string
  structure: PymatgenStructure
  graphs: Graph[]
}

// [atom_pos_1, atom_pos_2, atom_idx_1, atom_idx_2, bond_length]
export type BondPair = [Vector, Vector, number, number, number]

export type IdStructure = PymatgenStructure & { id: string }
export type StructureWithGraph = IdStructure & { graph: Graph }

export type AnyStructure = PymatgenStructure | PymatgenMolecule
export type AnyStructureGraph = AnyStructure & { graph: Graph }

export function get_elem_amounts(structure: AnyStructure) {
  const elements: Partial<Record<ElementSymbol, number>> = {}
  for (const site of structure.sites) {
    for (const species of site.species) {
      const { element: elem, occu } = species
      elements[elem] = (elements[elem] ?? 0) + occu
    }
  }
  return elements
}

export function format_chemical_formula(
  structure: AnyStructure,
  sort_fn: (symbols: ElementSymbol[]) => ElementSymbol[],
): string {
  // concatenate elements in a pymatgen Structure followed by their amount
  const elements = get_elem_amounts(structure)
  const formula = []
  for (const el of sort_fn(Object.keys(elements) as ElementSymbol[])) {
    const amount = elements[el] ?? 0
    if (amount === 1) formula.push(el)
    else formula.push(`${el}<sub>${amount}</sub>`)
  }
  return formula.join(` `)
}

export function alphabetical_formula(structure: AnyStructure): string {
  // concatenate elements in a pymatgen Structure followed by their amount in alphabetical order
  return format_chemical_formula(structure, (symbols) => symbols.sort())
}

export function electro_neg_formula(structure: AnyStructure): string {
  // concatenate elements in a pymatgen Structure followed by their amount sorted by electronegativity
  return format_chemical_formula(structure, (symbols) => {
    return symbols.sort((el1, el2) => {
      const elec_neg1 = element_data.find((el) => el.symbol === el1)?.electronegativity ??
        0
      const elec_neg2 = element_data.find((el) => el.symbol === el2)?.electronegativity ??
        0

      // Sort by electronegativity (ascending), then alphabetically for ties
      if (elec_neg1 !== elec_neg2) return elec_neg1 - elec_neg2
      return el1.localeCompare(el2)
    })
  })
}

export const atomic_radii: Partial<Record<ElementSymbol, number>> = Object.fromEntries(
  element_data.map((el) => [el.symbol, (el.atomic_radius ?? 1) / 2]),
)

export const atomic_weights: Partial<Record<ElementSymbol, number>> = Object.fromEntries(
  element_data.map((el) => [el.symbol, el.atomic_mass]),
)

export function get_elements(structure: AnyStructure): ElementSymbol[] {
  const elems = structure.sites.flatMap((site) => site.species.map((sp) => sp.element))
  return [...new Set(elems)].sort() // unique elements
}

// unified atomic mass units (u) per cubic angstrom (Å^3)
// to grams per cubic centimeter (g/cm^3)
const uA3_to_gcm3 = 1.66053907

export function density(structure: PymatgenStructure, prec = `.2f`) {
  // calculate the density of a pymatgen Structure in
  const elements = get_elem_amounts(structure)
  let mass = 0
  for (const [el, amt] of Object.entries(elements)) {
    const element = el as ElementSymbol
    const weight = atomic_weights[element]
    if (weight !== undefined) {
      mass += amt * weight
    }
  }
  const dens = (uA3_to_gcm3 * mass) / structure.lattice.volume
  return format_num(dens, prec)
}

export function get_center_of_mass(struct_or_mol: AnyStructure): Vector {
  let center: Vector = [0, 0, 0]
  let total_weight = 0

  for (const site of struct_or_mol.sites) {
    // TODO this assumes there's just one species. doesn't handle disordered sites
    const wt = site.species[0].occu

    const scaled_pos = scale(site.xyz, wt)
    center = [
      center[0] + scaled_pos[0],
      center[1] + scaled_pos[1],
      center[2] + scaled_pos[2],
    ] as Vector

    total_weight += wt
  }

  const result = scale(center, 1 / total_weight)
  return [result[0], result[1], result[2]] as Vector
}
