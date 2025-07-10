/**
 * MatterViz Notebook Extension Frontend
 * 
 * This module provides the frontend JavaScript/TypeScript code for the 
 * MatterViz anywidget notebook extension, wrapping the Structure.svelte 
 * and Trajectory.svelte components for use in Jupyter notebooks.
 */

import type { AnyModel, OnChange } from '@anywidget/types'

// Import the Svelte components we want to use
import StructureApp from './StructureApp.svelte'
import TrajectoryApp from './TrajectoryApp.svelte'

interface StructureModel extends AnyModel {
  get(key: 'structure'): any
  get(key: 'atom_radius'): number
  get(key: 'show_atoms'): boolean
  get(key: 'show_bonds'): boolean
  get(key: 'show_site_labels'): boolean
  get(key: 'show_image_atoms'): boolean
  get(key: 'show_force_vectors'): boolean
  get(key: 'same_size_atoms'): boolean
  get(key: 'auto_rotate'): number
  get(key: 'force_vector_scale'): number
  get(key: 'force_vector_color'): string
  get(key: 'bond_thickness'): number
  get(key: 'bond_color'): string
  get(key: 'bonding_strategy'): string
  get(key: 'cell_edge_opacity'): number
  get(key: 'cell_surface_opacity'): number
  get(key: 'cell_edge_color'): string
  get(key: 'cell_surface_color'): string
  get(key: 'cell_line_width'): number
  get(key: 'show_vectors'): boolean
  get(key: 'color_scheme'): string
  get(key: 'background_color'): string | null
  get(key: 'background_opacity'): number
  get(key: 'width'): number
  get(key: 'height'): number
  get(key: 'show_controls'): boolean
  get(key: 'show_info'): boolean
  get(key: 'show_fullscreen_button'): boolean
  get(key: 'png_dpi'): number
  on(event: 'change:structure', callback: OnChange['structure']): void
  on(event: string, callback: OnChange): void
}

interface TrajectoryModel extends AnyModel {
  get(key: 'trajectory'): any
  get(key: 'current_step_idx'): number
  get(key: 'layout'): string
  get(key: 'display_mode'): string
  get(key: 'show_controls'): boolean
  get(key: 'show_fullscreen_button'): boolean
  get(key: 'width'): number
  get(key: 'height'): number
  get(key: 'atom_radius'): number
  get(key: 'show_atoms'): boolean
  get(key: 'show_bonds'): boolean
  get(key: 'show_site_labels'): boolean
  get(key: 'show_image_atoms'): boolean
  get(key: 'show_force_vectors'): boolean
  get(key: 'same_size_atoms'): boolean
  get(key: 'auto_rotate'): number
  get(key: 'color_scheme'): string
  get(key: 'step_labels'): number | number[] | null
  on(event: 'change:trajectory', callback: OnChange['trajectory']): void
  on(event: 'change:current_step_idx', callback: OnChange['current_step_idx']): void
  on(event: string, callback: OnChange): void
}

// Export render functions for anywidget
export function render({ model, el }: { model: StructureModel | TrajectoryModel; el: HTMLElement }) {
  // Determine which widget to render based on model properties
  if ('trajectory' in model.attributes) {
    return renderTrajectory({ model: model as TrajectoryModel, el })
  } else {
    return renderStructure({ model: model as StructureModel, el })
  }
}

