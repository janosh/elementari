<h1 align="center">
  <img src="static/favicon.svg" alt="Logo" height="60">
  <br>
  Elementari
</h1>

<h4 align="center">

[![Tests](https://github.com/janosh/elementari/actions/workflows/test.yml/badge.svg)](https://github.com/janosh/elementari/actions/workflows/test.yml)
[![GH Pages](https://github.com/janosh/elementari/actions/workflows/gh-pages.yml/badge.svg)](https://github.com/janosh/elementari/actions/workflows/gh-pages.yml)
[![pre-commit.ci status](https://results.pre-commit.ci/badge/github/janosh/elementari/main.svg?badge_token=nUqJfPCFS4uyMwcFSDIfdQ)](https://results.pre-commit.ci/latest/github/janosh/elementari/main?badge_token=nUqJfPCFS4uyMwcFSDIfdQ)
[![Open in StackBlitz](https://img.shields.io/badge/Open%20in-StackBlitz-darkblue?logo=stackblitz)](https://stackblitz.com/github/janosh/elementari)

</h4>

`elementari` is a toolkit for building interactive web visualizations for materials science: periodic tables, 3d crystal structures (and molecules coming soon), Bohr atoms, nuclei, heatmaps, scatter plots. It's under active development and not yet ready for production use but we appreciate everyone who wants to try it out and give feedback! 🙏

![Screenshot of landing page](static/2023-02-13-landing-page.webp)

## 📦 &thinsp; Heatmap

This screenshot demonstrates the periodicity of elemental properties (i.e. why it's called periodic table). In this case, you're seeing recurring bumps and valleys in the first ionization energy as a function of atomic number.

![Screenshot of periodic table heatmap](static/2023-02-13-heatmap.webp)

## ⚛️ &thinsp; 3D Structure Viewer

![3D Structure Viewer](https://github.com/janosh/elementari/assets/30958850/72f78ad8-16fc-4eab-84ca-a985ce27e2b1)

## ⚛️ &thinsp; Element Details Pages

The details page for gold.

<https://user-images.githubusercontent.com/30958850/186975855-8e0d94f9-e4e3-47a2-9354-9c012b37307c.mp4>

## 🔨 &thinsp; Installation

```sh
npm install --dev elementari
```

## 📙 &thinsp; Usage

Import the `PeriodicTable` component and pass it some heatmap values:

```svelte
<script>
  import PeriodicTable from 'elementari'

  const heatmap_values = { H: 10, He: 4, Li: 8, Fe: 3, O: 24 }
</script>

<PeriodicTable {heatmap_values} />
```

## 🎬 &thinsp; Events

`PeriodicTable.svelte` forwards the following events from each `ElementTile`:

1. `click`
1. `mouseenter`
1. `mouseleave`
1. `keyup`
1. `keydown`

Each event is a Svelte `dispatch` event with the following `detail` payload:

```ts
detail: {
  element: ChemicalElement
  active: boolean // whether the event target tile is currently active
  dom_event: Event // the DOM event that triggered the Svelte dispatch
}
```

See `DispatchPayload` and `PeriodicTableEvents` in `src/lib/index.ts`

## 🧪 &thinsp; Coverage

| Statements                                                                                 | Branches                                                                          | Lines                                                                            |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| ![Statements](https://img.shields.io/badge/statements-99.84%25-brightgreen.svg?style=flat) | ![Branches](https://img.shields.io/badge/branches-82.92%25-yellow.svg?style=flat) | ![Lines](https://img.shields.io/badge/lines-99.84%25-brightgreen.svg?style=flat) |

## 🙏 &thinsp; Acknowledgements

- Element properties in `src/lib/element-data.ts` were combined from [`Bowserinator/Periodic-Table-JSON`](https://github.com/Bowserinator/Periodic-Table-JSON/blob/master/PeriodicTableJSON.json) under Creative Commons license and [`robertwb/Periodic Table of Elements.csv`](https://gist.github.com/robertwb/22aa4dbfb6bcecd94f2176caa912b952) (unlicensed).
- Thanks to [Images of Elements](https://images-of-elements.com) for providing photos of elemental crystals and glowing excited gases.
- Thanks to [@kadinzhang](https://github.com/kadinzhang) and their [Periodicity project](https://ptable.netlify.app) [[code](https://github.com/kadinzhang/Periodicity)] for the idea to display animated Bohr model atoms and inset a scatter plot into the periodic table to visualize the periodic nature of elemental properties.
- Big thanks to all sources of element images. See [`fetch-elem-images.ts`](https://github.com/janosh/elementari/blob/-/src/fetch-elem-images.ts) and [`static/elements`](https://github.com/janosh/elementari/tree/main/static/elements).
