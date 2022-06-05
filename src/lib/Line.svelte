<script lang="ts">
  import { interpolatePath } from 'd3-interpolate-path'
  import { curveMonotoneX, line } from 'd3-shape'
  import { cubicOut } from 'svelte/easing'
  import { tweened } from 'svelte/motion'

  export let data: [number, number, ...unknown[]][]

  const lineGenerator = line()
    .x((point) => point[0])
    .y((point) => point[1])
    .curve(curveMonotoneX)

  const tLinePath = tweened(``, {
    duration: 400,
    easing: cubicOut,
    interpolate: interpolatePath,
  })

  $: linePath = lineGenerator(data)

  $: tLinePath.set(linePath)
</script>

<path d={$tLinePath} />

<style>
  path {
    fill: none;
    stroke: teal;
    stroke-width: 2;
  }
</style>
