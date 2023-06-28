import type { categories, elem_symbols } from './labels'

export { default as BohrAtom } from './BohrAtom.svelte'
export { default as ColorBar } from './ColorBar.svelte'
export { default as ColorScaleSelect } from './ColorScaleSelect.svelte'
export { default as Icon } from './Icon.svelte'
export { default as Nucleus } from './Nucleus.svelte'
export * from './element'
export { default as element_data } from './element/data'
export * from './labels'
export * from './ptable'
export * from './scatter'
export { default as ScatterPoint } from './scatter/ScatterPoint.svelte'
export * from './structure'

export type Category = (typeof categories)[number]

export type ElementSymbol = (typeof elem_symbols)[number]

export type Composition = Partial<Record<ElementSymbol, number>>

export type ChemicalElement = {
  'cpk-hex': string | null
  appearance: string | null
  atomic_mass: number // in atomic units (u)
  atomic_radius: number | null // in Angstrom (A)
  boiling_point: number | null // in kelvin (K)
  category: Category
  column: number // aka group, in range 1 - 18
  covalent_radius: number | null // in Angstrom (A)
  density: number
  discoverer: string
  electron_affinity: number | null
  electron_configuration_semantic: string
  electron_configuration: string
  electronegativity_pauling: number | null
  electronegativity: number | null
  first_ionization: number | null // in electron volts (eV)
  ionization_energies: number[]
  melting_point: number | null
  metal: boolean | null
  metalloid: boolean | null
  molar_heat: number | null
  electrons: number
  neutrons: number
  protons: number
  n_shells: number
  n_valence: number | null
  name: string
  natural: boolean | null
  nonmetal: boolean | null
  number_of_isotopes: number | null
  number: number
  period: number
  phase: 'Gas' | 'Liquid' | 'Solid'
  radioactive: boolean | null
  row: number // != period for lanthanides and actinides
  shells: number[]
  specific_heat: number | null
  spectral_img: string | null
  summary: string
  symbol: string
  year: number | string
}

export type Coords = { x: number; y: number }

export type DispatchPayload = CustomEvent<{
  element: ChemicalElement
  active: boolean // whether the event target tile is currently active
  dom_event: Event // the DOM event that triggered the Svelte dispatch
}>

export type PeriodicTableEvents = {
  click: DispatchPayload
  mouseenter: DispatchPayload
  mouseleave: DispatchPayload
  keyup: DispatchPayload
  keydown: DispatchPayload
  focus: DispatchPayload
  blur: DispatchPayload
}
