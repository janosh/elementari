<script lang="ts">
  import type { ChemicalElement, PeriodicTableEvents } from '$lib'
  import { choose_bw_for_contrast, format_num } from '$lib'
  import { default_category_colors, is_color } from '$lib/colors'
  import { selected } from '$lib/state.svelte'

  interface Props {
    element: ChemicalElement
    bg_color?: string | null
    show_symbol?: boolean
    show_number?: boolean
    show_name?: boolean
    value?: number | number[] | string | string[] | false | undefined
    style?: string
    symbol_style?: string
    active?: boolean
    href?: string | null
    // at what background color lightness text color switches from black to white
    text_color_threshold?: number
    text_color?: string | null
    precision?: string | undefined
    node?: HTMLElement | null
    label?: string | null
    // NEW: array of background colors for multi-segment tiles
    bg_colors?: (string | null)[]
    show_values?: boolean // explicitly control whether to show values when colors are passed
    [key: string]: unknown
  }
  let {
    element,
    bg_color = null,
    show_symbol = true,
    show_number = true,
    show_name = true,
    value = undefined,
    style = ``,
    symbol_style = ``,
    active = false,
    href = null,
    text_color_threshold = 0.7,
    text_color = $bindable(null),
    precision = undefined,
    node = $bindable(null),
    label = null,
    bg_colors = [],
    show_values = undefined,
    ...rest
  }: Props = $props()

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type $$Events = PeriodicTableEvents // for type-safe event listening on this component

  let category = $derived(element.category.replaceAll(` `, `-`))
  // background color defaults to category color (initialized in colors/index.ts, user editable in PeriodicTableControls.svelte)

  let fallback_bg_color = $derived(
    bg_color ?? default_category_colors[category] ?? `var(--${category}-bg-color)`,
  )
  let contrast_bg_color = $derived(bg_color ?? default_category_colors[category])

  // Helper function to format values appropriately
  const format_value = (val: string | number): string => {
    if (is_color(val)) {
      return show_values === true ? val.toString() : ``
    }

    // Handle numeric values
    if (typeof val === `number`) return format_num(val, precision)

    // Handle string values - check if it's a numeric string
    if (typeof val === `string`) {
      const parsed_num = parseFloat(val)
      if (!isNaN(parsed_num) && isFinite(parsed_num)) {
        return format_num(parsed_num, precision)
      }
      // If show_values is true, return the string as-is to preserve non-numeric strings
      return show_values === true ? val : ``
    }

    return ``
  }

  // Determine if we should show values - default to false if any array element is a color
  const should_show_values = $derived.by(() => {
    if (show_values !== undefined) return show_values
    if (Array.isArray(value)) {
      return !value.some((v) => is_color(v))
    }
    return !is_color(value)
  })
</script>

<svelte:element
  this={href ? `a` : `div`}
  bind:this={node}
  {href}
  data-sveltekit-noscroll
  class="element-tile {category}"
  class:active
  class:last-active={selected.last_element === element}
  style:background-color={Array.isArray(value) && bg_colors?.length > 1
    ? `transparent`
    : fallback_bg_color}
  style:color={text_color ??
    choose_bw_for_contrast(node, contrast_bg_color, text_color_threshold)}
  {style}
  role="link"
  tabindex="0"
  {...rest}
