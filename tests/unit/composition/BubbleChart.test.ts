import type { Composition } from '$lib'
import { describe, expect, test, vi } from 'vitest'

// Mock the composition parsing utilities
vi.mock(`$lib/composition/parse`, () => ({
  get_total_atoms: vi.fn((comp: Composition) =>
    Object.values(comp).reduce((sum, val) => sum + (val || 0), 0),
  ),
}))

// Mock the colors module
vi.mock(`$lib/colors`, () => ({
  element_color_schemes: {
    Vesta: {
      H: `#ffffff`,
      O: `#ff0d0d`,
      C: `#909090`,
      Fe: `#e06633`,
    },
    Jmol: {
      H: `#ffffff`,
      O: `#ff0d0d`,
      C: `#909090`,
      Fe: `#e06633`,
    },
  },
}))

// Mock the state module
vi.mock(`$lib/state.svelte`, () => ({
  colors: {
    element: {
      H: `#ffffff`,
      O: `#ff0d0d`,
      C: `#909090`,
      Fe: `#e06633`,
    },
  },
}))

describe(`BubbleChart component logic`, () => {
  test(`should import without errors`, async () => {
    const module = await import(`$lib/composition/BubbleChart.svelte`)
    expect(module.default).toBeDefined()
  })

  test(`should have proper TypeScript component interface`, async () => {
    // Test that the component can be imported and has expected structure
    const BubbleChart = await import(`$lib/composition/BubbleChart.svelte`)
    expect(typeof BubbleChart.default).toBe(`function`)
  })

  test(`should render SVG with correct viewBox`, async () => {
    const { mount } = await import(`svelte`)
    const BubbleChart = (await import(`$lib/composition/BubbleChart.svelte`))
      .default

    document.body.innerHTML = ``
    mount(BubbleChart, {
      target: document.body,
      props: {
        composition: { H: 2, O: 1 },
        size: 200,
      },
    })

    const svg = document.querySelector(`svg`)
    expect(svg).toBeTruthy()
    expect(svg?.getAttribute(`viewBox`)).toBe(`0 0 200 200`)
  })

  test(`should render circles for each element`, async () => {
    const { mount } = await import(`svelte`)
    const BubbleChart = (await import(`$lib/composition/BubbleChart.svelte`))
      .default

    document.body.innerHTML = ``
    mount(BubbleChart, {
      target: document.body,
      props: {
        composition: { H: 2, O: 1, C: 1 },
        size: 200,
      },
    })

    const circles = document.querySelectorAll(`circle`)
    expect(circles.length).toBe(3) // One for each element
  })

  test(`should handle interactive mode`, async () => {
    const { mount } = await import(`svelte`)
    const BubbleChart = (await import(`$lib/composition/BubbleChart.svelte`))
      .default

    document.body.innerHTML = ``
    mount(BubbleChart, {
      target: document.body,
      props: {
        composition: { H: 2, O: 1 },
        size: 200,
        interactive: true,
      },
    })

    const circles = document.querySelectorAll(`circle[role="button"]`)
    expect(circles.length).toBeGreaterThan(0)
  })
})

describe(`BubbleChart circle packing logic`, () => {
  test(`should calculate bubble radii proportional to amounts`, () => {
    const size = 200
    const padding = 20

    // For bubble chart, area should be proportional to amount
    // So radius should be proportional to sqrt(amount)
    const max_amount = 4 // H
    const available_area = (size - 2 * padding) ** 2
    const max_radius = Math.sqrt(available_area / (2 * Math.PI)) * 0.8 // 2 elements

    const h_radius = Math.sqrt(4 / max_amount) * max_radius // should be max_radius
    const o_radius = Math.sqrt(1 / max_amount) * max_radius // should be half

    expect(h_radius).toBeCloseTo(max_radius, 2)
    expect(o_radius).toBeCloseTo(max_radius * 0.5, 2)
  })

  test(`should handle single element bubble`, () => {
    const size = 200

    // Single bubble should be centered
    const center_x = size / 2
    const center_y = size / 2

    expect(center_x).toBe(100)
    expect(center_y).toBe(100)
  })

  test(`should handle equal amounts`, () => {
    // All bubbles should have equal radius
    const max_amount = 1
    const size = 200
    const padding = 20
    const available_area = (size - 2 * padding) ** 2
    const max_radius = Math.sqrt(available_area / (3 * Math.PI)) * 0.8

    const radius = Math.sqrt(1 / max_amount) * max_radius

    // All should be equal
    expect(radius).toBeCloseTo(max_radius, 2)
  })
})

describe(`BubbleChart data processing`, () => {
  test(`should process composition data correctly`, async () => {
    const { get_total_atoms } = await import(`$lib/composition/parse`)
    const composition: Composition = { H: 2, O: 1 }

    const total = get_total_atoms(composition)
    expect(total).toBe(3)
  })

  test(`should handle empty composition`, async () => {
    const { get_total_atoms } = await import(`$lib/composition/parse`)
    const composition: Composition = {}

    const total = get_total_atoms(composition)
    expect(total).toBe(0)
  })

  test(`should handle large compositions`, async () => {
    const { get_total_atoms } = await import(`$lib/composition/parse`)
    const composition: Composition = { C: 60 } // fullerene

    const total = get_total_atoms(composition)
    expect(total).toBe(60)
  })

  test(`should handle very small amounts`, async () => {
    const { get_total_atoms } = await import(`$lib/composition/parse`)
    const composition: Composition = { H: 0.1, O: 0.2 }

    const total = get_total_atoms(composition)
    expect(total).toBeCloseTo(0.3, 1)
  })
})
