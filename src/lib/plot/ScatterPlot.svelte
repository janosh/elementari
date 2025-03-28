<script lang="ts">
  import type { Point } from '$lib'
  import { Line } from '$lib'
  import { bisector, extent } from 'd3-array'
  import { format } from 'd3-format'
  import { scaleLinear } from 'd3-scale'
  import { timeFormat } from 'd3-time-format'
  import type { Snippet } from 'svelte'
  import type { DataSeries } from '.'
  import ScatterPoint from './ScatterPoint.svelte'

  type TooltipProps = {
    x: number
    y: number
    cx: number
    cy: number
    x_formatted: string
    y_formatted: string
    metadata?: Record<string, unknown>
  }
  interface Props {
    series?: DataSeries[]
    style?: string
    x_lim?: [number | null, number | null]
    y_lim?: [number | null, number | null]
    pad_top?: number
    pad_bottom?: number
    pad_left?: number
    pad_right?: number
    x_label?: string
    x_label_yshift?: number
    y_label?: string
    y_unit?: string
    tooltip_point?: Point | null
    hovered?: boolean
    markers?: `line` | `points` | `line+points`
    x_format?: string
    y_format?: string
    tooltip?: Snippet<[TooltipProps]>
    change?: (data: Point & { series: DataSeries }) => void
  }

  let {
    series = [],
    style = ``,
    x_lim = [null, null],
    y_lim = [null, null],
    pad_top = 5,
    pad_bottom = 30,
    pad_left = 50,
    pad_right = 20,
    x_label = ``,
    x_label_yshift = 0,
    y_label = ``,
    y_unit = ``,
    tooltip_point = $bindable(null),
    hovered = $bindable(false),
    markers = `line+points`,
    x_format = ``,
    y_format = ``,
    tooltip,
    change = () => {},
  }: Props = $props()

  const axis_label_offset = { x: 15, y: 20 } // pixels
  let width: number = $state(0)
  let height: number = $state(0)

  // Create raw data points and determine ranges for all series
  let all_points = $derived(
    series.flatMap(({ x: xs, y: ys }) => xs.map((x, idx) => ({ x, y: ys[idx] }))),
  )

  function get_data_range_with_fallback(
    points: Point[],
    get_value: (p: Point) => number,
    lim: [number | null, number | null],
  ): [number, number] {
    const [min, max] = lim
    const [min_ext, max_ext] = extent(points, get_value)
    return [min ?? min_ext ?? 0, max ?? max_ext ?? 1]
  }

  let x_range = $derived(
    get_data_range_with_fallback(all_points, (point) => point.x, x_lim),
  )

  let y_range = $derived(
    get_data_range_with_fallback(all_points, (point) => point.y, y_lim),
  )

  // Filter out points outside x_lim and y_lim for each series
  let filtered_series = $derived(
    series.map((data_series) => {
      const { x: xs, y: ys, ...rest } = data_series
      const points: Point[] = xs.map((x, idx) => ({ x, y: ys[idx], ...rest }))

      return {
        ...data_series,
        filtered_data: points.filter((pt) => {
          const [x_min, x_max] = x_range
          const [y_min, y_max] = y_range
          return (
            pt.x >= x_min &&
            pt.x <= x_max &&
            pt.y >= y_min &&
            pt.y <= y_max &&
            !isNaN(pt.x) &&
            !isNaN(pt.y) &&
            pt.x !== null &&
            pt.y !== null
          )
        }),
      }
    }),
  )

  let x_scale = $derived(
    scaleLinear()
      .domain(x_range)
      .range([pad_left, width - pad_right]),
  )

  let y_scale = $derived(
    scaleLinear()
      .domain(y_range)
      .range([height - pad_bottom, pad_top]),
  )

  const bisect = bisector((pt: Point) => pt.x).right

  function on_mouse_move(event: MouseEvent) {
    hovered = true

    // Find the closest point across all series
    let closest_point: Point | null = null
    let min_distance = Infinity
    let closest_series: DataSeries | null = null

    const mouse_x = x_scale.invert(event.offsetX)
    const mouse_y = y_scale.invert(event.offsetY)

    for (const data_series of filtered_series) {
      const idx = bisect(data_series.filtered_data, mouse_x)
      // Check points on either side of the mouse x position
      const points = [
        data_series.filtered_data[Math.max(0, idx - 1)],
        data_series.filtered_data[Math.min(data_series.filtered_data.length - 1, idx)],
      ]
      for (const point of points) {
        if (!point) continue
        const dx = point.x - mouse_x
        const dy = point.y - mouse_y
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < min_distance) {
          min_distance = distance
          closest_point = point
          closest_series = data_series
        }
      }
    }

    if (closest_point && closest_series) {
      tooltip_point = closest_point
      change({ ...closest_point, series: closest_series })
    }
  }

  function on_mouse_leave() {
    hovered = false
    tooltip_point = null
  }

  const format_value = (value: number, formatter: string) => {
    if (formatter.startsWith(`%`)) {
      return timeFormat(formatter)(new Date(value))
    }
    // First format the number using d3-format
    const formatted = format(formatter)(value)
    // Then remove trailing zeros after decimal point and remove decimal point if no decimals
    return formatted.replace(/\.?0+$/, ``)
  }
