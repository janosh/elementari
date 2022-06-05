<script lang="ts">
  import { extent } from 'd3-array'
  import { scaleLinear } from 'd3-scale'
  import elements from '../periodic-table-data.ts'
  import { active_element, color_scale, heatmap } from '../stores'
  import { Element } from '../types'
  import Line from './Line.svelte'
  import Datapoint from './ScatterPoint.svelte'

  export let style = ``

  $: data = elements.map((el) => [el.number, el[$heatmap], el])

  const padding = 10 // pixels

  let width: number
  let height: number
  $: xrange = extent(data.map((point) => point[0]))
  $: yrange = extent(data.map((point) => point[1]))

  $: x_scale = scaleLinear()
    .domain(xrange)
    .range([padding, width - padding])

  $: y_scale = scaleLinear()
    .domain(yrange)
    .range([height - padding, padding])

  let scaled_data: [number, number, string, Element][]
  $: scaled_data = data
    .filter(([x, y]) => !(isNaN(x) || isNaN(y) || x === null || y === null))
    .map(([x, y, ...rest]) => [x_scale(x), y_scale(y), ...rest])
</script>

<div class="scatter" bind:clientWidth={width} bind:clientHeight={height} {style}>
  {#if width && height}
    <svg>
      <Line data={scaled_data} />
      {#each scaled_data as [x, y, element]}
        {@const fill = $color_scale(y)}
        {@const active = $active_element?.name === element.name}
        <Datapoint
          {x}
          {y}
          {fill}
          on:mouseenter={() => ($active_element = element)}
          {active}
        />
      {/each}
    </svg>
  {/if}
</div>

<style>
  .scatter {
    width: 100%;
    height: 100%;
    display: flex;
    overflow: hidden;
  }
  svg {
    width: 100%;
  }
</style>
