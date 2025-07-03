# Histogram

## Basic Histogram with Single Series

A simple histogram showing the distribution of values from a single data series. Use the controls to adjust the number of bins and see how it affects the visualization:

```svelte example stackblitz
<script>
  import { Histogram } from '$lib'

  // Shared data generation utilities
  function box_muller(mean = 0, std_dev = 1) {
    const u1 = Math.random()
    const u2 = Math.random()
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    return mean + z0 * std_dev
  }

  function generate_normal(count, mean = 0, std_dev = 1) {
    return Array.from({ length: count }, () => box_muller(mean, std_dev))
  }

  let bin_count = $state(20)
  let sample_size = $state(1000)

  let basic_data = $derived({
    y: generate_normal(sample_size, 50, 15),
    label: `Normal Distribution (μ=50, σ=15)`,
    point_style: { fill: `steelblue` },
  })
</script>

<div>
  <div style="display: flex; gap: 2em; margin-bottom: 1em; align-items: center">
    <label>
      Bins: {bin_count}
      <input type="range" bind:value={bin_count} min="5" max="50" step="1" />
    </label>
    <label>
      Sample Size: {sample_size}
      <input type="range" bind:value={sample_size} min="100" max="5000" step="100" />
    </label>
  </div>

  <Histogram
    series={[basic_data]}
    bins={bin_count}
    x_label="Value"
    y_label="Frequency"
    style="height: 350px"
  >
    {#snippet tooltip({ value, count, property })}
      <strong>{property}</strong><br>
      Value: {value.toFixed(1)}<br>
      Count: {count}
    {/snippet}
  </Histogram>
</div>
```

## Multiple Series Overlay

Compare multiple data distributions by overlaying them in the same histogram. Toggle series visibility and adjust opacity to better see overlapping regions:

```svelte example stackblitz
<script>
  import { Histogram } from '$lib'

  // Shared utilities
  function box_muller(mean = 0, std_dev = 1) {
    const u1 = Math.random()
    const u2 = Math.random()
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    return mean + z0 * std_dev
  }

  function generate_normal(count, mean = 0, std_dev = 1) {
    return Array.from({ length: count }, () => box_muller(mean, std_dev))
  }

  function generate_exponential(count, lambda) {
    return Array.from({ length: count }, () => -Math.log(1 - Math.random()) / lambda)
  }

  function generate_uniform(count, min_val, max_val) {
    return Array.from({ length: count }, () =>
      min_val + Math.random() * (max_val - min_val)
    )
  }

  let bar_opacity = $state(0.6)
  let stroke_width = $state(1)

  let overlay_series = $state([
    {
      y: generate_normal(800, 5, 2),
      label: `Normal (μ=5, σ=2)`,
      line_style: { stroke: `crimson` },
      visible: true,
    },
    {
      y: generate_exponential(800, 0.3),
      label: `Exponential (λ=0.3)`,
      line_style: { stroke: `royalblue` },
      visible: true,
    },
    {
      y: generate_uniform(800, 0, 15),
      label: `Uniform (0-15)`,
      line_style: { stroke: `mediumseagreen` },
      visible: true,
    },
  ])

  function toggle_series(series_idx) {
    overlay_series[series_idx].visible = !overlay_series[series_idx].visible
    overlay_series = [...overlay_series]
  }
</script>

<div>
  <div style="display: flex; gap: 2em; margin-bottom: 1em; align-items: center; flex-wrap: wrap;">
    <label>
      Opacity: {bar_opacity}
      <input type="range" bind:value={bar_opacity} min="0.1" max="1" step="0.1" />
    </label>
    <label>
      Stroke Width: {stroke_width}
      <input type="range" bind:value={stroke_width} min="0" max="3" step="0.5" />
    </label>
  </div>

  <div style="display: flex; gap: 1em; margin-bottom: 1em;">
    {#each overlay_series as series_data, idx}
      <label style="display: flex; align-items: center;">
        <input
          type="checkbox"
          checked={series_data.visible}
          onchange={() => toggle_series(idx)}
        />
        <span
          style="display: inline-block; width: 16px; height: 16px; margin: 0 0.5em; background: {series_data.line_style.stroke};"
        ></span>
        {series_data.label}
      </label>
    {/each}
  </div>

  <Histogram
    series={overlay_series}
    mode="overlay"
    bins={25}
    {bar_opacity}
    bar_stroke_width={stroke_width}
    x_label="Value"
    y_label="Frequency"
    style="height: 400px"
  >
    {#snippet tooltip({ value, count, property })}
      <strong style="color: {overlay_series.find(s => s.label === property)?.line_style?.stroke}">
        {property}
      </strong><br>
      Value: {value.toFixed(2)}<br>
      Count: {count}
    {/snippet}
  </Histogram>
</div>
```

