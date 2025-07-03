<script lang="ts">
  import type { DataSeries } from '$lib/plot'
  import { Histogram } from '$lib/plot'

  // Basic single series data
  let bin_count = $state(20)
  let sample_size = $state(1000)

  // Function to generate normal distribution data
  function generate_normal_data(count: number, mean = 0, std_dev = 1) {
    const values = []
    for (let idx = 0; idx < count; idx += 2) {
      const u1 = Math.random()
      const u2 = Math.random()
      const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2)
      values.push(z0 * std_dev + mean)
      if (idx + 1 < count) values.push(z1 * std_dev + mean)
    }
    return values.slice(0, count)
  }

  // Generate data for basic test
  let basic_data = $derived.by(() => {
    const values = generate_normal_data(sample_size, 5, 2)
    return [{
      x: values.map((_, idx) => idx),
      y: values,
      label: `Normal Distribution`,
      visible: true,
      line_style: { stroke: `#2563eb` },
      point_style: { fill: `#2563eb` },
    }] as DataSeries[]
  })

  // Multiple series overlay data
  let normal_visible = $state(true)
  let exponential_visible = $state(true)
  let uniform_visible = $state(true)
  let overlay_opacity = $state(0.7)
  let stroke_width = $state(1.5)

  let multiple_series_data = $derived.by(() => {
    const normal_data = generate_normal_data(500, 5, 2)
    const exponential_data = Array.from(
      { length: 500 },
      () => -Math.log(Math.random()) / 0.3,
    )
    const uniform_data = Array.from({ length: 500 }, () => Math.random() * 15)

    return [
      {
        x: normal_data.map((_, idx) => idx),
        y: normal_data,
        label: `Normal (μ=5, σ=2)`,
        visible: normal_visible,
        line_style: {
          stroke: `#2563eb`,
          stroke_width: stroke_width,
        },
        point_style: { fill: `#2563eb` },
      },
      {
        x: exponential_data.map((_, idx) => idx),
        y: exponential_data,
        label: `Exponential (λ=0.3)`,
        visible: exponential_visible,
        line_style: {
          stroke: `#dc2626`,
          stroke_width: stroke_width,
        },
        point_style: { fill: `#dc2626` },
      },
      {
        x: uniform_data.map((_, idx) => idx),
        y: uniform_data,
        label: `Uniform (0-15)`,
        visible: uniform_visible,
        line_style: {
          stroke: `#16a34a`,
          stroke_width: stroke_width,
        },
        point_style: { fill: `#16a34a` },
      },
    ] as DataSeries[]
  })

  // Logarithmic scales
  let x_scale = $state(`linear`)
  let y_scale = $state(`linear`)

  let log_data = $derived.by(() => {
    // Log-normal and power law data
    const log_normal = Array.from(
      { length: 1000 },
      () => Math.exp(Math.random() * 2 + 1),
    )
    const power_law = Array.from({ length: 1000 }, () => Math.pow(Math.random(), -2))

    return [
      {
        x: log_normal.map((_, idx) => idx),
        y: log_normal,
        label: `Log-normal`,
        visible: true,
        line_style: { stroke: `#2563eb` },
        point_style: { fill: `#2563eb` },
      },
      {
        x: power_law.map((_, idx) => idx),
        y: power_law,
        label: `Power law`,
        visible: true,
        line_style: { stroke: `#dc2626` },
        point_style: { fill: `#dc2626` },
      },
    ] as DataSeries[]
  })

  // Real-world distributions
  let distribution_type = $state(`bimodal`)
  let distribution_description = $derived(() => {
    switch (distribution_type) {
      case `bimodal`:
        return `Two distinct peaks representing different populations`
      case `skewed`:
        return `Long tail extending to the right, common in income data`
      case `discrete`:
        return `Discrete values only (integers), like survey responses`
      case `age`:
        return `Multi-modal age groups in a population`
      default:
        return `Unknown distribution`
    }
  })

  let real_world_data = $derived.by(() => {
    let values: number[] = []

    switch (distribution_type) {
      case `bimodal`:
        values = [
          ...generate_normal_data(300, 20, 3),
          ...generate_normal_data(300, 50, 4),
        ]
        break
      case `skewed`:
        values = Array.from({ length: 500 }, () => Math.pow(Math.random(), 3) * 100)
        break
      case `discrete`:
        values = Array.from({ length: 200 }, () => Math.floor(Math.random() * 6) + 1)
        break
      case `age`:
        values = [
          ...generate_normal_data(100, 25, 5),
          ...generate_normal_data(150, 45, 8),
          ...generate_normal_data(100, 65, 6),
        ]
        break
    }

    return [{
      x: values.map((_, idx) => idx),
      y: values,
      label: distribution_type.charAt(0).toUpperCase() + distribution_type.slice(1),
      visible: true,
      line_style: { stroke: `#2563eb` },
      point_style: { fill: `#2563eb` },
    }] as DataSeries[]
  })

  // Bin size comparison
  let show_overlay = $state(false)
  let single_bin_count = $state(20)
  let bin_count_10 = $state(10)
  let bin_count_30 = $state(30)
  let bin_count_100 = $state(100)

  let bin_comparison_data = $derived.by(() => {
    const values = generate_normal_data(1000, 0, 1)
    const base_series = {
      x: values.map((_, idx) => idx),
      y: values,
      visible: true,
      line_style: { stroke: `#2563eb` },
      point_style: { fill: `#2563eb` },
    }

    if (show_overlay) {
      return [
        { ...base_series, label: `${bin_count_10} bins` },
        { ...base_series, label: `${bin_count_30} bins` },
        { ...base_series, label: `${bin_count_100} bins` },
      ] as DataSeries[]
    } else {
      return [{ ...base_series, label: `${single_bin_count} bins` }] as DataSeries[]
    }
  })

  // Custom styling
  let color_scheme = $state(`default`)
  let x_format = $state(`number`)
  let y_format = $state(`count`)
  let padding_top = $state(60)
  let padding_bottom = $state(60)
  let padding_left = $state(80)
  let padding_right = $state(40)

  let styled_data = $derived.by(() => {
    const values = generate_normal_data(500, 0, 1)
    return [{
      x: values.map((_, idx) => idx),
      y: values,
      label: `Styled Data`,
      visible: true,
      line_style: { stroke: `#2563eb` },
      point_style: { fill: `#2563eb` },
    }] as DataSeries[]
  })

  // Time-series data
  let data_type = $state(`website_traffic`)
  let time_unit = $state(`hour`)

  let time_series_data = $derived.by(() => {
    let values: number[] = []

    if (data_type === `website_traffic`) {
      if (time_unit === `hour`) {
        // Website traffic by hour (peak during business hours)
        values = Array.from({ length: 24 }, (_, hour) => {
          const base = hour >= 9 && hour <= 17 ? 100 : 20
          return base + Math.random() * 30
        })
      } else if (time_unit === `day`) {
        // Website traffic by day of week
        values = [80, 120, 110, 105, 115, 60, 50] // Mon-Sun
      } else { // Fallback for website traffic
        values = Array.from({ length: 24 }, () => 50 + Math.random() * 50)
      }
    } else if (data_type === `server_response`) {
      // Server response times
      values = Array.from({ length: 100 }, () => Math.random() * 200 + 50)
    } else { // Fallback for any unknown data type
      values = Array.from({ length: 50 }, () => Math.random() * 100)
    }

    // Ensure we always have at least one data point
    if (values.length === 0) values = [50, 60, 70, 80, 90]

    return [{
      x: values.map((_, idx) => idx),
      y: values,
      label: data_type === `website_traffic` ? `Website Traffic` : `Server Response`,
      visible: true,
      line_style: { stroke: `#2563eb` },
      point_style: { fill: `#2563eb` },
    }] as DataSeries[]
  })
