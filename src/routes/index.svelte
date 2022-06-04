<script lang="ts">
  import GitHubCorner from 'svelte-github-corner'
  import Select from 'svelte-multiselect'
  import '../app.css'
  import Table from '../lib/PeriodicTable.svelte'
  import { Element } from '../types'

  let selected_heatmap: (keyof Element)[] = []
  let windowWidth: number

  const heatmap_options: Record<string, keyof Element> = {
    'Atomic Mass (u)': `atomic_mass`,
    'Atomic Radius (Å)': `atomic_radius`,
    'Covalent Radius (Å)': `covalent_radius`,
    Electronegativity: `electronegativity`,
    'Density (solid: g/cm³, gas: g/liter)': `density`,
    'Boiling Point (K)': `boiling_point`,
    'Melting Point (K)': `melting_point`,
    'First Ionization Energy (eV)': `first_ionization`,
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

  <Table show_names={windowWidth > 1000} {heatmap_name} />
</main>

<footer>
  <a href="https://github.com/janosh/periodic-table/blob/main/license">
    MIT License 2022
  </a>
</footer>

<style>
  main {
    width: 100%;
  }
  :global(:root) {
    --ghc-color: var(--page-bg);
    --ghc-bg: white;
    --sms-options-bg: black;
    --sms-max-width: 22em;
    --sms-border: 1px dotted teal;
    --sms-focus-border: 1px dotted cornflowerblue;
  }
  :global(div.multiselect) {
    margin: auto;
  }
  :global(div.multiselect input::placeholder) {
    opacity: 0.8;
    padding: 1ex;
  }
  h1 {
    text-align: center;
    line-height: 1.1;
    font-size: clamp(20pt, 5.5vw, 50pt);
  }
  footer {
    margin: 6em 0 0;
    text-align: center;
  }
</style>
