<script lang="ts">
  import GitHubCorner from 'svelte-github-corner'
  import '../app.css'
</script>

<GitHubCorner href="https://github.com/janosh/periodic-table" />

<slot />

<footer>
  <a href="https://github.com/janosh/periodic-table/blob/main/license">
    MIT License 2022
  </a>
</footer>

<style>
  :global(:root) {
    --ghc-color: var(--page-bg);
    --ghc-bg: white;
    --sms-options-bg: black;
    --sms-max-width: 22em;
    --sms-border: 1px dotted teal;
    --sms-focus-border: 1px dotted cornflowerblue;
  }
  :global(div.multiselect) {
    margin: auto;
  }
  :global(div.multiselect input::placeholder) {
    opacity: 0.7;
    padding: 1ex;
  }
  footer {
    margin: 6em 0 0;
    text-align: center;
  }
</style>