## Logarithmic Scales

For data that spans multiple orders of magnitude, logarithmic scales can be useful. This example shows data with both linear and log-normal distributions:

```svelte example stackblitz
<script>
  import { Histogram } from '$lib'

  // Shared utilities
  function box_muller(mean = 0, std_dev = 1) {
    const u1 = Math.random()
    const u2 = Math.random()
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    return mean + z0 * std_dev
  }

  function generate_log_normal(count, mu, sigma) {
    return Array.from({ length: count }, () => Math.exp(box_muller(mu, sigma)))
  }

  function generate_power_law(count, alpha, x_min = 1) {
    return Array.from({ length: count }, () => {
      const u = Math.random()
      return x_min * Math.pow(1 - u, -1 / (alpha - 1))
    })
  }

  let x_scale = $state(`linear`)
  let y_scale = $state(`linear`)

  let log_scale_series = $state([
    {
      y: generate_log_normal(1000, 2, 1),
      label: `Log-Normal`,
      line_style: { stroke: `darkorange` },
    },
    {
      y: generate_power_law(1000, 2.5),
      label: `Power Law`,
      line_style: { stroke: `darkgreen` },
    },
  ])
</script>

<div>
  <div style="display: flex; gap: 2em; margin-bottom: 1em">
    <div>
      <strong>X Scale:</strong>
      {#each [`linear`, `log`] as scale_type}
        <label style="margin-left: 0.5em">
          <input type="radio" bind:group={x_scale} value={scale_type} />
          {scale_type}
        </label>
      {/each}
    </div>
    <div>
      <strong>Y Scale:</strong>
      {#each [`linear`, `log`] as scale_type}
        <label style="margin-left: 0.5em">
          <input type="radio" bind:group={y_scale} value={scale_type} />
          {scale_type}
        </label>
      {/each}
    </div>
  </div>

  {#key [x_scale, y_scale]}
    <Histogram
      series={log_scale_series}
      mode="overlay"
      bins={30}
      x_scale_type={x_scale}
      y_scale_type={y_scale}
      x_label="Value ({x_scale} scale)"
      y_label="Frequency ({y_scale} scale)"
      x_format="~s"
      y_format={y_scale === `log` ? `~s` : `d`}
      bar_opacity={0.7}
      style="height: 400px"
    />
  {/key}
</div>
```

## Real-World Data Distributions

This example demonstrates histograms with different types of real-world data patterns including bimodal, skewed, and discrete distributions:

```svelte example stackblitz
<script>
  import { Histogram } from '$lib'

  // Shared utilities
  function box_muller(mean = 0, std_dev = 1) {
    const u1 = Math.random()
    const u2 = Math.random()
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    return mean + z0 * std_dev
  }

  function weighted_choice(weights) {
    const rand = Math.random()
    let cumulative = 0
    for (let idx = 0; idx < weights.length; idx++) {
      cumulative += weights[idx]
      if (rand <= cumulative) return idx
    }
    return weights.length - 1
  }

  function generate_bimodal(count) {
    return Array.from({ length: count }, () => {
      const use_first_mode = Math.random() < 0.6
      const mean = use_first_mode ? 20 : 60
      const std_dev = use_first_mode ? 8 : 12
      return box_muller(mean, std_dev)
    })
  }

  function generate_skewed(count) {
    return Array.from({ length: count }, () => {
      // Sum of exponentials approximates gamma
      let sum = 0
      for (let k = 0; k < 3; k++) {
        sum += -Math.log(Math.random()) * 5
      }
      return sum
    })
  }

  function generate_discrete(count) {
    const weights = [0.05, 0.08, 0.12, 0.15, 0.18, 0.2, 0.15, 0.05, 0.015, 0.005]
    return Array.from({ length: count }, () => {
      const choice = weighted_choice(weights)
      return choice + 1 + Math.random() * 0.8 - 0.4 // Add jitter
    })
  }

  function generate_age_distribution(count) {
    return Array.from({ length: count }, () => {
      const rand = Math.random()
      if (rand < 0.25) return Math.random() * 18 // 0-18
      if (rand < 0.6) return Math.random() * 25 + 18 // 18-43
      if (rand < 0.85) return Math.random() * 22 + 43 // 43-65
      return Math.random() * 25 + 65 // 65-90
    })
  }

  let selected_distribution = $state(`bimodal`)

  let distributions = $derived({
    bimodal: {
      data: generate_bimodal(1200),
      label: `Bimodal Distribution`,
      color: `#e74c3c`,
      description: `Two distinct peaks (mixture of normals)`,
    },
    skewed: {
      data: generate_skewed(1000),
      label: `Right-Skewed Distribution`,
      color: `#3498db`,
      description: `Long tail extending to the right`,
    },
    discrete: {
      data: generate_discrete(800),
      label: `Survey Responses (1-10)`,
      color: `#2ecc71`,
      description: `Discrete values with weighted probabilities`,
    },
    age: {
      data: generate_age_distribution(1500),
      label: `Age Distribution`,
      color: `#9b59b6`,
      description: `Multi-modal age groups in population`,
    },
  })

  let current_data = $derived(distributions[selected_distribution])
