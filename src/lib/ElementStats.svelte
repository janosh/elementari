<script lang="ts">
  import { active_element as element } from '../stores'

  export let padding = `1vw 3vw`
  export let precision = 2
</script>

{#if $element}
  <h2 style:padding>
    {$element?.number} - {$element?.name} <small>{$element?.category}</small>
  </h2>
  <div style:padding>
    <section>
      <p>
        Atomic Mass
        <abbr title="Dalton aka atomic mass unit">(u)</abbr>
      </p>
      <strong>{parseFloat($element?.atomic_mass?.toFixed(precision))}</strong>
    </section>
    <section>
      <p>
        Density
        <abbr title="grams per cubic centimeter">(g/cm&sup3;)</abbr>
      </p>
      <strong>{parseFloat($element?.density?.toFixed(precision))}</strong>
    </section>
    <section>
      <p>Phase</p>
      <strong>{$element?.phase}</strong>
    </section>
    <section>
      <p>Year of Discovery</p>
      <strong>
        {$element?.year}
      </strong>
    </section>
  </div>
{:else}
  <h3 style="text-align: center;">Try hovering an element!</h3>
{/if}

<style>
  div {
    display: flex;
  }
  div > section {
    width: 25%;
  }
  div strong {
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
  h3 {
    margin: 0 0 2vw;
    font-size: clamp(9pt, 3vw, 25pt);
    white-space: nowrap;
  }
</style>
