<script lang="ts">
  import { page } from '$app/stores'
  import Footer from '$lib/Footer.svelte'
  import GitHubCorner from 'svelte-github-corner'
  import { repository, name } from '../../package.json'
  import '../app.css'
</script>

<svelte:head>
  <base href={import.meta.env.CI ? `/${name}/` : ``} />
</svelte:head>

<GitHubCorner href={repository} />

<slot />

<Footer />

<style>
  :global(:root) {
    --ghc-color: var(--page-bg);
    --ghc-bg: white;
    --sms-options-bg: black;
    --sms-max-width: 22em;
    --sms-border: 1px dotted teal;
    --sms-focus-border: 1px dotted cornflowerblue;
    --sms-active-color: cornflowerblue;
  }
  :global(div.multiselect) {
    margin: auto;
  }
  :global(div.multiselect input::placeholder) {
    opacity: 0.7;
    padding: 1ex;
  }
</style>
