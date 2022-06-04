<script lang="ts">
  import { extent } from 'd3-array'
  import { scaleLinear } from 'd3-scale'
  import elements from '../periodic-table-data.ts'
  import { active_element } from '../stores'
  import { Element } from '../types'
  import ChemicalElement from './ChemicalElement.svelte'
  import ColorCustomizer from './ColorCustomizer.svelte'
  import ElementPhoto from './ElementPhoto.svelte'
  import ElementStats from './ElementStats.svelte'
  import ScatterPlot from './graph/ScatterPlot.svelte'
  import TableInset from './TableInset.svelte'

  export let show_names = true

  export let heatmap_name: keyof Element | null = null

  $: colorscale = scaleLinear()
    .domain(extent(elements.map((el) => el[heatmap_name])))
    .range([`blue`, `red`])
</script>

<div class="periodic-table">
  <TableInset>
    {#if heatmap_name}
      <ScatterPlot
        data={elements.map((el) => [el.number, el[heatmap_name], el])}
        {colorscale}
      />
    {:else}
      <ElementStats />
    {/if}
  </TableInset>

  {#each elements as element}
    {@const color = heatmap_name
      ? element[heatmap_name]
        ? colorscale(element[heatmap_name])
        : `transparent`
      : undefined}
    <ChemicalElement
      {element}
      on:mouseenter={() => ($active_element = element)}
      show_name={show_names}
      style="grid-column: {element.column}; grid-row: {element.row};"
      {color}
      value={element[heatmap_name]}
    />
  {/each}
  <div class="spacer" />

  <ElementPhoto />
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