>
  {#if show_number}
    <span class="number">
      {element.number}
    </span>
  {/if}
  {#if show_symbol}
    <span class="symbol" style={symbol_style}>
      {element.symbol}
    </span>
  {/if}
  {#if value && should_show_values}
    {#if Array.isArray(value)}
      <!-- Multi-value positioning -->
      {#if value.length === 2}
        <!-- Diagonal split: top-left and bottom-right -->
        {#if value[0] && format_value(value[0])}
          <span
            class="value multi-value top-left"
            style:color={bg_colors?.[0]
              ? choose_bw_for_contrast(null, bg_colors[0], text_color_threshold)
              : null}
          >
            {format_value(value[0])}
          </span>
        {/if}
        {#if value[1] && format_value(value[1])}
          <span
            class="value multi-value bottom-right"
            style:color={bg_colors?.[1]
              ? choose_bw_for_contrast(null, bg_colors[1], text_color_threshold)
              : null}
          >
            {format_value(value[1])}
          </span>
        {/if}
      {:else if value.length === 3}
        <!-- Horizontal bars: left, right, left alternating -->
        {#if value[0] && format_value(value[0])}
          <span
            class="value multi-value bar-top-left"
            style:color={bg_colors?.[0]
              ? choose_bw_for_contrast(null, bg_colors[0], text_color_threshold)
              : null}
          >
            {format_value(value[0])}
          </span>
        {/if}
        {#if value[1] && format_value(value[1])}
          <span
            class="value multi-value bar-middle-right"
            style:color={bg_colors?.[1]
              ? choose_bw_for_contrast(null, bg_colors[1], text_color_threshold)
              : null}
          >
            {format_value(value[1])}
          </span>
        {/if}
        {#if value[2] && format_value(value[2])}
          <span
            class="value multi-value bar-bottom-left"
            style:color={bg_colors?.[2]
              ? choose_bw_for_contrast(null, bg_colors[2], text_color_threshold)
              : null}
          >
            {format_value(value[2])}
          </span>
        {/if}
      {:else if value.length === 4}
        <!-- Quadrants: all four corners -->
        {#if value[0] && format_value(value[0])}
          <span
            class="value multi-value value-quadrant-tl"
            style:color={bg_colors?.[0]
              ? choose_bw_for_contrast(null, bg_colors[0], text_color_threshold)
              : null}
          >
            {format_value(value[0])}
          </span>
        {/if}
        {#if value[1] && format_value(value[1])}
          <span
            class="value multi-value value-quadrant-tr"
            style:color={bg_colors?.[1]
              ? choose_bw_for_contrast(null, bg_colors[1], text_color_threshold)
              : null}
          >
            {format_value(value[1])}
          </span>
        {/if}
        {#if value[2] && format_value(value[2])}
          <span
            class="value multi-value value-quadrant-bl"
            style:color={bg_colors?.[2]
              ? choose_bw_for_contrast(null, bg_colors[2], text_color_threshold)
              : null}
          >
            {format_value(value[2])}
          </span>
        {/if}
        {#if value[3] && format_value(value[3])}
          <span
            class="value multi-value value-quadrant-br"
            style:color={bg_colors?.[3]
              ? choose_bw_for_contrast(null, bg_colors[3], text_color_threshold)
              : null}
          >
            {format_value(value[3])}
          </span>
        {/if}
      {:else}
        <!-- Fallback for other array lengths -->
        <span class="value"
          >{value
            .map((v) => format_value(v))
            .filter((v) => v)
            .join(` / `)}</span
        >
      {/if}
    {:else}
      <!-- Single value -->
      <span class="value">{format_value(value)}</span>
    {/if}
  {:else if show_name}
    <span class="name">
      {label ?? element.name}
    </span>
  {/if}

  <!-- Multi-segment backgrounds for heatmap arrays -->
  {#if Array.isArray(value) && bg_colors && bg_colors.length > 1}
    {#if bg_colors.length === 2}
      <!-- Diagonal split -->
      <div class="segment diagonal-top" style:background-color={bg_colors[0]}></div>
      <div class="segment diagonal-bottom" style:background-color={bg_colors[1]}></div>
    {:else if bg_colors.length === 3}
      <!-- Horizontal bars -->
      <div class="segment horizontal-top" style:background-color={bg_colors[0]}></div>
      <div class="segment horizontal-middle" style:background-color={bg_colors[1]}></div>
      <div class="segment horizontal-bottom" style:background-color={bg_colors[2]}></div>
    {:else if bg_colors.length === 4}
      <!-- Four quadrants -->
      <div class="segment quadrant-tl" style:background-color={bg_colors[0]}></div>
      <div class="segment quadrant-tr" style:background-color={bg_colors[1]}></div>
      <div class="segment quadrant-bl" style:background-color={bg_colors[2]}></div>
      <div class="segment quadrant-br" style:background-color={bg_colors[3]}></div>
    {/if}
  {/if}
</svelte:element>

<style>
  .element-tile {
    position: relative;
    transition: background-color var(--elem-tile-transition-duration, 0.4s);
    aspect-ratio: 1;
    display: flex;
    place-items: center;
    place-content: center;
    border-radius: var(--elem-tile-border-radius, 1pt);
    width: 100%;
    box-sizing: border-box;
    color: var(--elem-tile-text-color);
    /* add persistent invisible border so content doesn't move on hover */
    border: 1px solid transparent;
    container-type: inline-size;
    overflow: hidden;
  }
  .element-tile span {
    line-height: 1em;
    z-index: 10;
  }
  .element-tile.active,
  .element-tile:hover {
    border: var(--elem-tile-hover-border-width, 1px) solid;
  }
  .last-active {
    border: 1px dotted;
  }
  .number {
    font-size: var(--elem-number-font-size, 22cqw);
    position: absolute;
    top: 6cqw;
    font-weight: var(--elem-number-font-weight, 300);
    left: 6cqw;
  }
  .symbol {
    font-size: var(--elem-symbol-font-size, 40cqw);
    font-weight: var(--elem-symbol-font-weight, 400);
  }
  span.name,
  span.value {
    position: absolute;
    bottom: 8cqw;
  }
  span.value {
    font-size: var(--elem-value-font-size, 18cqw);
  }
  span.name {
    font-size: var(--elem-name-font-size, 12cqw);
  }

  /* Multi-value positioning */
  .multi-value {
    position: absolute;
    font-size: var(--elem-multi-value-font-size, 14cqw);
    font-weight: 600;
  }

  /* 2-value diagonal positions */
  .top-left {
    top: 4cqw;
    left: 4cqw;
  }
  .bottom-right {
    bottom: 4cqw;
    right: 4cqw;
  }

  /* 3-value horizontal bar positions */
  .bar-top-left {
    top: 8cqw;
    left: 4cqw;
  }
  .bar-middle-right {
    top: calc(33.333% + 11cqw);
    right: 4cqw;
  }
  .bar-bottom-left {
    bottom: 8cqw;
    left: 4cqw;
  }

  /* 4-value quadrant positions */
  .value-quadrant-tl {
    top: 4cqw;
    left: 4cqw;
  }
  .value-quadrant-tr {
    top: 4cqw;
    right: 4cqw;
  }
  .value-quadrant-bl {
    bottom: 4cqw;
    left: 4cqw;
  }
  .value-quadrant-br {
    bottom: 4cqw;
    right: 4cqw;
  }

  /* Multi-segment backgrounds */
  .segment {
    position: absolute;
    z-index: 1;
  }

  /* Diagonal split (2 values) */
  .diagonal-top {
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    clip-path: polygon(0 0, 100% 0, 0 100%);
  }
  .diagonal-bottom {
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    clip-path: polygon(100% 0, 100% 100%, 0 100%);
  }

  /* Horizontal bars (3 values) */
  .horizontal-top {
    top: 0;
    left: 0;
    width: 100%;
    height: 33.33%;
  }
  .horizontal-middle {
    top: 33.33%;
    left: 0;
    width: 100%;
    height: 33.33%;
  }
  .horizontal-bottom {
    top: 66.66%;
    left: 0;
    width: 100%;
    height: 33.34%;
  }

  /* Four quadrants (4 values) */
  .quadrant-tl {
    top: 0;
    left: 0;
    width: 50%;
    height: 50%;
  }
  .quadrant-tr {
    top: 0;
    right: 0;
    width: 50%;
    height: 50%;
  }
  .quadrant-bl {
    bottom: 0;
    left: 0;
    width: 50%;
    height: 50%;
  }
  .quadrant-br {
    bottom: 0;
    right: 0;
    width: 50%;
    height: 50%;
  }
</style>
