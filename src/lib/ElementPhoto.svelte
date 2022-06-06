<script lang="ts">
  import { active_element } from '../stores'
  import { Element } from '../types'

  export let style = ``
  // element defaults to active_element store but can be pinned by passing it as prop
  export let element: Element | null = $active_element

  $: src = `https://images-of-elements.com/s/${element?.name?.toLowerCase()}.jpg`
</script>

{#if element}
  {#key src}
    <img {src} alt={element?.name} onerror="this.style.display='none'" {style} />
  {/key}
{/if}

<style>
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 1pt;
  }
</style>
