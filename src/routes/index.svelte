<script lang="ts">
  import Select from 'svelte-multiselect'
  import '../app.css'
  import { heatmap_labels } from '../labels'
  import PeriodicTable from '../lib/PeriodicTable.svelte'
  import { heatmap } from '../stores'

  let windowWidth: number
</script>

<svelte:window bind:innerWidth={windowWidth} />

<h1>Periodic Table of Elements</h1>

<Select
  options={Object.keys(heatmap_labels)}
  maxSelect={1}
  on:add={(e) => ($heatmap = heatmap_labels[e.detail.option])}
  on:remove={() => ($heatmap = null)}
  placeholder="Select a heat map"
/>

<PeriodicTable show_names={windowWidth > 1000} />

<style>
  h1 {
    text-align: center;
    line-height: 1.1;
    font-size: clamp(20pt, 5.5vw, 50pt);
  }
</style>