</script>

<div>
  <div style="margin-bottom: 1em">
    <label>
      Distribution Type:
      <select bind:value={selected_distribution} style="margin-left: 0.5em">
        {#each Object.entries(distributions) as [key, dist]}
          <option value={key}>{dist.label}</option>
        {/each}
      </select>
    </label>
  </div>

  <p style="margin-bottom: 1em; font-style: italic; color: #666">
    {current_data.description}
  </p>

  <Histogram
    series={[{
      y: current_data.data,
      label: current_data.label,
      line_style: { stroke: current_data.color },
    }]}
    bins={selected_distribution === `discrete` ? 10 : 30}
    x_label={selected_distribution === `age`
    ? `Age (years)`
    : selected_distribution === `discrete`
    ? `Rating`
    : `Value`}
    y_label="Count"
    x_format={selected_distribution === `discrete` ? `.1f` : `.0f`}
    style="height: 400px"
  >
    {#snippet tooltip({ value, count, property })}
      <strong>{property}</strong><br>
      {
        selected_distribution === `age`
        ? `Age`
        : selected_distribution === `discrete`
        ? `Rating`
        : `Value`
      }:
      {value.toFixed(selected_distribution === `discrete` ? 1 : 0)}<br>
      Count: {count}<br>
      Percentage: {(count / current_data.data.length * 100).toFixed(1)}%
    {/snippet}
  </Histogram>
</div>
```

## Interactive Bin Size Comparison

This example shows how different bin sizes affect the same data visualization. Use the controls to see how bin count impacts pattern recognition:

```svelte example stackblitz
<script>
  import { Histogram } from '$lib'

  function generate_mixed_data(count) {
    return Array.from({ length: count }, () => {
      const rand = Math.random()
      if (rand < 0.3) return 10 + (Math.random() - 0.5) * 6 // Small peak around 10
      if (rand < 0.7) return 40 + (Math.random() - 0.5) * 20 // Large peak around 40
      return Math.random() * 80 // Uniform background
    })
  }

  let bin_counts = $state([10, 25, 50])
  let show_overlay = $state(false)

  const base_data = generate_mixed_data(2000)
  const colors = [`#e74c3c`, `#3498db`, `#2ecc71`]

  let histogram_series = $derived(
    show_overlay
      ? bin_counts.map((bins, idx) => ({
        y: base_data,
        label: `${bins} bins`,
        line_style: { stroke: colors[idx] },
      }))
      : [{
        y: base_data,
        label: `Mixed Distribution`,
        line_style: { stroke: `#8e44ad` },
      }],
  )

  let current_bins = $derived(show_overlay ? 25 : bin_counts[1])
</script>

<div>
  <div
    style="display: flex; gap: 2em; margin-bottom: 1em; align-items: center; flex-wrap: wrap"
  >
    <label>
      <input type="checkbox" bind:checked={show_overlay} />
      Show Multiple Bin Sizes
    </label>

    {#if !show_overlay}
      <label>
        Bins: {bin_counts[1]}
        <input type="range" bind:value={bin_counts[1]} min="5" max="100" step="5" />
      </label>
    {:else}
      {#each bin_counts as bins, idx}
        <label>
          Bins {idx + 1}: {bins}
          <input type="range" bind:value={bin_counts[idx]} min="5" max="100" step="5" />
        </label>
      {/each}
    {/if}
  </div>

  <Histogram
    series={histogram_series}
    mode={show_overlay ? `overlay` : `single`}
    bins={current_bins}
    bar_opacity={show_overlay ? 0.5 : 0.8}
    bar_stroke_width={show_overlay ? 1.5 : 0}
    x_label="Value"
    y_label="Frequency"
    style="height: 400px"
  >
    {#snippet tooltip({ value, count, property })}
      <strong>{property}</strong><br>
      Value: {value.toFixed(1)}<br>
      Count: {count}
      {#if show_overlay}<br>Bin Size Effect{/if}
    {/snippet}
  </Histogram>

  <div
    style="margin-top: 1em; padding: 1em; background: rgba(0, 0, 0, 0.05); border-radius: 4px"
  >
    <strong>Bin Size Effects:</strong>
    <ul style="margin: 0.5em 0">
      <li>
        <strong>Too few bins:</strong> May hide important patterns and make distribution
        appear smoother than it is
      </li>
      <li>
        <strong>Too many bins:</strong> May show noise as patterns and make it harder to
        see overall shape
      </li>
      <li>
        <strong>Just right:</strong> Reveals true distribution patterns without
        over-fitting to noise
      </li>
    </ul>
  </div>
</div>
```

## Custom Styling and Formatting

Demonstrate various styling options including custom colors, axis formatting, and layout customization:

```svelte example stackblitz
<script>
  import { Histogram } from '$lib'

  // Shared utilities
  function box_muller(mean = 0, std_dev = 1) {
    const u1 = Math.random()
    const u2 = Math.random()
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    return mean + z0 * std_dev
  }

  function generate_financial_data(count) {
    return Array.from({ length: count }, () => {
      const exponent = 4.5 + box_muller(0, 0.5)
      // Clamp to prevent overflow (exp(709) is near JS max safe float)
      return Math.exp(Math.min(exponent, 700))
    })
  }

  let color_scheme = $state(`default`)
  let x_format_type = $state(`number`)
  let y_format_type = $state(`count`)

  const color_schemes = {
    default: [`#3498db`],
    warm: [`#e74c3c`, `#f39c12`, `#e67e22`],
    cool: [`#3498db`, `#2ecc71`, `#1abc9c`],
    monochrome: [`#2c3e50`, `#34495e`, `#7f8c8d`],
  }

  const x_formats = {
    number: `.1f`,
    scientific: `.2e`,
    percentage: `.1%`,
    currency: `$,.0f`,
  }

  const y_formats = {
    count: `d`,
    percentage: `.1%`,
    thousands: `,.0f`,
  }

  let financial_data = generate_financial_data(800)
  let padding_config = $state({ t: 30, b: 80, l: 80, r: 30 })

  let styled_series = $derived([{
    y: financial_data,
    label: `Stock Prices`,
    line_style: { stroke: color_schemes[color_scheme][0] },
  }])
</script>

<div>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1em; margin-bottom: 1em;">
    <label>
      Color Scheme:
      <select bind:value={color_scheme}>
        {#each Object.keys(color_schemes) as scheme}
          <option value={scheme}>{scheme}</option>
        {/each}
      </select>
    </label>

    <label>
      X-Axis Format:
      <select bind:value={x_format_type}>
        {#each Object.entries(x_formats) as [key, format]}
          <option value={key}>{key} ({format})</option>
        {/each}
      </select>
    </label>

    <label>
      Y-Axis Format:
      <select bind:value={y_format_type}>
        {#each Object.entries(y_formats) as [key, format]}
          <option value={key}>{key} ({format})</option>
        {/each}
      </select>
    </label>
  </div>

  <div style="display: flex; gap: 1em; margin-bottom: 1em; align-items: center;">
    <span>Padding:</span>
    {#each [`t`, `b`, `l`, `r`] as side}
      <label>
        {side.toUpperCase()}: {padding_config[side]}
        <input
          type="range"
          bind:value={padding_config[side]}
          min="10"
          max="100"
          step="5"
          style="width: 80px;"
        />
      </label>
    {/each}
  </div>

  <Histogram
    series={styled_series}
    bins={25}
    x_label={x_format_type === `currency` ? `Stock Price` : `Value`}
    y_label={y_format_type === `percentage` ? `Percentage` : `Count`}
    x_format={x_formats[x_format_type]}
    y_format={y_format_type === `percentage` ? `.1%` : y_formats[y_format_type]}
    padding={padding_config}
    style="height: 400px; border: 2px solid {color_schemes[color_scheme][0]}; border-radius: 8px; background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(0,0,0,0.05));"
  >
    {#snippet tooltip({ value, count, property })}
      <div style="background: {color_schemes[color_scheme][0]}; color: white; padding: 8px; border-radius: 6px; font-weight: bold;">
        <strong>{property}</strong><br>
        {x_format_type === `currency` ? `Price` : `Value`}:
        {x_format_type === `currency` ? `$${value.toFixed(0)}` : value.toFixed(2)}<br>
        Count: {count}<br>
        {#if y_format_type === `percentage`}
          Percentage: {(count / financial_data.length * 100).toFixed(1)}%
        {/if}
      </div>
    {/snippet}
  </Histogram>
</div>
```

## Time-Series Data Histogram

This example shows how to create histograms from time-based data, useful for analyzing patterns in timestamps, durations, or cyclical data:

```svelte example stackblitz
<script>
  import { Histogram } from '$lib'

  function weighted_choice(weights) {
    const rand = Math.random()
    let cumulative = 0
    for (let idx = 0; idx < weights.length; idx++) {
      cumulative += weights[idx]
      if (rand <= cumulative) return idx
    }
    return weights.length - 1
  }

  function generate_time_data(type, unit) {
    const count = 1000

    if (type === `website_traffic`) {
      if (unit === `hour`) {
        // Business hours pattern
        const weights = [
          0.5,
          0.3,
          0.2,
          0.2,
          0.3,
          0.5,
          1.0,
          2.0,
          3.0,
          3.5,
          3.0,
          2.5,
          2.0,
          2.5,
          3.0,
          3.5,
          4.0,
          3.5,
          2.0,
          1.5,
          1.0,
          0.8,
          0.6,
          0.4,
        ]
        return Array.from({ length: count }, () => weighted_choice(weights))
      } else {
        // Day of week pattern (Mon-Sun)
        const weights = [0.8, 1.2, 1.3, 1.4, 1.5, 1.0, 0.6]
        return Array.from({ length: count }, () => weighted_choice(weights))
      }
    } else {
      // Server response times - mostly fast with outliers
      return Array.from({ length: count }, () => {
        const rand = Math.random()
        if (rand < 0.85) return Math.random() * 200 // Fast responses
        if (rand < 0.95) return 200 + Math.random() * 800 // Slow responses
        return 1000 + Math.random() * 4000 // Very slow responses
      })
    }
  }

  let time_unit = $state(`hour`)
  let data_type = $state(`website_traffic`)

  let time_series_data = $derived(generate_time_data(data_type, time_unit))

  let config = $derived({
    labels: data_type === `website_traffic`
      ? {
        x: time_unit === `hour` ? `Hour of Day` : `Day of Week`,
        y: `Page Views`,
        format: `d`,
      }
      : { x: `Response Time (ms)`, y: `Number of Requests`, format: `.0f` },
    bins: data_type === `website_traffic` && time_unit === `hour`
      ? 24
      : data_type === `website_traffic`
      ? 7
      : 30,
    color: data_type === `website_traffic` ? `#3498db` : `#e74c3c`,
  })
</script>

<div>
  <div style="display: flex; gap: 2em; margin-bottom: 1em; align-items: center">
    <label>
      Data Type:
      <select bind:value={data_type}>
        <option value="website_traffic">Website Traffic</option>
        <option value="server_response">Server Response Times</option>
      </select>
    </label>

    {#if data_type === `website_traffic`}
      <label>
        Time Unit:
        <select bind:value={time_unit}>
          <option value="hour">Hour of Day</option>
          <option value="day">Day of Week</option>
        </select>
      </label>
    {/if}
  </div>

  <Histogram
    series={[{
      y: time_series_data,
      label: data_type === `website_traffic` ? `Website Traffic` : `Response Times`,
      line_style: { stroke: config.color },
    }]}
    bins={config.bins}
    x_label={config.labels.x}
    y_label={config.labels.y}
    x_format={config.labels.format}
    style="height: 400px"
  >
    {#snippet tooltip({ value, count, property })}
      <strong>{property}</strong><br>
      {#if data_type === `website_traffic`}
        {#if time_unit === `hour`}
          Hour: {Math.floor(value)}:00
        {:else}
          Day: {[`Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`, `Sun`][Math.floor(value)]}
        {/if}
      {:else}
        Response Time: {value.toFixed(0)}ms
      {/if}
      <br>Count: {count}
    {/snippet}
  </Histogram>

  <div
    style="margin-top: 1em; padding: 1em; background: rgba(0, 0, 0, 0.05); border-radius: 4px"
  >
    {#if data_type === `website_traffic`}
      <strong>Traffic Pattern Analysis:</strong>
      {#if time_unit === `hour`}
        Notice the typical business hours pattern with peaks during 9-17h and lower
        activity at night.
      {:else}
        Weekday traffic is higher than weekend traffic, with Friday being the peak day.
      {/if}
    {:else}
      <strong>Performance Analysis:</strong>
      Most requests complete quickly (&lt;200ms), with a small percentage of slower
      requests creating a long tail distribution.
    {/if}
  </div>
</div>
```
