<script lang="ts">
  import { extent } from 'd3-array'
  import { scaleLinear } from 'd3-scale'
  import { active_element } from '../../stores'
  import { Element } from '../../types'
  import Datapoint from './Datapoint.svelte'
  import Line from './Line.svelte'

  export let data: [number, number, Element][]
  export let colorscale: (y: number) => string | undefined = () => undefined

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

  $: scaled_data = data
    .filter(([x, y]) => !(isNaN(x) || isNaN(y) || x === null || y === null))
    .map(([x, y, ...rest]) => [x_scale(x), y_scale(y), colorscale(y), ...rest])
</script>

<div class="scatter" bind:clientWidth={width} bind:clientHeight={height}>
  {#if width && height}
    <svg {width} {height}>
      <Line data={scaled_data} />
      {#each scaled_data as [x, y, fill, element]}
        <Datapoint {x} {y} {fill} on:mouseenter={() => ($active_element = element)} />
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
</style>