</script>

<div style="padding: 2rem; max-width: 1200px; margin: 0 auto">
  <h1>Histogram Component Tests</h1>

  <!-- Basic Single Series Test -->
  <section
    id="basic-single-series"
    style="margin: 2rem 0; padding: 1rem; border: 1px solid #ddd"
  >
    <h2>Basic Single Series</h2>
    <div style="margin: 1rem 0">
      <label>Bin Count: <input type="range" min="5" max="50" bind:value={bin_count} /> {
          bin_count
        }</label>
      <label style="margin-left: 1rem">Sample Size: <input
          type="range"
          min="100"
          max="5000"
          bind:value={sample_size}
        /> {sample_size}</label>
    </div>
    <div class="histogram" style="height: 400px; border: 1px solid #ccc">
      <Histogram
        series={basic_data}
        bins={bin_count}
        mode="single"
        x_label="Value"
        y_label="Frequency"
      />
    </div>
  </section>

  <!-- Multiple Series Overlay Test -->
  <section
    id="multiple-series-overlay"
    style="margin: 2rem 0; padding: 1rem; border: 1px solid #ddd"
  >
    <h2>Multiple Series Overlay</h2>
    <div style="margin: 1rem 0">
      <label>Opacity: <input
          type="range"
          min="0.1"
          max="1"
          step="0.1"
          bind:value={overlay_opacity}
        /> {overlay_opacity}</label>
      <label style="margin-left: 1rem">Stroke Width: <input
          type="range"
          min="0.5"
          max="5"
          step="0.5"
          bind:value={stroke_width}
        /> {stroke_width}</label>
    </div>
    <div style="margin: 1rem 0">
      <label><input type="checkbox" bind:checked={normal_visible} /> Normal</label>
      <label style="margin-left: 1rem"><input
          type="checkbox"
          bind:checked={exponential_visible}
        /> Exponential</label>
      <label style="margin-left: 1rem"><input
          type="checkbox"
          bind:checked={uniform_visible}
        /> Uniform</label>
    </div>
    <div class="histogram" style="height: 400px; border: 1px solid #ccc">
      <Histogram
        series={multiple_series_data}
        bins={30}
        mode="overlay"
        show_legend={true}
      />
    </div>
  </section>

  <!-- Logarithmic Scales Test -->
  <section
    id="logarithmic-scales"
    style="margin: 2rem 0; padding: 1rem; border: 1px solid #ddd"
  >
    <h2>Logarithmic Scales</h2>
    <div style="margin: 1rem 0">
      <label>X-axis:
        <input type="radio" name="x-scale" value="linear" bind:group={x_scale} /> Linear
        <input type="radio" name="x-scale" value="log" bind:group={x_scale} /> Log
      </label>
      <label style="margin-left: 2rem">Y-axis:
        <input type="radio" name="y-scale" value="linear" bind:group={y_scale} /> Linear
        <input type="radio" name="y-scale" value="log" bind:group={y_scale} /> Log
      </label>
    </div>
    <div class="histogram" style="height: 400px; border: 1px solid #ccc">
      <Histogram
        series={log_data}
        bins={50}
        mode="overlay"
        {x_scale}
        {y_scale}
      />
    </div>
  </section>

  <!-- Real-World Distributions Test -->
  <section
    id="real-world-distributions"
    style="margin: 2rem 0; padding: 1rem; border: 1px solid #ddd"
  >
    <h2>Real-World Data Distributions</h2>
    <div style="margin: 1rem 0">
      <label>Distribution Type:
        <select bind:value={distribution_type}>
          <option value="bimodal">Bimodal</option>
          <option value="skewed">Skewed</option>
          <option value="discrete">Discrete</option>
          <option value="age">Age Groups</option>
        </select>
      </label>
    </div>
    <p style="font-style: italic; margin: 0.5rem 0">{distribution_description}</p>
    <div class="histogram" style="height: 400px; border: 1px solid #ccc">
      <Histogram
        series={real_world_data}
        bins={distribution_type === `discrete` ? 6 : 25}
        mode="single"
      />
    </div>
  </section>

  <!-- Bin Size Comparison Test -->
  <section
    id="bin-size-comparison"
    style="margin: 2rem 0; padding: 1rem; border: 1px solid #ddd"
  >
    <h2>Bin Size Comparison</h2>
    <div style="margin: 1rem 0">
      <label><input type="checkbox" bind:checked={show_overlay} /> Show Overlay</label>
    </div>
    {#if show_overlay}
      <div style="margin: 1rem 0">
        <label>10 bins: <input type="range" min="5" max="20" bind:value={bin_count_10} />
          {bin_count_10}</label>
        <label style="margin-left: 1rem">30 bins: <input
            type="range"
            min="20"
            max="50"
            bind:value={bin_count_30}
          /> {bin_count_30}</label>
        <label style="margin-left: 1rem">100 bins: <input
            type="range"
            min="50"
            max="150"
            bind:value={bin_count_100}
          /> {bin_count_100}</label>
      </div>
    {:else}
      <div style="margin: 1rem 0">
        <label>Bin Count: <input
            type="range"
            min="5"
            max="100"
            bind:value={single_bin_count}
          /> {single_bin_count}</label>
      </div>
    {/if}
    <div style="background: #f0f8ff; padding: 1rem; margin: 1rem 0; border-radius: 4px">
      <h4>Bin Size Effects</h4>
      <ul>
        <li><strong>Too few bins:</strong> Oversimplified, loses detail</li>
        <li><strong>Too many bins:</strong> Noisy, hard to see patterns</li>
        <li><strong>Just right:</strong> Clear patterns, appropriate detail</li>
      </ul>
    </div>
    <div class="histogram" style="height: 400px; border: 1px solid #ccc">
      <Histogram
        series={bin_comparison_data}
        bins={show_overlay
        ? [bin_count_10, bin_count_30, bin_count_100]
        : single_bin_count}
        mode={show_overlay ? `overlay` : `single`}
        show_legend={show_overlay}
      />
    </div>
  </section>

  <!-- Custom Styling Test -->
  <section
    id="custom-styling"
    style="margin: 2rem 0; padding: 1rem; border: 1px solid #ddd; border-radius: 8px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)"
  >
    <h2>Custom Styling</h2>
    <div style="margin: 1rem 0">
      <label>Color Scheme:
        <select bind:value={color_scheme}>
          <option value="default">Default</option>
          <option value="warm">Warm</option>
          <option value="cool">Cool</option>
          <option value="monochrome">Monochrome</option>
        </select>
      </label>
      <label style="margin-left: 1rem">X Format:
        <select bind:value={x_format}>
          <option value="number">Number</option>
          <option value="scientific">Scientific</option>
          <option value="currency">Currency</option>
          <option value="percentage">Percentage</option>
        </select>
      </label>
      <label style="margin-left: 1rem">Y Format:
        <select bind:value={y_format}>
          <option value="count">Count</option>
          <option value="percentage">Percentage</option>
          <option value="thousands">Thousands</option>
        </select>
      </label>
    </div>
    <div style="margin: 1rem 0">
      <label>Padding Top: <input
          type="range"
          min="20"
          max="100"
          bind:value={padding_top}
        /> {padding_top}</label>
      <label style="margin-left: 1rem">Padding Bottom: <input
          type="range"
          min="20"
          max="100"
          bind:value={padding_bottom}
        /> {padding_bottom}</label>
      <label style="margin-left: 1rem">Padding Left: <input
          type="range"
          min="40"
          max="120"
          bind:value={padding_left}
        /> {padding_left}</label>
      <label style="margin-left: 1rem">Padding Right: <input
          type="range"
          min="20"
          max="80"
          bind:value={padding_right}
        /> {padding_right}</label>
    </div>
    <div
      class="histogram"
      style="height: 400px; border: 2px solid #333; border-radius: 8px; background: white"
    >
      <Histogram
        series={styled_data}
        bins={25}
        mode="single"
        {color_scheme}
        {x_format}
        {y_format}
        padding={{
          top: padding_top,
          bottom: padding_bottom,
          left: padding_left,
          right: padding_right,
        }}
      />
    </div>
  </section>

  <!-- Time-Series Data Test -->
  <section
    id="time-series-data"
    style="margin: 2rem 0; padding: 1rem; border: 1px solid #ddd"
  >
    <h2>Time-Series Data</h2>
    <div style="margin: 1rem 0">
      <label>Data Type:
        <select bind:value={data_type}>
          <option value="website_traffic">Website Traffic</option>
          <option value="server_response">Server Response</option>
        </select>
      </label>
      {#if data_type === `website_traffic`}
        <label style="margin-left: 1rem">Time Unit:
          <select bind:value={time_unit}>
            <option value="hour">Hour of Day</option>
            <option value="day">Day of Week</option>
          </select>
        </label>
      {/if}
    </div>
    <div style="background: #f9f9f9; padding: 1rem; margin: 1rem 0; border-radius: 4px">
      <h4>Analysis</h4>
      {#if data_type === `website_traffic`}
        <p>
          <strong>Traffic Pattern Analysis:</strong> Shows peak activity during business
          hours and weekdays.
        </p>
      {:else}
        <p>
          <strong>Performance Analysis:</strong> Distribution of server response times
          helps identify performance bottlenecks.
        </p>
      {/if}
    </div>
    <div class="histogram" style="height: 400px; border: 1px solid #ccc">
      <Histogram
        series={time_series_data}
        bins={data_type === `website_traffic` && time_unit === `hour`
        ? 24
        : data_type === `website_traffic` && time_unit === `day`
        ? 7
        : 20}
        mode="single"
        x_label={data_type === `website_traffic` && time_unit === `hour`
        ? `Hour of Day`
        : data_type === `website_traffic` && time_unit === `day`
        ? `Day of Week`
        : `Response Time (ms)`}
        y_label="Count"
      />
    </div>
  </section>
</div>

<style>
  section {
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .histogram {
    position: relative;
  }

  label {
    display: inline-block;
    margin: 0.5rem 0;
    font-weight: 500;
  }

  input[type='range'] {
    margin: 0 0.5rem;
  }

  select {
    margin: 0 0.5rem;
    padding: 0.25rem;
  }
</style>
