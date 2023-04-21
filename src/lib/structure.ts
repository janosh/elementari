// Utilities for dealing with pymatgen Structures
import type { ElementSymbol } from '.'

export type Species = {
  element: ElementSymbol
  occu: number
}

export type Site = {
  species: Species[]
  abc: number[]
  xyz: number[]
  label: string
  properties: Record<string, unknown>
}

export type Lattice = {
  matrix: number[][]
  pbc: boolean[]
  a: number
  b: number
  c: number
  alpha: number
  beta: number
  gamma: number
  volume: number
}

export type Structure = {
  charge: number
  lattice: Lattice
  sites: Site[]
}

export function get_elem_amount(structure: Structure) {
  const elements: Record<ElementSymbol, number> = {}
  for (const site of structure.sites) {
    for (const species of site.species) {
      const { element: el, occu } = species
      if (el in elements) {
        elements[el] += occu
      } else {
        elements[el] = occu
      }
    }
  }
  return elements
}

export function alphabetical_formula(structure: Structure) {
  const elements = get_elem_amount(structure)
  const formula = []
  for (const el of Object.keys(elements).sort()) {
    const amount = elements[el]
    formula.push(`${el}${amount}`)
  }
  return formula.join(` `)
}
