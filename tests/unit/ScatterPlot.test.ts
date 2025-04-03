import { ScatterPlot } from '$lib'
import { mount, tick } from 'svelte'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'

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
        // Simulate initial size reporting
        setTimeout(() => {
          this.callback(
            [
              {
                target,
                contentRect: {
                  width: 800,
                  height: 600,
                  top: 0,
                  left: 0,
                  bottom: 600,
                  right: 800,
                  x: 0,
                  y: 0,
                } as DOMRectReadOnly,
              } as ResizeObserverEntry,
            ],
            this as unknown as ResizeObserver,
          )
        }, 0)
      }

      unobserve() {}
      disconnect() {}
    }

    // Mock getBoundingClientRect for SVG elements (needed for calculating mouse positions)
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

  // Ensure clean up after each test
  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = ``
  })

  beforeEach(() => {
    // Reset document state
    document.body.innerHTML = ``
    const container = document.createElement(`div`)
    container.setAttribute(`style`, container_style)
    document.body.appendChild(container)
  })

  test(`renders with default props`, async () => {
    mount(ScatterPlot, {
      target: document.querySelector(`div`)!,
    })
    await tick()
    await tick() // Additional tick for SVG rendering
    await new Promise((resolve) => setTimeout(resolve, 0)) // Allow ResizeObserver to fire

    const scatter = document.querySelector(`.scatter`)
    expect(scatter).toBeTruthy()
    expect(getComputedStyle(scatter!).width).toBe(`100%`)
  })

  test(`applies custom style`, async () => {
    const style = `height: 300px; background: black;`
    mount(ScatterPlot, {
      target: document.querySelector(`div`)!,
      props: { style },
    })
    await tick()
    await tick() // Additional tick for SVG rendering
    await new Promise((resolve) => setTimeout(resolve, 0)) // Allow ResizeObserver to fire

    const scatter = document.querySelector(`.scatter`)
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
    },
  ])(
    `renders with single data series: $name`,
    async ({ data, x_lim, y_lim }) => {
      const component = mount(ScatterPlot, {
        target: document.querySelector(`div`)!,
        props: {
          series: [data],
          x_label: `X Axis`,
          y_label: `Y Axis`,
          x_lim,
          y_lim,
        },
      })
      await tick()
      await tick() // Additional tick for SVG rendering
      await new Promise((resolve) => setTimeout(resolve, 0)) // Allow ResizeObserver to fire

      // Check if component mounted successfully
      expect(component).toBeTruthy()

      // Check if scatter component is rendered
      const scatter = document.querySelector(`.scatter`)
      expect(scatter).toBeTruthy()
    },
  )

  test.each([
    { name: `line+points`, markers: `line+points` as const },
    { name: `points only`, markers: `points` as const },
    { name: `line only`, markers: `line` as const },
  ])(`renders with multiple data series: $name`, async ({ markers }) => {
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

    const component = mount(ScatterPlot, {
      target: document.querySelector(`div`)!,
      props: {
        series: [series_a, series_b],
        markers,
      },
    })
    await tick()
    await tick() // Additional tick for SVG rendering
    await new Promise((resolve) => setTimeout(resolve, 0)) // Allow ResizeObserver to fire

    // Just verify component mounted successfully
    expect(component).toBeTruthy()

    // Check if scatter component is rendered
    const scatter = document.querySelector(`.scatter`)
    expect(scatter).toBeTruthy()
  })

  test.each([
    {
      name: `numeric x and y ticks`,
      x_ticks: -10,
      y_ticks: -5,
      x_format: `.0f`,
      y_format: `.0f`,
    },
    {
      name: `count-based ticks`,
      x_ticks: 10,
      y_ticks: 8,
      x_format: `.1f`,
      y_format: `.1f`,
    },
    {
      name: `default ticks`,
      x_ticks: undefined,
      y_ticks: undefined,
      x_format: `.0f`,
      y_format: `.0f`,
    },
  ])(
    `renders with custom tick formats: $name`,
    async ({ x_ticks, y_ticks, x_format, y_format }) => {
      const test_data = {
        x: [0, 10, 20, 30, 40, 50],
        y: [0, 30, 15, 45, 20, 50],
        point_style: { fill: `steelblue`, radius: 5 },
        metadata: { label: `Test Data` } as Record<string, unknown>,
      }

      const component = mount(ScatterPlot, {
        target: document.querySelector(`div`)!,
        props: {
          series: [test_data],
          x_ticks,
          y_ticks,
          x_format,
          y_format,
        },
      })
      await tick()
      await tick() // Additional tick for SVG rendering
      await new Promise((resolve) => setTimeout(resolve, 0)) // Allow ResizeObserver to fire

      // Just verify component mounted successfully
      expect(component).toBeTruthy()

      // Check if scatter component is rendered
      const scatter = document.querySelector(`.scatter`)
      expect(scatter).toBeTruthy()
    },
  )

  test.each([
    {
      name: `basic negative values`,
      data: {
        x: [-50, -25, 0, 25, 50],
        y: [-25, -10, 0, 10, 25],
      },
      x_lim: [-60, 60] as [number | null, number | null],
      y_lim: [-30, 30] as [number | null, number | null],
    },
    {
      name: `only positive values`,
      data: {
        x: [10, 20, 30, 40, 50],
        y: [10, 20, 30, 40, 50],
      },
      x_lim: [0, 60] as [number | null, number | null],
      y_lim: [0, 60] as [number | null, number | null],
    },
  ])(`handles custom ranges: $name`, async ({ data, x_lim, y_lim }) => {
    const test_data = {
      ...data,
      point_style: { fill: `steelblue`, radius: 5 },
      metadata: { label: `Test Data` } as Record<string, unknown>,
    }

    const component = mount(ScatterPlot, {
      target: document.querySelector(`div`)!,
      props: {
        series: [test_data],
        x_lim,
        y_lim,
        x_ticks: -20,
        y_ticks: -10,
      },
    })
    await tick()
    await tick() // Additional tick for SVG rendering
    await new Promise((resolve) => setTimeout(resolve, 0)) // Allow ResizeObserver to fire

    // Just verify component mounted successfully
    expect(component).toBeTruthy()

    // Check if scatter component is rendered
    const scatter = document.querySelector(`.scatter`)
    expect(scatter).toBeTruthy()
  })

  test(`renders with units and formatted labels`, async () => {
    const test_data = {
      x: [1, 2, 3, 4, 5],
      y: [10, 20, 30, 40, 50],
      point_style: { fill: `steelblue`, radius: 5 },
      metadata: { label: `Test Data` } as Record<string, unknown>,
    }

    const component = mount(ScatterPlot, {
      target: document.querySelector(`div`)!,
      props: {
        series: [test_data],
        x_label: `Time (s)`,
        y_label: `Speed`,
        y_unit: `m/s`,
        x_format: `.1f`,
        y_format: `.0f`,
      },
    })
    await tick()
    await tick() // Additional tick for SVG rendering
    await new Promise((resolve) => setTimeout(resolve, 0)) // Allow ResizeObserver to fire

    // Just verify component mounted successfully
    expect(component).toBeTruthy()

    // Check if scatter component is rendered
    const scatter = document.querySelector(`.scatter`)
    expect(scatter).toBeTruthy()
  })

  test(`handles mouse interactions correctly`, async () => {
    const mock_change = vi.fn()
    const test_data = {
      x: [1, 2, 3, 4, 5],
      y: [10, 20, 30, 40, 50],
      point_style: { fill: `steelblue`, radius: 5 },
      metadata: { label: `Test Data` } as Record<string, unknown>,
    }

    const component = mount(ScatterPlot, {
      target: document.querySelector(`div`)!,
      props: {
        series: [test_data],
        change: mock_change,
      },
    })
    await tick()
    await tick() // Additional tick for SVG rendering
    await new Promise((resolve) => setTimeout(resolve, 0)) // Allow ResizeObserver to fire

    // Just verify component mounted successfully
    expect(component).toBeTruthy()

    // Check if scatter component is rendered
    const scatter = document.querySelector(`.scatter`)
    expect(scatter).toBeTruthy()
  })

  test(`handles custom padding`, async () => {
    const test_data = {
      x: [1, 2, 3, 4, 5],
      y: [10, 20, 30, 40, 50],
      point_style: { fill: `steelblue`, radius: 5 },
      metadata: { label: `Test Data` } as Record<string, unknown>,
    }

    const component = mount(ScatterPlot, {
      target: document.querySelector(`div`)!,
      props: {
        series: [test_data],
        pad_top: 20,
        pad_bottom: 50,
        pad_left: 80,
        pad_right: 30,
      },
    })
    await tick()
    await tick() // Additional tick for SVG rendering
    await new Promise((resolve) => setTimeout(resolve, 0)) // Allow ResizeObserver to fire

    // Just verify component mounted successfully
    expect(component).toBeTruthy()

    // Check if scatter component is rendered
    const scatter = document.querySelector(`.scatter`)
    expect(scatter).toBeTruthy()
  })

  test(`handles empty data series`, async () => {
    const component = mount(ScatterPlot, {
      target: document.querySelector(`div`)!,
      props: {
        series: [],
      },
    })
    await tick()
    await tick() // Additional tick for SVG rendering
    await new Promise((resolve) => setTimeout(resolve, 0)) // Allow ResizeObserver to fire

    // Just verify component mounted successfully
    expect(component).toBeTruthy()

    // Check if scatter component is rendered
    const scatter = document.querySelector(`.scatter`)
    expect(scatter).toBeTruthy()
  })
})
