// Utilities for dealing with pymatgen Structures
import type { ElementSymbol, Vector } from '$lib'
import { add, pretty_num, scale } from '$lib'
import element_data from '$lib/element/data'

export { default as Bond } from './Bond.svelte'
export { default as Lattice } from './Lattice.svelte'
export { default as Structure } from './Structure.svelte'
export { default as StructureCard } from './StructureCard.svelte'
export { default as StructureLegend } from './StructureLegend.svelte'
export { default as StructureScene } from './StructureScene.svelte'
export * as bonding_strategies from './bonding'

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

export type PymatgenLattice = {
  matrix: [Vector, Vector, Vector]
  pbc: boolean[]
  a: number
  b: number
  c: number
  alpha: number
  beta: number
  gamma: number
  volume: number
}

export type PymatgenStructure = {
  lattice: PymatgenLattice
  sites: Site[]
  charge: number
  id?: string
}

export type Edge = {
  to_jimage: [number, number, number]
  id: number
  key: number
}

export type Node = {
  id: number
}

export type Graph = {
  directed: boolean
  multigraph: boolean
  graph: [
    ['edge_weight_name', null] | ['edge_weight_units', null] | ['name', string],
  ]
  nodes: Node[]
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

// remove lattice from pymatgen Structure
export type PymatgenMolecule = Omit<PymatgenStructure, 'lattice'>

export type Atoms = PymatgenStructure | PymatgenMolecule
export type AtomsGraph = Atoms & { graph: Graph }

export function get_elem_amounts(structure: PymatgenStructure) {
  const elements: Partial<Record<ElementSymbol, number>> = {}
  for (const site of structure.sites) {
    for (const species of site.species) {
      const { element: elem, occu } = species
      if (elem in elements) {
        elements[elem] += occu
      } else {
        elements[elem] = occu
      }
    }
  }
  return elements
}

export function alphabetical_formula(structure: PymatgenStructure) {
  // concatenate elements in a pymatgen Structure followed by their amount in alphabetical order
  const elements = get_elem_amounts(structure)
  const formula = []
  for (const el of Object.keys(elements).sort()) {
    const amount = elements[el]
    formula.push(`${el}${amount}`)
  }
  return formula.join(` `)
}

export const atomic_radii: Record<ElementSymbol, number> = Object.fromEntries(
  element_data.map((el) => [el.symbol, (el.atomic_radius ?? 1) / 2]),
)

export const atomic_weights = Object.fromEntries(
  element_data.map((el) => [el.symbol, el.atomic_mass]),
)

export function get_elements(structure: PymatgenStructure): ElementSymbol[] {
  const elems = structure.sites.flatMap((site) =>
    site.species.map((sp) => sp.element),
  )
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
    mass += amt * atomic_weights[el]
  }
  const dens = (uA3_to_gcm3 * mass) / structure.lattice.volume
  return pretty_num(dens, prec)
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
  // fractional tolerance for determining if a site is at the edge of the unit cell
): [number, Vector][] {
  /*
    This function finds all atoms on corners and faces of the unit cell needed to make the cell symmetrically occupied.
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
      (idx) =>
        Math.abs(abc[idx]) < tolerance || Math.abs(abc[idx] - 1) < tolerance,
    )

    if (edges.length > 0) {
      for (const perm of permutations) {
        let img_xyz: Vector = [...site.xyz] // copy site.xyz
        for (const edge of edges) {
          if (perm[edge] === 1) {
            if (Math.abs(abc[edge]) < tolerance) {
              // if fractional coordinate is close to 0, add lattice vector to get image location
              img_xyz = add(img_xyz, lattice_vecs[edge])
            } else {
              // if fractional coordinate is close to 1, subtract lattice vector to get image location
              img_xyz = add(img_xyz, scale(lattice_vecs[edge], -1))
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

export function get_center_of_mass(struct_or_mol: Atoms): Vector {
  let center: Vector = [0, 0, 0]
  let total_weight = 0

  for (const site of struct_or_mol.sites) {
    // TODO this assumes there's just one species. doesn't handle disordered sites
    const wt = site.species[0].occu

    center = add(center, scale(site.xyz, wt))

    total_weight += wt
  }

  return scale(center, 1 / total_weight)
}
