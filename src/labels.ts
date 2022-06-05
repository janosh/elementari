import { Element } from './types'

export const heatmap_labels: Record<string, keyof Element> = {
  'Atomic Mass (u)': `atomic_mass`,
  'Atomic Radius (Å)': `atomic_radius`,
  'Covalent Radius (Å)': `covalent_radius`,
  Electronegativity: `electronegativity`,
  'Density (solid: g/cm³, gas: g/liter)': `density`,
  'Boiling Point (K)': `boiling_point`,
  'Melting Point (K)': `melting_point`,
  'First Ionization Energy (eV)': `first_ionization`,
}
