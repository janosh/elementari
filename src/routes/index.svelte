<script lang="ts">
  import GitHubCorner from 'svelte-github-corner'
  import '../app.css'
  import Table from '../lib/PeriodicTable.svelte'
</script>

<GitHubCorner href="https://github.com/janosh/periodic-table" />

<main>
  <h1>Periodic Table of Elements</h1>

  <Table showNames />

  <h2>Todos</h2>
  <ul>
    <li>support plotting heatmaps</li>
    <li>add detail pages with additional stats and properties for each element</li>
    <li>
      by popular request, show lethal dose (LD50) for hovered element in
      ActiveElement.svelte
    </li>
  </ul>
</main>

<style>
  main {
    width: 100%;
  }
  :global(:root) {
    --ghc-color: var(--page-bg);
    --ghc-bg: white;
  }
  h1 {
    text-align: center;
    line-height: 1.1;
    font-size: clamp(20pt, 5.5vw, 50pt);
  }
</style>
