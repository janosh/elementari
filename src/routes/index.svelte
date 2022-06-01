<script lang="ts">
  import GitHubCorner from 'svelte-github-corner'
  import Select from 'svelte-multiselect'
  import '../app.css'
  import Table from '../lib/PeriodicTable.svelte'
  import { Element } from '../types'

  let selected_heatmap: (keyof Element)[] = []

  const heatmap_options = [
    [`atomic_mass`, `Atomic Mass`],
    [`atomic_radius`, `Atomic Radius`],
    [`electronegativity`, `Electronegativity`],
    [`density`, `Density`],
    [`boiling_point`, `Boiling Point`],
    [`melting_point`, `Melting Point`],
    [`year`, `Year of Discovery`],
  ].map(([value, label]) => ({ value, label }))
</script>

<GitHubCorner href="https://github.com/janosh/periodic-table" />

<main>
  <h1>Periodic Table of Elements</h1>

  <Select
    options={heatmap_options}
    maxSelect={1}
    bind:selectedValues={selected_heatmap}
    placeholder="Select a heat map"
  />

  <Table showNames heatmap={selected_heatmap[0] ?? false} />
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
