<script lang="ts">
  import { base } from '$app/paths'
  import Footer from '$lib/Footer.svelte'
  import GitHubCorner from 'svelte-github-corner'
  import { repository } from '../../package.json'
  import '../app.css'
</script>

<svelte:head>
  <base href={base} />
  <link rel="icon" href="{base}/favicon.svg" />
  <link rel="stylesheet" href="{base}/prism-vsc-dark-plus.css" />
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
