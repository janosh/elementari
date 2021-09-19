<script lang="ts">
  export let maxWidth = `14em`
  export let minWidth = `8em`
</script>

{#if $$slots.tip}
  <span>
    <slot />
    <div style:min-width={minWidth} style:max-width={maxWidth}>
      <slot name="tip" />
    </div>
  </span>
{:else}
  <slot />
{/if}

<style>
  span {
    position: relative;
  }
  span > div {
    visibility: hidden;
    opacity: 0;
    cursor: default;
    background: var(--lightBg);
    position: absolute;
    top: 100%;
    padding: 5pt 1ex;
    border-radius: 1ex;
    left: 50%;
    transform: translate(-50%, 1ex);
    z-index: 1;
    box-shadow: 0 0 1ex -3pt black;
    width: fit-content;
    transition: opacity 0.4s;
  }
  span:hover > div {
    visibility: visible;
    opacity: 1;
  }
  span > div::before {
    content: '';
    width: 1ex;
    position: absolute;
    left: 50%;
    bottom: 100%;
    transform: translate(-50%);
    height: 1ex;
    border: 1ex solid;
    border-color: transparent transparent var(--lightBg) transparent;
    box-sizing: border-box;
  }
  /* needed to increase the div hover area beyond its top edge across its entire width */
  span > div::after {
    content: '';
    position: absolute;
    width: 100%;
    bottom: 100%;
    height: 1ex;
  }
</style>
