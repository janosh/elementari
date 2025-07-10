<script lang="ts">
  import { Trajectory } from '$lib'
  import type { ComponentProps } from 'svelte'
  import { createEventDispatcher } from 'svelte'
  
  // Component props - these match the widget properties
  interface Props extends ComponentProps<typeof Trajectory> {
    width?: number
    height?: number
  }
  
  let {
    trajectory = undefined,
    current_step_idx = $bindable(0),
    layout = "auto",
    display_mode = $bindable("structure+scatter"),
    show_controls = true,
    show_fullscreen_button = true,
    width = 800,
    height = 600,
    allow_file_drop = false,
    structure_props = {},
    step_labels = 5,
    ...rest
  }: Props = $props()
  
  // Set up event dispatcher for bidirectional communication
  const dispatch = createEventDispatcher<{
    step_changed: number
  }>()
  
  // Watch for changes to current_step_idx and emit events
  $effect(() => {
    dispatch('step_changed', current_step_idx)
  })
  
  // Set up CSS custom properties for dimensions
  let style = $derived(`
    width: ${width}px;
    height: ${height}px;
  `)
</script>

<div {style}>
  <Trajectory 
    {trajectory}
    bind:current_step_idx
    {layout}
    bind:display_mode
    {show_controls}
    {show_fullscreen_button}
    {allow_file_drop}
    {structure_props}
    {step_labels}
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