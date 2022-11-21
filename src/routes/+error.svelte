<script lang="ts">
  import { page } from '$app/stores'
  import { homepage, name } from '../../package.json'
</script>

<svelte:head>
  <title>Error {$page.status} &bull; {name}</title>
</svelte:head>

<div>
  <h1>Error {$page.status}: {$page.error?.message}</h1>
  {#if $page.status >= 500}
    <p>
      If page reloading doesn't help, please raise an issue on
      <a href="{homepage}/issues" target="_blank" rel="noreferrer">GitHub</a>. Thanks! 🙏
    </p>
  {/if}

  <p>Back to <a href=".">landing page</a>.</p>
</div>

<style>
  div {
    font-size: 1.2em;
    max-width: 45em;
    padding: 5em 3em 1em;
    margin: auto;
    text-align: center;
  }
  p {
    text-align: center;
    max-width: 35em;
    margin: auto;
  }
</style>
