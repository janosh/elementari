<script lang="ts">
  import GitHubCorner from 'svelte-github-corner'
  import Select from 'svelte-multiselect'
  import '../app.css'
  import Table from '../lib/PeriodicTable.svelte'
  import { Element } from '../types'

  let selected_heatmap: (keyof Element)[] = []
  let windowWidth: number

  const heatmap_options: Record<string, keyof Element> = {
    'Atomic Mass': `atomic_mass`,
    'Atomic Radius': `atomic_radius`,
    Electronegativity: `electronegativity`,
    Density: `density`,
    'Boiling Point': `boiling_point`,
    'Melting Point': `melting_point`,
    'Year of Discovery': `year`,
  }
  $: heatmap_name = heatmap_options[selected_heatmap[0]] ?? null
</script>

<svelte:window bind:innerWidth={windowWidth} />

<GitHubCorner href="https://github.com/janosh/periodic-table" />

<main>
  <h1>Periodic Table of Elements</h1>

  <Select
    options={Object.keys(heatmap_options)}
    maxSelect={1}
    bind:selected={selected_heatmap}
    placeholder="Select a heat map"
  />

  <Table showNames={windowWidth > 1000} {heatmap_name} />
</main>

<footer>
  <a href="https://github.com/janosh/periodic-table">MIT License 2022</a>
</footer>

<style>
  main {
    width: 100%;
  }
  :global(:root) {
    --ghc-color: var(--page-bg);
    --ghc-bg: white;
    --sms-options-bg: black;
    --sms-max-width: 16em;
  }
  :global(div.multiselect) {
    margin: auto;
  }
  h1 {
    text-align: center;
    line-height: 1.1;
    font-size: clamp(20pt, 5.5vw, 50pt);
  }
  footer {
    margin: 4em 0;
    text-align: center;
  }
</style>
