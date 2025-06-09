import { mount } from 'svelte'
import { beforeEach, describe, expect, test, vi } from 'vitest'

// Mock the composition parsing utilities
vi.mock(`$lib/composition/parse`, () => ({
  parse_composition_input: vi.fn((input: string | Record<string, number>) => {
    if (typeof input === `string`) {
      if (input === `H2O`) return { H: 2, O: 1 }
      if (input === `invalid`) return {}
      return {}
    }
    return input
  }),
  get_total_atoms: vi.fn((comp: Record<string, number>) =>
    Object.values(comp).reduce(
      (sum: number, val: number) => sum + (val || 0),
      0,
    ),
  ),
  composition_to_percentages: vi.fn((comp: Record<string, number>) => {
    const total = Object.values(comp).reduce(
      (sum: number, val: number) => sum + (val || 0),
      0,
    )
    const percentages: Record<string, number> = {}
    for (const [element, amount] of Object.entries(comp)) {
      if (typeof amount === `number`) {
        percentages[element] = (amount / total) * 100
      }
    }
    return percentages
  }),
}))

vi.mock(`$lib/colors`, () => ({
  element_color_schemes: {
    Vesta: { H: `#ffffff`, O: `#ff0d0d`, Fe: `#e06633` },
    Jmol: { H: `#ffffff`, O: `#ff0d0d`, Fe: `#e06633` },
  },
  default_element_colors: { H: `#ffffff`, O: `#ff0d0d`, Fe: `#e06633` },
  default_category_colors: { metal: `#ff0000`, nonmetal: `#00ff00` },
}))

function doc_query<T extends Element = Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Element with selector "${selector}" not found`)
  return element
}

describe(`Composition component`, () => {
  beforeEach(() => {
    document.body.innerHTML = ``
  })

  test(`should render with basic props`, () => {
    mount(Composition, {
      target: document.body,
      props: {
        input: `H2O`,
      },
    })

    expect(doc_query(`.composition-container`)).toBeTruthy()
  })

  test.each([
    [`pie`, `.pie-chart`],
    [`bubble`, `.bubble-chart`],
    [`bar`, `.stacked-bar-chart-container`],
  ] as const)(
    `should render %s mode with correct element`,
    (mode, selector) => {
      mount(Composition, {
        target: document.body,
        props: {
          input: `H2O`,
          mode,
        },
      })

      expect(doc_query(selector)).toBeTruthy()
    },
  )

  test(`should forward props to child components`, () => {
    mount(Composition, {
      target: document.body,
      props: {
        input: `H2O`,
        size: 200,
        color_scheme: `Jmol`,
        interactive: false,
      },
    })

    const pie_chart = doc_query(`.pie-chart`)
    expect(pie_chart.getAttribute(`viewBox`)).toBe(`0 0 200 200`)
  })

  test(`should handle composition change callback`, async () => {
    const on_composition_change = vi.fn()

    mount(Composition, {
      target: document.body,
      props: {
        input: `H2O`,
        on_composition_change,
      },
    })

    // Wait for the effect to run
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Should call the callback with parsed composition
    expect(on_composition_change).toHaveBeenCalledWith({ H: 2, O: 1 })
  })

  test(`should handle empty/invalid input gracefully`, () => {
    mount(Composition, {
      target: document.body,
      props: {
        input: `invalid`,
      },
    })

    expect(doc_query(`.composition-container`)).toBeTruthy()
    // Should still render without errors
  })

  test(`should apply custom styling`, () => {
    const custom_style = `background-color: red;`
    const custom_class = `my-custom-class`

    mount(Composition, {
      target: document.body,
      props: {
        input: `H2O`,
        style: custom_style,
        class: custom_class,
      },
    })

    const container = doc_query(`.composition-container`)
    expect(container.getAttribute(`style`)).toBe(custom_style)
    expect(container.classList.contains(custom_class)).toBe(true)
  })

  test(`should handle numeric input correctly`, () => {
    mount(Composition, {
      target: document.body,
      props: {
        input: { 1: 2, 8: 1 } as Record<number, number>, // Atomic numbers
      },
    })

    expect(doc_query(`.composition-container`)).toBeTruthy()
    // Should handle atomic number input without errors
  })

  test(`should render bar mode with custom dimensions`, () => {
    mount(Composition, {
      target: document.body,
      props: {
        input: `H2O`,
        mode: `bar`,
        width: 400,
        height: 80,
      },
    })

    const container = doc_query(`.stacked-bar-chart-container`)
    expect(container.getAttribute(`style`)).toContain(`--bar-max-width: 400px`)
    expect(container.getAttribute(`style`)).toContain(`--bar-height: 80px`)
  })

  test(`should pass bar-specific props correctly`, () => {
    mount(Composition, {
      target: document.body,
      props: {
        input: `H2O`,
        mode: `bar`,
        width: 300,
        height: 100,
        show_percentages: true,
      },
    })

    expect(doc_query(`.stacked-bar-chart-container`)).toBeTruthy()
    // Should render without errors with bar-specific props
  })
})
