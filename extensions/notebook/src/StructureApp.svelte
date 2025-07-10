<script lang="ts">
  import { Structure } from '$lib'
  import type { ComponentProps } from 'svelte'
  
  // Component props - these match the widget properties
  interface Props extends ComponentProps<typeof Structure> {
    width?: number
    height?: number
  }
  
  let {
    structure = undefined,
    scene_props = {
      atom_radius: 1,
      show_atoms: true,
      auto_rotate: 0,
      same_size_atoms: false,
    },
    lattice_props = {
      cell_edge_opacity: 0.8,
      cell_surface_opacity: 0.1,
      cell_edge_color: "#333333",
      cell_surface_color: "#333333", 
      cell_line_width: 2.0,
      show_vectors: true,
    },
    show_site_labels = false,
    show_image_atoms = true,
    color_scheme = "Vesta",
    background_color = undefined,
    background_opacity = 0.1,
    width = 600,
    height = 500,
    show_buttons = true,
    enable_info = true,
    fullscreen_toggle = true,
    allow_file_drop = false,
    png_dpi = 150,
    ...rest
  }: Props = $props()
  
  // Set up CSS custom properties for dimensions
  let style = $derived(`
    --struct-width: ${width}px;
    --struct-height: ${height}px;
    width: ${width}px;
    height: ${height}px;
  `)
</script>

<div {style}>
  <Structure 
    {structure}
    {scene_props}
    {lattice_props}
    {show_site_labels}
    {show_image_atoms}
    {color_scheme}
    {background_color}
    {background_opacity}
    {show_buttons}
    {enable_info}
    {fullscreen_toggle}
    {allow_file_drop}
    {png_dpi}
    {...rest}
  />
</div>

<style>
  div {
    display: block;
    position: relative;
    border-radius: 4px;
    overflow: hidden;
  }
</style>