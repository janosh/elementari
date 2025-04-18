`ColorBar.svelte`

Here's a `ColorBar` with tick labels:

```svelte example stackblitz
<script>
  import { ColorBar } from '$lib'

  const bars = [
    [`Viridis`, `top`, [0, 0.25, 0.5, 0.75, 1]],
    [`Magma`, `center`, [], [100, 1631]],
    [`Cividis`, `bottom`, [], [-99.9812, -10]],
  ]
</script>

<div style="border: 0.1px dashed white;">
  {#each bars as [color_scale, tick_side, tick_labels, range, width]}
    <ColorBar
      label="{color_scale}<br>&bull; tick side={tick_side}<br>&bull; range={range}"
      {color_scale}
      {tick_side}
      {tick_labels}
      {range}
      label_style="white-space: nowrap; padding-right: 1em;"
      --cbar-width="100%"
      --cbar-padding="2em"
    />
  {/each}
</div>
```

`ColorBar` supports `label_side = ['top', 'bottom', 'left', 'right']`

```svelte example stackblitz
<script>
  import { ColorBar } from '$lib'
  import * as d3sc from 'd3-scale-chromatic'

  const names = Object.keys(d3sc).filter((key) => key.startsWith(`interpolate`))
</script>

<section>
  {#each [`top`, `bottom`, `left`, `right`] as label_side, idx}
    <ul>
      <code>{label_side}</code>
      {#each names.slice(idx * 5, 5 * idx + 5) as name}
        {@const color_scale = name.replace(`interpolate`, ``)}
        <li>
          <ColorBar
            label={color_scale}
            {color_scale}
            {label_side}
            label_style="min-width: 5em;"
          />
        </li>
      {/each}
    </ul>
  {/each}
</section>

<style>
  section {
    display: flex;
    overflow: scroll;
    gap: 2em;
  }
  section > ul {
    list-style: none;
    padding: 0;
  }
  section > ul > li {
    padding: 1ex;
  }
  section > ul > code {
    font-size: 16pt;
  }
</style>
```

You can make fat and skinny bars:

```svelte example stackblitz
<script>
  import { ColorBar } from '$lib'

  const wrapper_style = 'place-items: center;'
</script>

<ColorBar {wrapper_style} style="width: 10em; height: 1ex;" />
<br />
<ColorBar label="Viridis" {wrapper_style} style="width: 3em; height: 2em;" />
<br />
<ColorBar {wrapper_style} --cbar-width="8em" --cbar-height="2em" />
```

`PeriodicTable.svelte` heatmap example with `ColorBar` inside `TableInset`

```svelte example stackblitz code_above
<script>
  import {
    ColorBar,
    ColorScaleSelect,
    element_data,
    PeriodicTable,
    PropertySelect,
    TableInset,
  } from '$lib'

  let color_scale = `Viridis`
  let heatmap_key
  let heatmap_values = $derived(heatmap_key ? element_data.map((el) => el[heatmap_key]) : [])
  let heat_range = $derived([Math.min(...heatmap_values), Math.max(...heatmap_values)])
  let cs_range = heat_range
</script>

<form>
  <ColorScaleSelect bind:value={color_scale} minSelect={1} />
  <PropertySelect bind:key={heatmap_key} />
</form>

<PeriodicTable
  {heatmap_values}
  style="margin: 2em auto 4em;"
  bind:color_scale
  color_scale_range={cs_range ?? heat_range}
  links="name"
  lanth_act_tiles={false}
>
  {#snippet inset()}
  <TableInset  style="place-items: center; padding: 2em;">
    <ColorBar
      {color_scale}
      range={heat_range}
      bind:nice_range={cs_range}
      tick_labels={5}
      tick_side="bottom"
      --cbar-width="100%"
        --cbar-height="15pt"
      />
    </TableInset>
  {/snippet}
</PeriodicTable>

<style>
  form {
    display: flex;
    place-items: center;
    place-content: center;
    gap: 1em;
    margin: 2em auto;
  }
</style>
```