function renderStructure({ model, el }: { model: StructureModel; el: HTMLElement }) {
  // Create reactive props object that updates when model changes
  const getProps = () => ({
    // Core structure data
    structure: model.get('structure'),
    
    // Scene visualization properties
    scene_props: {
      atom_radius: model.get('atom_radius'),
      show_atoms: model.get('show_atoms'),
      auto_rotate: model.get('auto_rotate'),
      same_size_atoms: model.get('same_size_atoms'),
      show_bonds: model.get('show_bonds'),
      show_force_vectors: model.get('show_force_vectors'),
      force_vector_scale: model.get('force_vector_scale'),
      force_vector_color: model.get('force_vector_color'),
      bond_thickness: model.get('bond_thickness'),
      bond_color: model.get('bond_color'),
      bonding_strategy: model.get('bonding_strategy'),
    },
    
    // Lattice properties
    lattice_props: {
      cell_edge_opacity: model.get('cell_edge_opacity'),
      cell_surface_opacity: model.get('cell_surface_opacity'),
      cell_edge_color: model.get('cell_edge_color'),
      cell_surface_color: model.get('cell_surface_color'),
      cell_line_width: model.get('cell_line_width'),
      show_vectors: model.get('show_vectors'),
    },
    
    // Display options
    show_site_labels: model.get('show_site_labels'),
    show_image_atoms: model.get('show_image_atoms'),
    color_scheme: model.get('color_scheme'),
    background_color: model.get('background_color'),
    background_opacity: model.get('background_opacity'),
    
    // Widget configuration
    width: model.get('width'),
    height: model.get('height'),
    show_buttons: model.get('show_controls'),
    enable_info: model.get('show_info'),
    fullscreen_toggle: model.get('show_fullscreen_button'),
    allow_file_drop: false, // Disable file drop in notebook context
    png_dpi: model.get('png_dpi'),
  })

  // Create Svelte component
  const app = new StructureApp({
    target: el,
    props: getProps()
  })

  // Update component when model changes
  const updateComponent = () => {
    app.$set(getProps())
  }

  // Listen for model changes
  model.on('change:structure', updateComponent)
  model.on('change:atom_radius', updateComponent)
  model.on('change:show_atoms', updateComponent)
  model.on('change:show_bonds', updateComponent)
  model.on('change:show_site_labels', updateComponent)
  model.on('change:show_image_atoms', updateComponent)
  model.on('change:show_force_vectors', updateComponent)
  model.on('change:same_size_atoms', updateComponent)
  model.on('change:auto_rotate', updateComponent)
  model.on('change:color_scheme', updateComponent)
  model.on('change:background_color', updateComponent)
  model.on('change:background_opacity', updateComponent)
  model.on('change:width', updateComponent)
  model.on('change:height', updateComponent)
  model.on('change:show_controls', updateComponent)
  model.on('change:show_info', updateComponent)
  model.on('change:show_fullscreen_button', updateComponent)

  // Return cleanup function
  return () => {
    app.$destroy()
  }
}

function renderTrajectory({ model, el }: { model: TrajectoryModel; el: HTMLElement }) {
  // Create reactive props object
  const getProps = () => ({
    // Core trajectory data
    trajectory: model.get('trajectory'),
    current_step_idx: model.get('current_step_idx'),
    
    // Layout and display
    layout: model.get('layout'),
    display_mode: model.get('display_mode'),
    show_controls: model.get('show_controls'),
    show_fullscreen_button: model.get('show_fullscreen_button'),
    
    // Widget configuration
    width: model.get('width'),
    height: model.get('height'),
    allow_file_drop: false, // Disable file drop in notebook context
    
    // Structure properties for embedded Structure component
    structure_props: {
      scene_props: {
        atom_radius: model.get('atom_radius'),
        show_atoms: model.get('show_atoms'),
        auto_rotate: model.get('auto_rotate'),
        same_size_atoms: model.get('same_size_atoms'),
        show_bonds: model.get('show_bonds'),
        show_force_vectors: model.get('show_force_vectors'),
      },
      show_site_labels: model.get('show_site_labels'),
      show_image_atoms: model.get('show_image_atoms'),
      color_scheme: model.get('color_scheme'),
      allow_file_drop: false,
    },
    
    // Plot configuration
    step_labels: model.get('step_labels'),
  })

  // Create Svelte component
  const app = new TrajectoryApp({
    target: el,
    props: getProps()
  })

  // Update component when model changes
  const updateComponent = () => {
    app.$set(getProps())
  }

  // Listen for model changes
  model.on('change:trajectory', updateComponent)
  model.on('change:current_step_idx', updateComponent)
  model.on('change:layout', updateComponent)
  model.on('change:display_mode', updateComponent)
  model.on('change:show_controls', updateComponent)
  model.on('change:show_fullscreen_button', updateComponent)
  model.on('change:width', updateComponent)
  model.on('change:height', updateComponent)
  model.on('change:atom_radius', updateComponent)
  model.on('change:show_atoms', updateComponent)
  model.on('change:show_bonds', updateComponent)
  model.on('change:show_site_labels', updateComponent)
  model.on('change:show_image_atoms', updateComponent)
  model.on('change:show_force_vectors', updateComponent)
  model.on('change:same_size_atoms', updateComponent)
  model.on('change:auto_rotate', updateComponent)
  model.on('change:color_scheme', updateComponent)
  model.on('change:step_labels', updateComponent)

  // Handle bidirectional synchronization for current step
  app.$on('step_changed', (event: CustomEvent<number>) => {
    model.set('current_step_idx', event.detail)
    model.save_changes()
  })

  // Return cleanup function
  return () => {
    app.$destroy()
  }
}