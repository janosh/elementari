<script lang="ts">
  import { active_category, active_element, color_scale, heatmap } from '../stores'
  import { Element } from '../types'

  export let element: Element
  export let style = ``
  export let show_number = true
  export let show_name = true
  export let value: number | undefined = undefined
  export let precision = 2

  $: category = element.category.replaceAll(` `, `-`)

  $: color = $heatmap ? (value ? $color_scale?.(value) : `transparent`) : undefined
</script>

<a
  href={element.name.toLowerCase()}
  class="element {category}"
  class:active={$active_category === element.category.replaceAll(` `, `-`) ||
    $active_element?.name === element.name}
  {style}
  on:mouseenter
  style:background-color={color}
>
  {#if show_number}
    <span class="atomic-number">
      {element.number}
    </span>
  {/if}
  <span class="symbol">
    {element.symbol}
  </span>
  {#if value}
    <span class="value">
      {parseFloat(value.toFixed(precision))}
    </span>
  {:else if show_name}
    <span class="name">
      {element.name}
    </span>
  {/if}
</a>

<style>
  .element {
    position: relative;
    transition: 0.4s;
    aspect-ratio: 1;
    display: flex;
    place-items: center;
    place-content: center;
    background-color: var(--experimental-bg-color);
    border-radius: 1pt;
    color: white;
  }
  .element.active,
  .element:hover {
    filter: brightness(130%);
  }
  .element span {
    line-height: 1em;
  }
  .atomic-number {
    font-size: max(6pt, min(9pt, 0.8vw));
    position: absolute;
    top: 0.3vw;
    font-weight: lighter;
    left: 0.3vw;
  }
  .symbol {
    font-size: min(2vw, 19pt);
  }
  span.name,
  span.value {
    position: absolute;
    bottom: 2pt;
    font-weight: lighter;
  }
  span.value {
    font-size: max(8pt, min(10pt, 0.8vw));
  }
  span.name {
    font-size: max(5pt, min(7pt, 0.65vw));
  }
  /* category colors */
  /* onMount values defined in app.css, controlled by ColorCustomizer.svelte */
  .element.diatomic-nonmetal {
    background-color: var(--diatomic-nonmetal-bg-color);
  }
  .element.noble-gas {
    background-color: var(--noble-gas-bg-color);
  }
  .element.alkali-metal {
    background-color: var(--alkali-metal-bg-color);
  }
  .element.alkaline-earth-metal {
    background-color: var(--alkaline-earth-metal-bg-color);
  }
  .element.metalloid {
    background-color: var(--metalloid-bg-color);
  }
  .element.polyatomic-nonmetal {
    background-color: var(--polyatomic-nonmetal-bg-color);
  }
  .element.transition-metal {
    background-color: var(--transition-metal-bg-color);
  }
  .element.post-transition-metal {
    background-color: var(--post-transition-metal-bg-color);
  }
  .element.lanthanide {
    background-color: var(--lanthanide-bg-color);
  }
  .element.actinide {
    background-color: var(--actinide-bg-color);
  }
</style>