</script>

<div class="scatter" bind:clientWidth={width} bind:clientHeight={height} {style}>
  {#if width && height}
    <svg onmousemove={on_mouse_move} onmouseleave={on_mouse_leave} role="img">
      <!-- Zero line -->
      {#if y_range[0] < 0 && y_range[1] > 0}
        <line
          x1={pad_left}
          x2={width - pad_right}
          y1={y_scale(0)}
          y2={y_scale(0)}
          stroke="gray"
          stroke-width="0.5"
          stroke-dasharray="2,2"
        />
      {/if}

      {#if markers.includes(`line`)}
        {#each filtered_series as series (JSON.stringify(series))}
          <Line
            points={series.filtered_data.map(({ x, y }) => [x_scale(x), y_scale(y)])}
            origin={[x_scale(x_range[0]), y_scale(y_range[0])]}
            line_color={series.point_style?.fill}
            line_width={1}
            area_color="transparent"
          />
        {/each}
      {/if}

      {#if markers.includes(`points`)}
        {#each filtered_series as series (JSON.stringify(series))}
          {#each series.filtered_data as { x, y } (JSON.stringify({ x, y }))}
            <ScatterPoint
              x={x_scale(x)}
              y={y_scale(y)}
              style={series.point_style ?? {}}
              hover={series.point_hover ?? {}}
              label={series.point_label ?? {}}
              offset={series.point_offset ?? { x: 0, y: 0 }}
              tween_duration={series.point_tween_duration ?? 600}
            />
          {/each}
        {/each}
      {/if}

      <!-- x axis -->
      <g class="x-axis">
        {#each x_scale.ticks() as tick (tick)}
          <g class="tick" transform="translate({x_scale(tick)}, {height})">
            <line y1={-height + pad_top} y2={-pad_bottom} />
            <text y={-pad_bottom + axis_label_offset.x}>
              {format_value(tick, x_format)}
            </text>
          </g>
        {/each}
        <text x={width / 2} y={height + 5 - x_label_yshift} class="label x">
          {@html x_label ?? ``}
        </text>
      </g>

      <!-- y axis -->
      <g class="y-axis">
        {#each y_scale.ticks(5) as tick, idx (tick)}
          <g class="tick" transform="translate(0, {y_scale(tick)})">
            <line x1={pad_left} x2={width - pad_right} />
            <text x={pad_left - axis_label_offset.y}>
              {format_value(tick, y_format)}
              {#if y_unit && idx === y_scale.ticks(5).length - 1}
                &zwnj;&ensp;{y_unit}
              {/if}
            </text>
          </g>
        {/each}
        <text x={-height / 2} y={13} transform="rotate(-90)" class="label y">
          {@html y_label ?? ``}
        </text>
      </g>

      {#if tooltip_point && hovered}
        {@const { x, y, metadata } = tooltip_point}
        {@const [cx, cy] = [x_scale(x), y_scale(y)]}
        {@const x_formatted = format_value(x, x_format)}
        {@const y_formatted = format_value(y, y_format)}
        <circle {cx} {cy} r="5" fill="orange" />
        <foreignObject x={cx + 5} y={cy}>
          {#if tooltip}
            {@render tooltip({ x, y, cx, cy, x_formatted, y_formatted, metadata })}
          {:else}
            ({x_formatted}, {y_formatted})
          {/if}
        </foreignObject>
      {/if}
    </svg>
  {/if}
</div>

<style>
  div.scatter {
    width: 100%;
    height: 100%;
    display: flex;
    min-height: var(--esp-min-height, 100px);
    container-type: inline-size;
    z-index: var(--esp-z-index, 1); /* ensure tooltip renders above ElementTiles */
  }
  svg {
    width: 100%;
    fill: var(--esp-fill, white);
    font-weight: var(--esp-font-weight, lighter);
    overflow: visible;
    z-index: var(--esp-z-index, 1);
    /* esp=elementari scatter plot */
    font-size: var(--esp-font-size);
  }
  line {
    stroke: var(--esp-grid-stroke, gray);
    stroke-dasharray: var(--esp-grid-dash, 4);
    stroke-width: var(--esp-grid-width, 0.4);
  }
  g.x-axis text {
    text-anchor: middle;
    dominant-baseline: top;
  }
  g.y-axis text {
    dominant-baseline: central;
  }
  foreignObject {
    overflow: visible;
  }
  text.label {
    text-anchor: middle;
  }
</style>
