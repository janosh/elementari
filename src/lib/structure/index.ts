// Utilities for dealing with pymatgen Structures
import type { ElementSymbol, Vector } from '$lib'
import { add, format_num, scale } from '$lib'
import element_data from '$lib/element/data'

export { default as Bond } from './Bond.svelte'
export * as bonding_strategies from './bonding'
export { default as Lattice } from './Lattice.svelte'
export { default as Structure } from './Structure.svelte'
export { default as StructureCard } from './StructureCard.svelte'
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

export type PymatgenLattice = {
  matrix: [Vector, Vector, Vector]
  pbc: [boolean, boolean, boolean]
  volume: number
} & { [key in (typeof lattice_param_keys)[number]]: number }

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
      // deno-lint-ignore no-non-null-assertion
      if (elem in elements) elements[elem]! += occu
      else elements[elem] = occu
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

function generate_permutations(length: number): number[][] {
  // generate all permutations of 0s and 1s of length `length`
  const result: number[][] = []
  for (let idx = 0; idx < Math.pow(2, length); idx++) {
    const binaryString = idx.toString(2).padStart(length, `0`)
    result.push(Array.from(binaryString).map(Number))
  }
  return result
}

export function find_image_atoms(
  structure: PymatgenStructure,
  { tolerance = 0.05 }: { tolerance?: number } = {},
  // fractional tolerance for determining if a site is at the edge of the cell
): [number, Vector][] {
  /*
    This function finds all atoms on corners and faces of the cell needed to make the cell symmetrically occupied.
    It returns an array of [atom_idx, image_xyz] pairs where atom_idx is the index of
    the original atom and image_xyz is the position of one of its images.
  */
  if (!structure.lattice) return []

  const edge_sites: Array<[number, Vector]> = []
  const permutations = generate_permutations(3) //  [1, 0, 0], [0, 1, 0], etc.
  const lattice_vecs = structure.lattice?.matrix

  for (const [idx, site] of structure.sites.entries()) {
    const abc = site.abc
    edge_sites.push([idx, site.xyz])

    // Check if the site is at the edge and determine its image
    // based on whether fractional coordinates are close to 0 or 1
    const edges: number[] = [0, 1, 2].filter(
      (idx) => Math.abs(abc[idx]) < tolerance || Math.abs(abc[idx] - 1) < tolerance,
    )

    if (edges.length > 0) {
      for (const perm of permutations) {
        let img_xyz: Vector = [...site.xyz] // copy site.xyz
        for (const edge of edges) {
          if (perm[edge] === 1) {
            if (Math.abs(abc[edge]) < tolerance) {
              // if fractional coordinate is close to 0, add lattice vector to get image location
              const sum = add(img_xyz, lattice_vecs[edge])
              img_xyz = [sum[0], sum[1], sum[2]] as Vector
            } else {
              // if fractional coordinate is close to 1, subtract lattice vector to get image location
              const diff = add(img_xyz, scale(lattice_vecs[edge], -1))
              img_xyz = [diff[0], diff[1], diff[2]] as Vector
            }
          }
        }
        edge_sites.push([idx, img_xyz])
      }
    }
  }

  return edge_sites
}

// this function takes a pymatgen Structure and returns a new one with all the image atoms added
export function get_pbc_image_sites(
  ...args: Parameters<typeof find_image_atoms>
): PymatgenStructure {
  const edge_sites = find_image_atoms(...args)
  const structure = args[0]

  const symmetrized_structure: PymatgenStructure = { ...structure }
  symmetrized_structure.sites = [...structure.sites]

  // add all the image atoms as new sites
  for (const [site_idx, img_xyz] of edge_sites) {
    const new_site = structure.sites[site_idx]
    // copy original site
    symmetrized_structure.sites.push({ ...new_site, xyz: img_xyz })
  }

  return symmetrized_structure
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
