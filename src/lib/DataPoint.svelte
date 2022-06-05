<script lang="ts">
  import { cubicOut } from 'svelte/easing'
  import { tweened } from 'svelte/motion'

  export let x: number
  export let y: number
  export let fill = `gray`

  const tX = tweened(0, { duration: 400, easing: cubicOut })
  const tY = tweened(0, { duration: 400, easing: cubicOut })

  $: tX.set(x)
  $: tY.set(y)
</script>

<g transform="translate({$tX} {$tY})" {fill} on:mouseenter>
  <circle cx="0" cy="0" r="3" />
</g>

<style>
  circle {
    transition: 0.3s;
    stroke: transparent;
    stroke-width: 5px;
  }
  g:hover circle {
    fill: orange;
    transform: scale(2);
  }
</style>
