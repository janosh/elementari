<script lang="ts">
  import { active_category } from '../stores'
  import { Element } from '../types'

  export let element: Element
  export let style = ``
  export let showNumber = true
  export let showName = true
  export let color = ``

  $: category = element.category.replaceAll(` `, `-`)
</script>

<div
  class="element {category}"
  class:active={$active_category === element.category.replaceAll(` `, `-`)}
  {style}
  on:mouseenter
  style:background-color={color}
>
  {#if showNumber}
    <span class="atomic-number">
      {element.number}
    </span>
  {/if}
  <span class="symbol">
    {element.symbol}
  </span>
  {#if showName}
    <span class="name">
      {@html element.name.replace(/(.{12})..+/, `$1&hellip;`)}
    </span>
  {/if}
</div>

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
  .name {
    position: absolute;
    font-weight: lighter;
    bottom: 2pt;
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
