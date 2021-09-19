export type Element = {
  appearance: string
  atomic_mass: number
  atomic_radius: number
  boil: string
  boiling_point: number
  category: string
  column: number // aka group
  covalent_radius: number
  density: number
  discoverer: string
  electron_affinity: number
  electron_configuration_semantic: string
  electron_configuration: string
  electronegativity_pauling: number
  electronegativity: number
  first_ionization: number
  ionization_energies: number[]
  jmol_color: string
  melt: string
  melting_point: number
  metal: boolean | null
  metalloid: boolean | null
  molar_heat: number
  n_electrons: number
  n_neutrons: number
  n_protons: number
  n_shells: number
  n_valence: number
  name: string
  named_by: string
  natural: boolean | null
  nonmetal: boolean | null
  number_of_isotopes: number
  number: number
  phase: string
  radioactive: boolean | null
  row: number // != period for lanthanides and actinides
  shells: number[]
  source: string
  specific_heat: number
  spectral_img: string
  summary: string
  symbol: string
  year: number | string
}
