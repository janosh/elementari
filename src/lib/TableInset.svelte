<script lang="ts">
  export let grid_col = `3 / span 10`
  export let grid_row = `1 / span 3`
</script>

<aside style:grid-column={grid_col} style:grid-row={grid_row}>
  <slot />
</aside>

<style>
  aside {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
  }
</style>
