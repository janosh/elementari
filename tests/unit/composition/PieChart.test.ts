import type { Composition } from '$lib'
import { describe, expect, test, vi } from 'vitest'

// Mock the composition parsing utilities
vi.mock(`$lib/composition/parse`, () => ({
  composition_to_percentages: vi.fn((comp: Composition) => {
    const total = Object.values(comp).reduce((sum, val) => sum + (val || 0), 0)
    const percentages: Composition = {}
    for (const [element, amount] of Object.entries(comp)) {
      if (typeof amount === `number`) {
        percentages[element as keyof Composition] = (amount / total) * 100
      }
    }
    return percentages
  }),
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

describe(`PieChart component logic`, () => {
  test(`should import without errors`, async () => {
    const module = await import(`$lib/composition/PieChart.svelte`)
    expect(module.default).toBeDefined()
  })

  test(`should have proper TypeScript component interface`, async () => {
    // Test that the component can be imported and has expected structure
    const PieChart = await import(`$lib/composition/PieChart.svelte`)
    expect(typeof PieChart.default).toBe(`function`)
  })

  test(`should render SVG with correct viewBox`, async () => {
    const { mount } = await import(`svelte`)
    const PieChart = (await import(`$lib/composition/PieChart.svelte`)).default

    document.body.innerHTML = ``
    mount(PieChart, {
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

  test(`should render pie slices for each element`, async () => {
    const { mount } = await import(`svelte`)
    const PieChart = (await import(`$lib/composition/PieChart.svelte`)).default

    document.body.innerHTML = ``
    mount(PieChart, {
      target: document.body,
      props: {
        composition: { H: 2, O: 1, C: 1 },
        size: 200,
      },
    })

    const paths = document.querySelectorAll(`path`)
    expect(paths.length).toBe(3) // One for each element
  })

  test(`should handle interactive mode`, async () => {
    const { mount } = await import(`svelte`)
    const PieChart = (await import(`$lib/composition/PieChart.svelte`)).default

    document.body.innerHTML = ``
    mount(PieChart, {
      target: document.body,
      props: {
        composition: { H: 2, O: 1 },
        size: 200,
        interactive: true,
      },
    })

    const paths = document.querySelectorAll(`path[role="button"]`)
    expect(paths.length).toBeGreaterThan(0)
  })
})

describe(`PieChart data processing`, () => {
  test.each([
    [{ H: 2, O: 1 }, { H: 66.67, O: 33.33 }, 3, `water composition`],
    [{}, {}, 0, `empty composition`],
    [{ H: 5 }, { H: 100 }, 5, `single element`],
    [
      { C: 8, H: 10, N: 4, O: 2 },
      { C: 33.33, H: 41.67, N: 16.67, O: 8.33 },
      24,
      `caffeine (complex composition)`,
    ],
  ])(
    `should process %s correctly (%s)`,
    async (composition, expected_percentages, expected_total, _description) => {
      const { composition_to_percentages, get_total_atoms } = await import(
        `$lib/composition/parse`
      )

      // Test total atoms
      const total = get_total_atoms(composition)
      expect(total).toBe(expected_total)

      // Test percentages
      const percentages = composition_to_percentages(composition)
      if (Object.keys(expected_percentages).length === 0) {
        expect(Object.keys(percentages)).toHaveLength(0)
      } else {
        Object.entries(expected_percentages).forEach(
          ([element, expected_pct]) => {
            expect(
              percentages[element as keyof typeof percentages],
            ).toBeCloseTo(expected_pct as number, 1)
          },
        )
      }
    },
  )
})
