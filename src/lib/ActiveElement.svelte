<script lang="ts">
  import { Element } from '../types'

  export let element: Element | null
  export let grid_col = `3 / span 10`
  export let grid_row = `1 / span 3`
  export let padding = `1vw 3vw`
  export let show_photo = true
</script>

<div
  class="active-element"
  style:grid-column={grid_col}
  style:grid-row={grid_row}
  style:padding
>
  {#if element}
    <h2>{element.number} - {element.name} <small>{element.category}</small></h2>
    <div class="properties">
      <div>
        <p>
          Atomic Mass
          <abbr title="Dalton aka atomic mass unit">(u)</abbr>
        </p>
        <strong>{element.atomic_mass?.toFixed(2)}</strong>
      </div>
      <div>
        <p>
          Density
          <abbr title="grams per cubic centimeter">(g/cm&sup3;)</abbr>
        </p>
        <strong>{element.density?.toFixed(2)}</strong>
      </div>
      <div>
        <p>Phase</p>
        <strong>{element.phase}</strong>
      </div>
      <div>
        <p>Year of Discovery</p>
        <strong>
          {element.year}
        </strong>
      </div>
    </div>
  {:else}
    <h2 style="text-align: center; margin: 2em 0;">Try hovering an element!</h2>
  {/if}
</div>

{#if show_photo && element}
  <img
    id="element-photo"
    src="https://images-of-elements.com/s/{element.name.toLowerCase()}.jpg"
    alt={element.name}
  />
{/if}

<style>
  div.active-element {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
  }
  div.active-element .properties {
    display: flex;
  }
  div.active-element .properties > div {
    width: 25%;
  }
  div.active-element .properties strong {
    font-size: 2vw;
  }
  p {
    margin: 0;
    font-weight: lighter;
    font-size: clamp(6pt, 1.2vw, 15pt);
  }
  h2 {
    margin: 0 0 2vw;
    font-size: clamp(9pt, 3vw, 25pt);
    white-space: nowrap;
  }
  h2 small {
    margin-left: 8pt;
    font-weight: 100;
  }
  abbr {
    font-size: 0.9vw;
    text-decoration: none;
  }
  img#element-photo {
    grid-column: 1 / span 2;
    grid-row: 9 / span 2;
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 1pt;
  }
</style>
