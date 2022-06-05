<script lang="ts">
  import Select from 'svelte-multiselect'
  import '../app.css'
  import { heatmap_labels } from '../labels'
  import Table from '../lib/PeriodicTable.svelte'
  import { heatmap } from '../stores'
  import { Element } from '../types'

  let selected_heatmap: (keyof Element)[] = []
  let windowWidth: number

  $: $heatmap = heatmap_labels[selected_heatmap[0]] ?? null
</script>

<svelte:window bind:innerWidth={windowWidth} />

<h1>Periodic Table of Elements</h1>

<Select
  options={Object.keys(heatmap_labels)}
  maxSelect={1}
  bind:selected={selected_heatmap}
  placeholder="Select a heat map"
/>

<Table show_names={windowWidth > 1000} />

<style>
  h1 {
    text-align: center;
    line-height: 1.1;
    font-size: clamp(20pt, 5.5vw, 50pt);
  }
</style>
