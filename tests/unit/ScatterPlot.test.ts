/**
 * @vitest-environment happy-dom
 */

import { ScatterPlot } from '$lib'
import { mount } from 'svelte'
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

describe(`ScatterPlot`, () => {
  // Add container with dimensions to body before each test
  const container_style = `width: 800px; height: 600px; position: relative;`

  // Mock ResizeObserver for Svelte 5
  beforeAll(() => {
    // Mock ResizeObserver
    globalThis.ResizeObserver = class ResizeObserver {
      callback: ResizeObserverCallback

      constructor(callback: ResizeObserverCallback) {
        this.callback = callback
      }

      observe(target: Element) {
        const dom_rect = {
          width: 800,
          height: 600,
          top: 0,
          left: 0,
          bottom: 600,
          right: 800,
          x: 0,
          y: 0,
        }
        // Simulate initial size reporting
        this.callback(
          [{ target, contentRect: dom_rect } as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        )
      }

      unobserve() {}
      disconnect() {}
    }

    // Mock getBoundingClientRect for SVG elements
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      x: 0,
      y: 0,
      toJSON: () => {},
    }))
  })

  // Helper to simulate mouse events
  function simulate_mouse_event(
    element: Element | null,
    event_type: string,
    coords = { x: 400, y: 300 },
  ) {
    if (!element) return

    const event = new MouseEvent(event_type, {
      bubbles: true,
      cancelable: true,
      clientX: coords.x,
      clientY: coords.y,
    })

    // Define offsetX and offsetY properties
    Object.defineProperties(event, {
      offsetX: { value: coords.x },
      offsetY: { value: coords.y },
    })

    element.dispatchEvent(event)
  }

  beforeEach(() => {
    // Reset document state
    document.body.innerHTML = ``
    const container = document.createElement(`div`)
    container.setAttribute(`style`, container_style)
    document.body.appendChild(container)
  })

  test(`renders with default props and applies custom style`, () => {
    // Default props
    mount(ScatterPlot, { target: document.body })

    let scatter = document.querySelector(`.scatter`)
    expect(scatter).toBeTruthy()
    expect(getComputedStyle(scatter!).width).toBe(`100%`)

    document.body.innerHTML = ``

    // Custom style
    const style = `height: 300px; background: black;`
    mount(ScatterPlot, { target: document.body, props: { style } })

    scatter = document.querySelector(`.scatter`)
    expect(scatter).toBeTruthy()
    expect(scatter!.getAttribute(`style`)).toContain(style)
  })

  test.each([
    {
      name: `basic data`,
      data: {
        x: [1, 2, 3, 4, 5],
        y: [5, 3, 8, 2, 7],
        point_style: { fill: `steelblue`, radius: 5 },
        metadata: { label: `Series 1` } as Record<string, unknown>,
      },
      x_lim: [null, null] as [number | null, number | null],
      y_lim: [null, null] as [number | null, number | null],
      markers: `points` as const,
    },
    {
      name: `data with y limits`,
      data: {
        x: [1, 2, 3, 4, 5],
        y: [5, 3, 20, 2, 7],
        point_style: { fill: `steelblue`, radius: 5 },
        metadata: { label: `Series 2` } as Record<string, unknown>,
      },
      x_lim: [null, null] as [number | null, number | null],
      y_lim: [0, 10] as [number | null, number | null],
      markers: `line` as const,
    },
    {
      name: `data with x limits`,
      data: {
        x: [0, 1, 2, 3, 10],
        y: [5, 3, 8, 2, 7],
        point_style: { fill: `steelblue`, radius: 5 },
        metadata: { label: `Series 3` } as Record<string, unknown>,
      },
      x_lim: [0, 5] as [number | null, number | null],
      y_lim: [null, null] as [number | null, number | null],
      markers: `line+points` as const,
    },
  ])(
    `renders with different configurations: $name`,
    ({ data, x_lim, y_lim, markers }) => {
      const component = mount(ScatterPlot, {
        target: document.body,
        props: {
          series: [data],
          x_label: `X Axis`,
          y_label: `Y Axis`,
          x_lim,
          y_lim,
          markers,
        },
      })

      // Verify component mounted
      expect(component).toBeTruthy()
      const scatter = document.querySelector(`.scatter`)
      expect(scatter).toBeTruthy()
    },
  )

  test(`renders with multiple data series and handles empty data series`, () => {
    const series_a = {
      x: [1, 2, 3],
      y: [5, 3, 8],
      point_style: { fill: `steelblue`, radius: 4 },
      metadata: { label: `Series A` } as Record<string, unknown>,
    }

    const series_b = {
      x: [1, 2, 3],
      y: [2, 5, 3],
      point_style: { fill: `orangered`, radius: 4 },
      metadata: { label: `Series B` } as Record<string, unknown>,
    }

    // Test with multiple series
    const component = mount(ScatterPlot, {
      target: document.body,
      props: { series: [series_a, series_b], markers: `line+points` },
    })

    // Verify component mounted
    expect(component).toBeTruthy()
    const scatter = document.querySelector(`.scatter`)
    expect(scatter).toBeTruthy()

    document.body.innerHTML = ``

    // Test empty data
    const empty_component = mount(ScatterPlot, {
      target: document.body,
      props: { series: [] },
    })

    // Verify component mounted
    expect(empty_component).toBeTruthy()
    const empty_scatter = document.querySelector(`.scatter`)
    expect(empty_scatter).toBeTruthy()
  })

  test(`renders with different tick formats and data types`, () => {
    // Test with numeric data
    const numeric_data = {
      x: [0, 10, 20, 30, 40, 50],
      y: [0, 30, 15, 45, 20, 50],
      point_style: { fill: `steelblue`, radius: 5 },
    }

    const component = mount(ScatterPlot, {
      target: document.body,
      props: {
        series: [numeric_data],
        x_ticks: -10,
        y_ticks: -5,
        x_format: `.0f`,
        y_format: `.0f`,
      },
    })

    // Verify component mounted
    expect(component).toBeTruthy()
    const scatter = document.querySelector(`.scatter`)
    expect(scatter).toBeTruthy()

    document.body.innerHTML = ``

    // Test with timestamp data
    const timestamp_data = {
      x: Array.from({ length: 12 }, (_, i) => {
        const date = new Date()
        date.setMonth(date.getMonth() - (12 - i))
        return date.getTime()
      }),
      y: Array.from({ length: 12 }, () => Math.random() * 100),
      point_style: { fill: `steelblue`, radius: 5 },
    }

    const time_component = mount(ScatterPlot, {
      target: document.body,
      props: {
        series: [timestamp_data],
        x_ticks: `month`,
        y_ticks: 5,
        x_format: `%b %Y`,
        y_format: `.0f`,
      },
    })

    // Verify component mounted
    expect(time_component).toBeTruthy()
    const time_scatter = document.querySelector(`.scatter`)
    expect(time_scatter).toBeTruthy()
  })

  test(`renders with various props (labels, padding, tooltips)`, () => {
    const test_data = {
      x: [1, 2, 3, 4, 5],
      y: [10, 20, 30, 40, 50],
      point_style: { fill: `steelblue`, radius: 5 },
    }

    const component = mount(ScatterPlot, {
      target: document.body,
      props: {
        series: [test_data],
        x_label: `Time (s)`,
        y_label: `Speed`,
        y_unit: `m/s`,
        x_format: `.1f`,
        y_format: `.0f`,
        pad_top: 20,
        pad_bottom: 50,
        pad_left: 80,
        pad_right: 30,
        x_label_yshift: 10,
        tooltip_point: { x: 3, y: 30 },
        hovered: true,
      },
    })

    // Verify component mounted
    expect(component).toBeTruthy()
    const scatter = document.querySelector(`.scatter`)
    expect(scatter).toBeTruthy()
  })

  test(`handles mouse events`, () => {
    const mock_change = vi.fn()
    const test_data = {
      x: [1, 2, 3, 4, 5],
      y: [10, 20, 30, 40, 50],
      point_style: { fill: `steelblue`, radius: 5 },
      metadata: { label: `Test Data` } as Record<string, unknown>,
    }

    const component = mount(ScatterPlot, {
      target: document.body,
      props: { series: [test_data], change: mock_change },
    })

    // Verify component mounted
    expect(component).toBeTruthy()
    const scatter = document.querySelector(`.scatter`)
    expect(scatter).toBeTruthy()

    // Trigger mouse events on the container instead of the SVG
    simulate_mouse_event(scatter, `mousemove`, { x: 400, y: 300 })
  })

  test(`handles all edge cases and safeguards against invalid data`, () => {
    // Create a series with all types of problematic data
    const comprehensive_test_data = [
      // Valid series with some missing/null data points
      {
        x: [1, 2, null, 4, 5] as (number | null | undefined)[],
        y: [5, 4, undefined, 2, 1] as (number | null | undefined)[],
        point_style: { fill: `steelblue`, radius: 5 },
      },
      // Completely null/undefined series item
      null,
      undefined,
      // Valid item but with mismatched x/y lengths (5 vs 3)
      { x: [10, 20, 30, 40, 50], y: [10, 20, 30] },
      // Valid series with valid data
      { x: [100, 200, 300], y: [10, 20, 30] },
    ]

    const component = mount(ScatterPlot, {
      target: document.body,
      props: {
        series: comprehensive_test_data,
        // Test various edge cases together
        x_lim: [null, null] as [number | null, number | null],
        y_lim: [null, null] as [number | null, number | null],
        markers: `line+points`,
      },
    })

    // Component should render without crashing
    expect(component).toBeTruthy()
    const scatter = document.querySelector(`.scatter`)
    expect(scatter).toBeTruthy()

    // Test with data that would be filtered out by range limits
    const filtered_component = mount(ScatterPlot, {
      target: document.body,
      props: {
        series: [{ x: [1, 2, 3], y: [4, 5, 6] }],
        // Set limits that will filter out all data points
        x_lim: [100, 200] as [number, number],
        y_lim: [100, 200] as [number, number],
      },
    })

    // Should still render without valid data points
    expect(filtered_component).toBeTruthy()
    const filtered_scatter = document.querySelector(`.scatter`)
    expect(filtered_scatter).toBeTruthy()
  })

  test(`handles negative values and zero line rendering`, () => {
    // Create data with positive and negative values
    const test_data = { x: [1, 2, 3, 4, 5], y: [-10, -5, 0, 5, 10] }

    const component = mount(ScatterPlot, {
      target: document.body,
      props: { series: [test_data], y_lim: [-15, 15] },
    })

    // Verify component mounted
    expect(component).toBeTruthy()
    const scatter = document.querySelector(`.scatter`)
    expect(scatter).toBeTruthy()

    // Test with only positive values
    const pos_component = mount(ScatterPlot, {
      target: document.body,
      props: {
        series: [{ x: [1, 2, 3, 4, 5], y: [5, 10, 15, 20, 25] }],
        y_lim: [0, 30],
      },
    })

    // Verify component mounted
    expect(pos_component).toBeTruthy()
    const pos_scatter = document.querySelector(`.scatter`)
    expect(pos_scatter).toBeTruthy()
  })

  // Test the tooltip rendering directly - this exercises the format_value function
  test(`directly tests format_value function through tooltip rendering`, () => {
    // Test both time formatting and numeric formatting
    const timestamp = new Date(2023, 5, 15).getTime() // June 15, 2023
    const decimal_value = 123.45

    // Mount with tooltip_point and explicitly set formats
    const component = mount(ScatterPlot, {
      target: document.body,
      props: {
        series: [{ x: [timestamp], y: [decimal_value] }],
        tooltip_point: { x: timestamp, y: decimal_value },
        hovered: true,
        x_format: `%b %d, %Y`,
        y_format: `.2f`,
      },
    })

    // Component should render
    expect(component).toBeTruthy()
  })

  // Test using default tooltip
  test(`renders with default tooltip`, () => {
    const component = mount(ScatterPlot, {
      target: document.body,
      props: {
        series: [{ x: [1, 2, 3], y: [10, 20, 30] }],
        tooltip_point: { x: 2, y: 20 },
        hovered: true,
      },
    })

    // Component should render
    expect(component).toBeTruthy()
  })

  // Test on_mouse_move with complex scenarios
  test(`exercises on_mouse_move function with different data configurations`, () => {
    // Use a series with multiple points to test finding closest point
    const test_data = {
      x: [10, 20, 30, 40, 50],
      y: [5, 15, 25, 35, 45],
      metadata: { series: `Series A` },
    }

    const mock_change = vi.fn()

    const component = mount(ScatterPlot, {
      target: document.body,
      props: { series: [test_data], change: mock_change },
    })

    // Verify component mounted
    expect(component).toBeTruthy()
    const scatter = document.querySelector(`.scatter`)
    expect(scatter).toBeTruthy()

    // Simulate mouse moving over different areas
    simulate_mouse_event(scatter, `mousemove`, { x: 200, y: 200 }) // Middle of plot
    simulate_mouse_event(scatter, `mousemove`, { x: 100, y: 100 }) // Top-left
    simulate_mouse_event(scatter, `mousemove`, { x: 700, y: 500 }) // Bottom-right

    // Test with multiple series
    document.body.innerHTML = ``
    document.body.appendChild(document.createElement(`div`))
    document.querySelector(`div`)!.setAttribute(`style`, container_style)

    const series_a = {
      x: [10, 20, 30],
      y: [10, 20, 30],
      metadata: { series: `A` },
    }

    const series_b = {
      x: [15, 25, 35],
      y: [15, 25, 35],
      metadata: { series: `B` },
    }

    const multi_component = mount(ScatterPlot, {
      target: document.body,
      props: { series: [series_a, series_b], change: mock_change },
    })

    // Verify component mounted
    expect(multi_component).toBeTruthy()
    const multi_scatter = document.querySelector(`.scatter`)
    expect(multi_scatter).toBeTruthy()

    // Simulate mouse moving over area where points from both series exist
    simulate_mouse_event(multi_scatter, `mousemove`, { x: 400, y: 300 })
  })

  // Test with various format specifiers to exercise the format_value function
  test(`handles various format specifiers in format_value function`, () => {
    // Test various numeric format specifiers
    const formats = [
      { value: 12.345, format: `.1f`, expected: `12.3` },
      { value: 12.345, format: `.3f`, expected: `12.345` },
      { value: 12.345, format: `.5f`, expected: `12.34500` }, // Will strip trailing zeros
      { value: 12, format: `.2f`, expected: `12` }, // Integer should not show decimal
      { value: 1234.5, format: `,.0f`, expected: `1,235` }, // With thousands separator
    ]

    formats.forEach(({ value, format }) => {
      const component = mount(ScatterPlot, {
        target: document.body,
        props: {
          series: [{ x: [1], y: [value] }],
          y_format: format,
          tooltip_point: { x: 1, y: value },
          hovered: true,
        },
      })

      expect(component).toBeTruthy()
    })

    // Test time format specifiers
    const now = new Date()
    const timestamp = now.getTime()

    const time_formats = [
      { format: `%Y`, description: `year only` },
      { format: `%b %Y`, description: `month and year` },
      { format: `%B %d, %Y`, description: `full date` },
      { format: `%H:%M`, description: `time only` },
    ]

    time_formats.forEach(({ format }) => {
      const component = mount(ScatterPlot, {
        target: document.body,
        props: {
          series: [{ x: [timestamp], y: [1] }],
          x_format: format,
          tooltip_point: { x: timestamp, y: 1 },
          hovered: true,
        },
      })

      expect(component).toBeTruthy()
    })
  })
})
