<script lang="ts">
  import elements from '../periodic-table-data.ts'
  import { active_element, heatmap } from '../stores'
  import ChemicalElement from './ChemicalElement.svelte'
  import ColorCustomizer from './ColorCustomizer.svelte'
  import ElementPhoto from './ElementPhoto.svelte'
  import ElementStats from './ElementStats.svelte'
  import ScatterPlot from './ScatterPlot.svelte'
  import TableInset from './TableInset.svelte'

  export let show_names = true
</script>

<div class="periodic-table">
  <TableInset>
    {#if $heatmap}
      <ScatterPlot />
    {:else}
      <ElementStats />
    {/if}
  </TableInset>

  {#each elements as element}
    <ChemicalElement
      {element}
      on:mouseenter={() => ($active_element = element)}
      show_name={show_names}
      style="grid-column: {element.column}; grid-row: {element.row};"
      value={element[$heatmap]}
    />
  {/each}
  <div class="spacer" />

  <ElementPhoto style="grid-column: 1 / span 2; grid-row: 9 / span 2;" />
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
