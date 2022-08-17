# Periodic Table

[![Netlify Status](https://api.netlify.com/api/v1/badges/42b5fd04-c538-4e3c-bd69-73e383989cfd/deploy-status)](https://app.netlify.com/sites/ptable-elements/deploys)
[![pre-commit.ci status](https://results.pre-commit.ci/badge/github/janosh/periodic-table/main.svg?badge_token=nUqJfPCFS4uyMwcFSDIfdQ)](https://results.pre-commit.ci/latest/github/janosh/periodic-table/main?badge_token=nUqJfPCFS4uyMwcFSDIfdQ)
[![Open in StackBlitz](https://img.shields.io/badge/Open%20in-StackBlitz-darkblue?logo=pytorchlightning)](https://stackblitz.com/github/janosh/periodic-table)

Interactive Periodic Table component written in Svelte.

![Screenshot of periodic table](static/2022-08-08-screenshot.png)

## Heatmap

Below a screenshot demonstrating the periodicity of elemental properties, i.e. why the periodic table is called periodic. In this case its showing recurring bumps and valleys in the first ionization energy as a function of atomic number.

![Screenshot of periodic table heatmap](static/2022-08-08-screenshot-heatmap.png)

## Usage

Copy the `src/lib/` folder into your Svelte project and import the `PeriodicTable` component:

```svelte
<script>
  import PeriodicTable from 'src/components/PeriodicTable.svelte'
</script>

<PeriodicTable />
```

## Acknowledgements

1. Element properties in `src/lib/periodic-table-data.ts` were combined from [`Bowserinator/Periodic-Table-JSON`](https://github.com/Bowserinator/Periodic-Table-JSON/blob/master/PeriodicTableJSON.json) under Creative Commons license and [`robertwb/Periodic Table of Elements.csv`](https://gist.github.com/robertwb/22aa4dbfb6bcecd94f2176caa912b952) (unlicensed).
1. Thanks to [Images of Elements](https://images-of-elements.com) for providing photos of elemental crystals and glowing excited gases.
1. Thanks to [@kadinzhang](https://github.com/kadinzhang) and their [Periodicity project](https://ptable.netlify.app) [[code](https://github.com/kadinzhang/Periodicity)] for the idea to inset a scatter plot into the periodic nature of elemental properties.
