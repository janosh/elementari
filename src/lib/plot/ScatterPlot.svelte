<script lang="ts">
  import type { Point } from '$lib'
  import { Line } from '$lib'
  import { extent, range } from 'd3-array'
  import { format } from 'd3-format'
  import {
    scaleLinear,
    scaleLog,
    scaleSequential,
    scaleSequentialLog,
    scaleTime,
  } from 'd3-scale'
  import * as d3sc from 'd3-scale-chromatic'
  import { timeFormat } from 'd3-time-format'
  import type { Snippet } from 'svelte'
  import type { DataSeries } from '.'
  import ScatterPoint from './ScatterPoint.svelte'

  // Extract lowercase color scheme names from d3-scale-chromatic interpolate functions
  type D3InterpolateFunc = keyof typeof d3sc & `interpolate${string}`
  type D3ColorSchemeName = Lowercase<
    D3InterpolateFunc extends `interpolate${infer Name}` ? Name : never
  >

  type TooltipProps = {
    x: number
    y: number
    cx: number
    cy: number
    x_formatted: string
    y_formatted: string
    metadata?: Record<string, unknown>
  }

  type TimeInterval = `day` | `month` | `year`

  interface Props {
    series?: DataSeries[]
    style?: string
    x_lim?: [number | null, number | null]
    y_lim?: [number | null, number | null]
    // Explicit ranges for x and y axes. If provided, this overrides the auto-computed range.
    // Use this to set fixed ranges regardless of the data.
    x_range?: [number, number]
    y_range?: [number, number]
    padding?: { t: number; b: number; l: number; r: number }
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
    x_ticks?: number | TimeInterval // Positive: count, Negative: interval, String: time interval
    y_ticks?: number // Positive: count, Negative: interval
    x_scale_type?: `linear` | `log` // Type of scale for x-axis
    y_scale_type?: `linear` | `log` // Type of scale for y-axis
    show_zero_lines?: boolean
    x_grid?: boolean | Record<string, unknown> // Control x-axis grid lines visibility and styling
    y_grid?: boolean | Record<string, unknown> // Control y-axis grid lines visibility and styling
    // Color scaling props
    color_scale_type?: `linear` | `log` // Type of scale for color mapping
    color_scheme?: D3ColorSchemeName // Color scheme from d3-scale-chromatic
    color_range?: [number, number] // Min and max values for color scaling (uses auto detect if not provided)
  }
  let {
    series = [],
    style = ``,
    x_lim = [null, null],
    y_lim = [null, null],
    x_range,
    y_range,
    padding = { t: 5, b: 70, l: 50, r: 20 },
    x_label = ``,
    x_label_yshift = 10,
    y_label = ``,
    y_unit = ``,
    tooltip_point = $bindable(null),
    hovered = $bindable(false),
    markers = `line+points`,
    x_format = ``,
    y_format = ``,
    tooltip,
    change = () => {},
    x_ticks,
    y_ticks = 5,
    x_scale_type = `linear`,
    y_scale_type = `linear`,
    show_zero_lines = true,
    x_grid = true,
    y_grid = true,
    // Color scaling props
    color_scale_type = `linear`,
    color_scheme = `viridis`,
    color_range,
  }: Props = $props()

  const axis_label_offset = { x: 25, y: 10 } // pixels
  let width: number = $state(0)
  let height: number = $state(0)

  // Create raw data points and determine ranges for all series
  let all_points = $derived(
    series
      .filter((item) => item != null) // Filter out null or undefined series first
      .flatMap(({ x: xs, y: ys }) => xs.map((x, idx) => ({ x, y: ys[idx] }))),
  )

  // Gets a range with nice values for an axis based on data points and limits.
  // Uses d3's scale.nice() to create pretty boundaries that snap to round values.
  function get_nice_data_range(
    points: Point[],
    get_value: (p: Point) => number,
    lim: [number | null, number | null],
    scale_type: string,
    is_time = false,
  ): [number, number] {
    // First get raw extent with user limits applied
    const [min, max] = lim
    const [min_ext, max_ext] = extent(points, get_value)

    // Use user-provided limits if available, otherwise use data extent
    const raw_min = min ?? min_ext ?? 0
    const raw_max = max ?? max_ext ?? 1

    // For time formats or when min equals max, just return the raw values
    if (is_time || raw_min === raw_max) {
      return [raw_min, raw_max]
    }

    // Create temporary scale to leverage d3's nice() function
    let scale
    if (scale_type === `log`) {
      // For log scale, ensure positive values and create nicer bounds
      const log_min = Math.max(raw_min, 1e-10)
      const log_max = Math.max(raw_max, log_min * 1.1) // Ensure max > min
      scale = scaleLog().domain([log_min, log_max])
    } else {
      // For linear scale, use standard nice behavior
      scale = scaleLinear().domain([raw_min, raw_max])
    }

    // Apply d3's nice function to get pretty boundaries
    scale.nice()
    const [nice_min, nice_max] = scale.domain()

    return [nice_min, nice_max]
  }

  // Compute auto ranges based on data and limits
  let auto_x_range = $derived(
    get_nice_data_range(
      all_points,
      (point) => point.x,
      x_lim,
      x_scale_type,
      x_format?.startsWith(`%`) || false,
    ),
  )

  let auto_y_range = $derived(
    get_nice_data_range(all_points, (point) => point.y, y_lim, y_scale_type, false),
  )

  // Use provided explicit ranges if available, otherwise fall back to auto-computed ranges
  let effective_x_range = $derived(x_range ?? auto_x_range)
  let effective_y_range = $derived(y_range ?? auto_y_range)

  // Validate log scale ranges
  $effect(() => {
    for (const { scale_type, range, axis } of [
      { scale_type: x_scale_type, range: effective_x_range, axis: `x-axis` },
      { scale_type: y_scale_type, range: effective_y_range, axis: `y-axis` },
    ]) {
      if (scale_type === `log`) {
        const [min, max] = range
        if (min <= 0 || max <= 0) {
          const point = min <= 0 ? `minimum: ${min}` : `maximum: ${max}`
          throw new Error(`Log scale ${axis} cannot have values <= 0. Current ${point}`)
        }
      }
    }
  })
  let [x_min, x_max] = $derived(effective_x_range)
  let [y_min, y_max] = $derived(effective_y_range)

  // Create the actual scale functions
  let x_scale_fn = $derived(
    x_format?.startsWith(`%`)
      ? scaleTime()
          .domain([new Date(x_min), new Date(x_max)])
          .range([padding.l, width - padding.r])
      : x_scale_type === `log`
        ? scaleLog()
            .domain([x_min, x_max])
            .range([padding.l, width - padding.r])
        : scaleLinear()
            .domain([x_min, x_max])
            .range([padding.l, width - padding.r]),
  )

  let y_scale_fn = $derived(
    y_scale_type === `log`
      ? scaleLog()
          .domain([y_min, y_max])
          .range([height - padding.b, padding.t])
      : scaleLinear()
          .domain([y_min, y_max])
          .range([height - padding.b, padding.t]),
  )

  // Filter out points outside x_lim and y_lim for each series
  let filtered_series = $derived(
    series.map((data_series) => {
      const { x: xs, y: ys, color_values, ...rest } = data_series

      // Process each point based on its index
      const processed_points = xs.map((x, idx) => {
        // Get the y-value for this point
        const y = ys[idx]
        // Get the color value for this point (if any)
        const color_value = color_values?.[idx]

        // Process properties with proper typing
        function process_property<T>(
          prop: T[] | T | undefined,
          idx: number,
        ): T | undefined {
          if (!prop) return undefined
          if (Array.isArray(prop) && idx < prop.length) return prop[idx]
          if (!Array.isArray(prop)) return prop
          return undefined
        }

        // Process all point properties using the helper function
        const metadata = rest.metadata
          ? Array.isArray(rest.metadata) && idx < rest.metadata.length
            ? (rest.metadata[idx] as Record<string, unknown>)
            : !Array.isArray(rest.metadata)
              ? (rest.metadata as Record<string, unknown>)
              : undefined
          : undefined
        const point_style = process_property(rest.point_style, idx)
        const point_hover = process_property(rest.point_hover, idx)
        const point_label = process_property(rest.point_label, idx)
        const point_offset = process_property(rest.point_offset, idx)

        // Create the point object with all processed properties
        return {
          x,
          y,
          color_value,
          metadata,
          point_style,
          point_hover,
          point_label,
          point_offset,
          point_tween_duration: rest.point_tween_duration,
        }
      })

      // Filter points to only include those within the specified ranges
      const filtered_data = processed_points.filter((pt) => {
        const x_is_nan = isNaN(pt.x) || pt.x === null
        const y_is_nan = isNaN(pt.y) || pt.y === null
        // Skip points with NaN values or outside the range
        return (
          !x_is_nan &&
          !y_is_nan &&
          pt.x >= x_min &&
          pt.x <= x_max &&
          pt.y >= y_min &&
          pt.y <= y_max
        )
      })

      // Return original series with the processed and filtered data
      return { ...data_series, filtered_data }
    }),
  )

  // Helper function to generate logarithmic ticks
  function generate_log_ticks(
    min: number,
    max: number,
    ticks_option: number | TimeInterval | undefined,
  ): number[] {
    // Ensure min is positive for log scale (avoid log(0) or log(negative))
    min = Math.max(min, 1e-10)

    // Calculate power ranges for log scale ticks
    const min_power = Math.floor(Math.log10(min))
    const max_power = Math.ceil(Math.log10(max))

    // For narrow ranges, extend by 1 power in each direction to ensure grid lines
    // extend beyond the data points, creating a more complete visual reference
    const extended_min_power = max_power - min_power <= 2 ? min_power - 1 : min_power
    const extended_max_power = max_power - min_power <= 2 ? max_power + 1 : max_power

    // Generate powers of 10 for the extended range
    const powers = range(extended_min_power, extended_max_power + 1).map((p) =>
      Math.pow(10, p),
    )

    // For a narrow range with few powers of 10, include intermediate values (2×10^n and 5×10^n)
    // to provide more detailed tick marks
    if (
      max_power - min_power < 3 &&
      typeof ticks_option === `number` &&
      ticks_option > 5
    ) {
      const detailed_ticks: number[] = []
      powers.forEach((power) => {
        detailed_ticks.push(power)
        if (power * 2 <= Math.pow(10, extended_max_power)) detailed_ticks.push(power * 2)
        if (power * 5 <= Math.pow(10, extended_max_power)) detailed_ticks.push(power * 5)
      })
      return detailed_ticks
    }

    return powers
  }

  // Generate x-axis ticks
  let x_tick_values = $derived(() => {
    // If dimensions are not set yet, return empty array
    if (width === 0 || height === 0) return []

    // Time-based ticks (dates)
    if (x_format?.startsWith(`%`)) {
      const time_scale = scaleTime().domain([new Date(x_min), new Date(x_max)])

      // Determine the appropriate tick count
      let count = 10 // default
      if (typeof x_ticks === `number`) {
        count =
          x_ticks < 0
            ? Math.ceil((x_max - x_min) / Math.abs(x_ticks) / 86400000) // Convert to approximate days
            : x_ticks
      } else if (typeof x_ticks === `string`) {
        count =
          x_ticks === `day` ? 30 : x_ticks === `month` ? 12 : x_ticks === `year` ? 10 : 10
      }

      // Generate the ticks
      const ticks = time_scale.ticks(count)

      // Filter based on interval type if specified
      let filtered = ticks
      if (typeof x_ticks === `string`) {
        if (x_ticks === `month`) {
          filtered = ticks.filter((d) => d.getDate() === 1)
        } else if (x_ticks === `year`) {
          filtered = ticks.filter((d) => d.getMonth() === 0 && d.getDate() === 1)
        }
      }

      return filtered.map((d) => d.getTime())
    }

    // For log scale, generate appropriately spaced logarithmic ticks
    if (x_scale_type === `log`) {
      return generate_log_ticks(x_min, x_max, x_ticks)
    }

    // Linear scale with interval specified by negative ticks
    if (typeof x_ticks === `number` && x_ticks < 0) {
      const interval = Math.abs(x_ticks)
      const start = Math.ceil(x_min / interval) * interval
      return range(start, x_max + interval * 0.1, interval)
    }

    // Default linear ticks
    return x_scale_fn.ticks(typeof x_ticks === `number` ? x_ticks : undefined)
  })

  // Generate y-axis ticks
  let y_tick_values = $derived(() => {
    // If dimensions are not set yet, return empty array
    if (width === 0 || height === 0) return []

    // For log scale, generate appropriately spaced logarithmic ticks
    if (y_scale_type === `log`) {
      return generate_log_ticks(y_min, y_max, y_ticks)
    }

    // Linear scale with interval specified by negative ticks
    if (typeof y_ticks === `number` && y_ticks < 0) {
      const interval = Math.abs(y_ticks)
      const start = Math.ceil(y_min / interval) * interval
      return range(start, y_max + interval * 0.1, interval)
    }

    // Default linear ticks
    return y_scale_fn.ticks(typeof y_ticks === `number` && y_ticks > 0 ? y_ticks : 5)
  })

  function on_mouse_move(evt: MouseEvent) {
    if (!tooltip) return

    const svg_box = (evt.currentTarget as SVGElement)?.getBoundingClientRect()
    if (!svg_box) return

    // Get mouse position relative to our SVG element
    const mouse_x_rel = evt.clientX - svg_box.left
    const mouse_y_rel = evt.clientY - svg_box.top

    // Convert screen coordinates to data values using our scale functions
    const mouse_x = x_format?.startsWith(`%`)
      ? new Date(x_scale_fn.invert(mouse_x_rel))
      : x_scale_fn.invert(mouse_x_rel)
    const mouse_y = y_scale_fn.invert(mouse_y_rel)

    // Find closest point to mouse position
    let closest_point = null
    let min_distance = Infinity
    let closest_series = null

    for (const series_idx in filtered_series) {
      const current_series = filtered_series[series_idx]
      if (!current_series || !current_series.filtered_data) continue

      for (const point of current_series.filtered_data) {
        // Calculate squared distance to current point based on scale type
        const dx =
          (x_format?.startsWith(`%`)
            ? Math.abs(new Date(point.x).getTime() - (mouse_x as Date).getTime()) /
              86400000 // Convert ms to days for better distance comparison
            : Math.abs(point.x - (mouse_x as number))) ** 2
        const dy = Math.abs(point.y - mouse_y) ** 2
        const distance = dx + dy
        if (distance < min_distance) {
          min_distance = distance
          closest_point = point
          closest_series = current_series
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

  // Format a value for display
  const format_value = (value: number, formatter: string) => {
    if (!formatter) return `${value}`

    if (formatter?.startsWith(`%`)) {
      return timeFormat(formatter)(new Date(value))
    }
    // First format the number using d3-format
    const formatted = format(formatter)(value)
    // Only remove trailing zeros after a decimal point, not from whole numbers
    return formatted.includes(`.`)
      ? formatted.replace(/(\.\d*?)0+$/, `$1`).replace(/\.$/, ``)
      : formatted
  }

  // Get the color interpolator function based on the scheme name
  const get_color_interpolator = (scheme_name: string): ((t: number) => string) => {
    // Convert the scheme name to the interpolate function name in d3-scale-chromatic
    const first_char = scheme_name.charAt(0).toUpperCase()
    const rest = scheme_name.slice(1).toLowerCase()
    const interpolator_name = `interpolate${first_char}${rest}` as keyof typeof d3sc

    // Use the function if it exists, or fall back to viridis
    return typeof d3sc[interpolator_name] === `function`
      ? d3sc[interpolator_name]
      : d3sc.interpolateViridis
  }

  // Extract all color values from the series data
  let all_color_values = $derived(
    series
      .filter((item) => item != null)
      .flatMap(({ color_values }) => {
        if (!color_values) return []
        return color_values.map((val: number) => val)
      }),
  )

  // Compute auto color range based on all color values
  let auto_color_range = $derived.by(() => {
    if (all_color_values.length === 0) return [0, 1]
    const [min_value, max_value] = extent(all_color_values)
    return [min_value ?? 0, max_value ?? 1]
  })

  // Use provided explicit color range if available, otherwise use auto-computed range
  let effective_color_range = $derived(color_range ?? auto_color_range)
  let [color_min, color_max] = $derived(effective_color_range)

  // Create the color scale function
  let color_scale_fn = $derived.by(() => {
    const interpolator = get_color_interpolator(color_scheme)

    if (color_scale_type === `log`) {
      // Ensure positive values for log scale
      const safe_min = Math.max(color_min, 1e-10)
      const safe_max = Math.max(color_max, safe_min * 1.1)
      return scaleSequentialLog(interpolator).domain([safe_min, safe_max])
    } else {
      return scaleSequential(interpolator).domain([color_min, color_max])
    }
  })
</script>

<div class="scatter" bind:clientWidth={width} bind:clientHeight={height} {style}>
  {#if width && height}
    <svg onmousemove={on_mouse_move} onmouseleave={on_mouse_leave} role="img">
      {#if show_zero_lines}
        <!-- Vertical zero line (only if zero is within range) -->
        {#if x_min <= 0 && x_max >= 0}
          <line
            y1={padding.t}
            y2={height - padding.b}
            x1={x_format?.startsWith(`%`) ? x_scale_fn(new Date(0)) : x_scale_fn(0)}
            x2={x_format?.startsWith(`%`) ? x_scale_fn(new Date(0)) : x_scale_fn(0)}
            stroke="gray"
            stroke-width="0.5"
          />
        {/if}

        <!-- Horizontal zero line (only if zero is within range) -->
        {#if effective_y_range[0] < 0 && effective_y_range[1] > 0}
          <line
            x1={padding.l}
            x2={width - padding.r}
            y1={y_scale_fn(0)}
            y2={y_scale_fn(0)}
            stroke="gray"
            stroke-width="0.5"
          />
        {/if}
      {/if}

      {#if markers && markers.includes(`line`)}
        {#each filtered_series ?? [] as series, series_idx (JSON.stringify( { x: series.x, y: series.y, idx: series_idx }, ))}
          {@const series_color_val = (() => {
            // If the series has color values, use the color of the first point as line color
            if (series.filtered_data?.[0]?.color_value !== undefined) {
              return color_scale_fn(series.filtered_data[0].color_value)
            }
            // Otherwise use the point_style fill if available
            if (
              typeof series?.point_style === `object` &&
              series?.point_style?.fill &&
              typeof series.point_style.fill === `string`
            ) {
              return series.point_style.fill
            }
            // Default transparent-ish white
            return `rgba(255, 255, 255, 0.5)`
          })()}
          {@const series_color =
            typeof series_color_val === `string`
              ? series_color_val
              : `rgba(255, 255, 255, 0.5)`}
          <Line
            points={(series?.filtered_data ?? []).map((point) => [
              x_format?.startsWith(`%`)
                ? x_scale_fn(new Date(point.x))
                : x_scale_fn(point.x),
              y_scale_fn(point.y),
            ])}
            origin={[
              x_format?.startsWith(`%`)
                ? x_scale_fn(new Date(effective_x_range[0]))
                : x_scale_fn(effective_x_range[0]),
              y_scale_fn(effective_y_range[0]),
            ]}
            line_color={series_color}
            line_width={1}
            area_color="transparent"
          />
        {/each}
      {/if}

      {#if markers && markers.includes(`points`)}
        {#each filtered_series ?? [] as series, series_idx (JSON.stringify( { x: series.x, y: series.y, idx: series_idx }, ))}
          {#each series?.filtered_data ?? [] as point, point_idx (JSON.stringify( { ...point, idx: point_idx }, ))}
            {@const point_color_val =
              point.color_value !== undefined
                ? color_scale_fn(point.color_value)
                : undefined}
            {@const point_color =
              typeof point_color_val === `string` ? point_color_val : undefined}
            {@const style = {
              ...(point.point_style ?? {}),
              fill: point_color ?? point.point_style?.fill,
            }}
            <ScatterPoint
              x={x_format?.startsWith(`%`)
                ? x_scale_fn(new Date(point.x))
                : x_scale_fn(point.x)}
              y={y_scale_fn(point.y)}
              {style}
              hover={point.point_hover ?? {}}
              label={point.point_label ?? {}}
              offset={point.point_offset ?? { x: 0, y: 0 }}
              tween_duration={point.point_tween_duration ?? 600}
            />
          {/each}
        {/each}
      {/if}

      <!-- x axis -->
      <g class="x-axis">
        {#if width > 0 && height > 0}
          {#each width === 0 || height === 0 ? [] : x_tick_values().map( (v) => Number(v), ) as tick (tick)}
            {@const tick_pos = x_format?.startsWith(`%`)
              ? x_scale_fn(new Date(tick))
              : x_scale_fn(tick)}
            {@const in_data_range = tick >= x_min && tick <= x_max}
            {@const in_plot_range =
              tick_pos >= padding.l && tick_pos <= width - padding.r}

            {#if in_plot_range}
              <g class="tick" transform="translate({tick_pos}, {height - padding.b})">
                <!-- Draw grid line that spans the entire plot height -->
                {#if x_grid}
                  <line
                    y1={-(height - padding.b - padding.t)}
                    y2="0"
                    {...typeof x_grid === `object` ? x_grid : {}}
                  />
                {/if}

                <!-- Only show text label for ticks within the data range -->
                {#if in_data_range}
                  <text y={axis_label_offset.x}>
                    {format_value(tick, x_format)}
                  </text>
                {/if}
              </g>
            {/if}
          {/each}
        {/if}
        <text x={width / 2} y={height - x_label_yshift} class="label x">
          {@html x_label ?? ``}
        </text>
      </g>

      <!-- y axis -->
      <g class="y-axis">
        {#if width > 0 && height > 0}
          {#each width === 0 || height === 0 ? [] : y_tick_values().map( (v) => Number(v), ) as tick, idx (tick)}
            {@const tick_pos = y_scale_fn(tick)}
            {@const in_data_range = tick >= y_min && tick <= y_max}
            {@const in_plot_range =
              tick_pos >= padding.t && tick_pos <= height - padding.b}

            {#if in_plot_range}
              <g class="tick" transform="translate({padding.l}, {tick_pos})">
                <!-- Draw grid line that spans the entire plot width -->
                {#if y_grid}
                  <line
                    x1="0"
                    x2={width - padding.l - padding.r}
                    {...typeof y_grid === `object` ? y_grid : {}}
                  />
                {/if}

                <!-- Only show text label for ticks within the data range -->
                {#if in_data_range}
                  <text x={-axis_label_offset.y} text-anchor="end">
                    {format_value(tick, y_format)}
                    {#if y_unit && idx === 0}
                      &zwnj;&ensp;{y_unit}
                    {/if}
                  </text>
                {/if}
              </g>
            {/if}
          {/each}
        {/if}

        {#if height > 0}
          {@const y_axis_height = height - padding.t - padding.b}
          {@const y_title_pos = -(padding.t + y_axis_height / 2)}
          <text
            x={y_title_pos}
            y={0}
            transform="rotate(-90)"
            class="label y"
            text-anchor="middle"
            dominant-baseline="middle"
          >
            {@html y_label ?? ``}
          </text>
        {/if}
      </g>

      {#if tooltip_point && hovered}
        {@const { x, y, metadata } = tooltip_point}
        {@const cx = x_format?.startsWith(`%`) ? x_scale_fn(new Date(x)) : x_scale_fn(x)}
        {@const cy = y_scale_fn(y)}
        {@const x_formatted = format_value(x, x_format)}
        {@const y_formatted = format_value(y, y_format)}
        <circle {cx} {cy} r="5" fill="orange" />
        <foreignObject x={cx + 5} y={cy}>
          {#if tooltip}
            {@render tooltip({ x, y, cx, cy, x_formatted, y_formatted, metadata })}
          {:else}
            <div style="white-space: nowrap;">
              x: {x_formatted}, y: {y_formatted}
            </div>
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
    /* esp stands for elementari scatter plot */
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
