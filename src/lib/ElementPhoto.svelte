<script lang="ts">
  import { active_element as element } from '../stores'

  export let show_photo = true

  $: src = `https://images-of-elements.com/s/${$element?.name?.toLowerCase()}.jpg`
</script>

{#if show_photo && $element}
  {#key src}
    <img {src} alt={$element?.name} onerror="this.style.display='none'" />
  {/key}
{/if}

<style>
  img {
    grid-column: 1 / span 2;
    grid-row: 9 / span 2;
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 1pt;
  }
</style>
