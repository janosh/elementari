<script lang="ts">
  import { Element } from '../types'
  import ActiveElement from './ActiveElement.svelte'
  import ChemicalElement from './ChemicalElement.svelte'
  import ColorCustomizer from './ColorCustomizer.svelte'
  import elements from './periodic-table-data'

  export let heatmap: Record<string | number, number> = undefined
  export let showNames = true
  export let active_element: Element | null = null
</script>

<div class="periodic-table">
  {#if active_element}
    <ActiveElement element={active_element} />
  {/if}

  {#each elements as element}
    <ChemicalElement
      {element}
      on:mouseenter={() => (active_element = element)}
      showName={showNames}
      style="grid-column: {element.column}; grid-row: {element.row};"
    />
  {/each}
  <div class="spacer" />
</div>
<ColorCustomizer collapsible={false} />

<style>
  div.periodic-table {
    display: grid;
    grid-template-columns: repeat(18, 1fr);
    gap: 0.2vw;
    min-width: 600px;
    max-width: 1500px;
    position: relative;
    margin: 2em auto 4em;
  }
  div.spacer {
    height: 24pt;
    grid-row: 8;
  }
</style>
