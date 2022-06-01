<script lang="ts">
  import { extent } from 'd3-array'
  import { scaleLinear } from 'd3-scale'
  import { Element } from '../types'
  import ActiveElement from './ActiveElement.svelte'
  import ChemicalElement from './ChemicalElement.svelte'
  import ColorCustomizer from './ColorCustomizer.svelte'
  import elements from './periodic-table-data'

  export let showNames = true
  export let active_element: Element | null = null

  export let heatmap: keyof Element | false = false

  $: colorscale = scaleLinear()
    .domain(extent(elements.map((el) => el[heatmap])))
    .range([`blue`, `red`])
</script>

<div class="periodic-table">
  <ActiveElement element={active_element} />

  {#each elements as element}
    {@const color = heatmap ? colorscale(element[heatmap]) : null}
    <ChemicalElement
      {element}
      on:mouseenter={() => (active_element = element)}
      showName={showNames}
      style="grid-column: {element.column}; grid-row: {element.row};"
      {color}
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
