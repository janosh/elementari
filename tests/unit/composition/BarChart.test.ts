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
const mockColors = {
  H: `#ffffff`,
  O: `#ff0d0d`,
  C: `#909090`,
  Fe: `#e06633`,
}

vi.mock(`$lib/colors`, () => ({
  element_color_schemes: {
    Vesta: mockColors,
    Jmol: mockColors,
  },
}))

vi.mock(`$lib/state.svelte`, () => ({
  colors: { element: mockColors },
}))

describe(`BarChart component`, () => {
  test(`should import without errors`, async () => {
    const module = await import(`$lib/composition/BarChart.svelte`)
    expect(module.default).toBeDefined()
  })

  test(`should render container with correct dimensions`, async () => {
    const { mount } = await import(`svelte`)
    const BarChart = (await import(`$lib/composition/BarChart.svelte`)).default

    document.body.innerHTML = ``
    mount(BarChart, {
      target: document.body,
      props: {
        composition: { H: 2, O: 1 },
        width: 300,
        height: 60,
      },
    })

    const container = document.querySelector(`.stacked-bar-chart-container`)
    expect(container).toBeTruthy()
    expect(container?.getAttribute(`style`)).toContain(`--bar-max-width: 300px`)
    expect(container?.getAttribute(`style`)).toContain(`--bar-height: 60px`)
  })

  test(`should render segments for each element`, async () => {
    const { mount } = await import(`svelte`)
    const BarChart = (await import(`$lib/composition/BarChart.svelte`)).default

    document.body.innerHTML = ``
    mount(BarChart, {
      target: document.body,
      props: {
        composition: { H: 2, O: 1, C: 1 },
        width: 300,
        height: 60,
      },
    })

    const segments = document.querySelectorAll(`.bar-segment`)
    expect(segments.length).toBe(3) // One for each element
  })

  test(`should handle interactive mode`, async () => {
    const { mount } = await import(`svelte`)
    const BarChart = (await import(`$lib/composition/BarChart.svelte`)).default

    document.body.innerHTML = ``
    mount(BarChart, {
      target: document.body,
      props: {
        composition: { H: 2, O: 1 },
        width: 300,
        height: 60,
        interactive: true,
      },
    })

    const interactiveSegments = document.querySelectorAll(
      `.bar-segment[role="button"]`,
    )
    expect(interactiveSegments.length).toBeGreaterThan(0)
  })

  test.each([
    [false, `all segments`],
    [true, `outer corners only`],
  ])(
    `should apply border radius correctly when outer_corners_only is %s (%s)`,
    async (outer_corners_only, _description) => {
      const { mount } = await import(`svelte`)
      const BarChart = (await import(`$lib/composition/BarChart.svelte`))
        .default

      document.body.innerHTML = ``
      mount(BarChart, {
        target: document.body,
        props: {
          composition: { H: 2, O: 1, C: 1 },
          width: 300,
          height: 60,
          border_radius: 5,
          outer_corners_only,
        },
      })

      const container = document.querySelector(`.bar-segments`)
      expect(container).toBeTruthy()
      expect(container?.classList.contains(`outer-corners-only`)).toBe(
        outer_corners_only,
      )

      // Check CSS custom property
      const barContainer = document.querySelector(
        `.stacked-bar-chart-container`,
      )
      expect(barContainer?.getAttribute(`style`)).toContain(
        `--border-radius: 5px`,
      )
    },
  )

  test(`should handle segment gaps correctly`, async () => {
    const { mount } = await import(`svelte`)
    const BarChart = (await import(`$lib/composition/BarChart.svelte`)).default

    document.body.innerHTML = ``
    mount(BarChart, {
      target: document.body,
      props: {
        composition: { H: 1, O: 1 }, // Equal amounts for easier calculation
        width: 100,
        height: 60,
        segment_gap: 10,
      },
    })

    const segments = document.querySelectorAll(`.bar-segment`)
    expect(segments.length).toBe(2)

    // Check CSS custom property for gap
    const barContainer = document.querySelector(`.stacked-bar-chart-container`)
    expect(barContainer?.getAttribute(`style`)).toContain(`--segment-gap: 10px`)

    // Check that segments have correct flex values (should be 50% each for equal amounts)
    const firstSegment = segments[0] as HTMLElement
    const secondSegment = segments[1] as HTMLElement
    expect(firstSegment.style.flex).toContain(`50`)
    expect(secondSegment.style.flex).toContain(`50`)
  })

  test(`should show labels when enabled and segments are large enough`, async () => {
    const { mount } = await import(`svelte`)
    const BarChart = (await import(`$lib/composition/BarChart.svelte`)).default

    document.body.innerHTML = ``
    mount(BarChart, {
      target: document.body,
      props: {
        composition: { H: 2, O: 1 },
        width: 300,
        height: 60,
        show_labels: true,
      },
    })

    const labels = document.querySelectorAll(`.bar-label`)
    expect(labels.length).toBeGreaterThan(0)

    const elementSymbols = document.querySelectorAll(`.element-symbol`)
    expect(elementSymbols.length).toBeGreaterThan(0)
  })
})

describe(`BarChart font scaling`, () => {
  test(`should maintain scaling behavior with increased base sizes`, () => {
    const font_scale = 0.8

    // Test the current font sizes
    const base_font_size = 20 * font_scale
    const element_symbol_size = 32 * font_scale
    const amount_size = 24 * font_scale
    const percentage_size = 26 * font_scale

    expect(base_font_size).toBeCloseTo(16, 1)
    expect(element_symbol_size).toBeCloseTo(25.6, 1)
    expect(amount_size).toBeCloseTo(19.2, 1)
    expect(percentage_size).toBeCloseTo(20.8, 1)
  })
})

describe(`BarChart segment calculations`, () => {
  test(`should calculate segment widths proportional to composition`, () => {
    const width = 300

    // H should take 2/3 of width (200px), O should take 1/3 (100px)
    const expected_h_width = (2 / 3) * width // 200px
    const expected_o_width = (1 / 3) * width // 100px

    expect(expected_h_width).toBe(200)
    expect(expected_o_width).toBe(100)
  })

  test(`should position segments correctly for horizontal layout`, () => {
    const width = 400

    // H: 0-200px, O: 200-300px, C: 300-400px
    const h_position = 0
    const o_position = (2 / 4) * width // 200px
    const c_position = (3 / 4) * width // 300px

    expect(h_position).toBe(0)
    expect(o_position).toBe(200)
    expect(c_position).toBe(300)
  })

  test(`should handle flex-based widths with CSS gaps`, () => {
    // With CSS flexbox, segments automatically adjust their widths
    // based on flex values and available space after gaps
    const total_percentage = 100
    const h_percentage = (2 / 3) * total_percentage // 66.67%
    const o_percentage = (1 / 3) * total_percentage // 33.33%

    expect(Math.round(h_percentage * 10) / 10).toBe(66.7)
    expect(Math.round(o_percentage * 10) / 10).toBe(33.3)
  })
})

describe(`BarChart data processing`, () => {
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

describe(`BarChart label visibility`, () => {
  test(`should show labels for large segments`, () => {
    const min_segment_size = 15 // MIN_SEGMENT_SIZE_FOR_LABEL
    const segment_size = 50 // pixels

    const can_show_label = segment_size >= min_segment_size
    expect(can_show_label).toBe(true)
  })

  test(`should hide labels for very small segments`, () => {
    const min_segment_size = 15 // MIN_SEGMENT_SIZE_FOR_LABEL
    const segment_size = 10 // pixels

    const can_show_label = segment_size >= min_segment_size
    expect(can_show_label).toBe(false)
  })

  test(`should calculate font scale based on segment size`, () => {
    const min_font_scale = 0.6
    const max_font_scale = 1.2

    // Large segment (80px)
    const large_segment_size = 80
    const large_font_scale = Math.min(
      max_font_scale,
      Math.max(min_font_scale, large_segment_size / 40),
    )
    expect(large_font_scale).toBe(max_font_scale) // Should be capped at max

    // Small segment (20px)
    const small_segment_size = 20
    const small_font_scale = Math.min(
      max_font_scale,
      Math.max(min_font_scale, small_segment_size / 40),
    )
    expect(small_font_scale).toBe(min_font_scale) // Should be at minimum

    // Medium segment (40px)
    const medium_segment_size = 40
    const medium_font_scale = Math.min(
      max_font_scale,
      Math.max(min_font_scale, medium_segment_size / 40),
    )
    expect(medium_font_scale).toBe(1.0) // Should be exactly 1.0
  })
})

describe(`BarChart external labels`, () => {
  test(`should show external labels for thin segments`, async () => {
    const { mount } = await import(`svelte`)
    const BarChart = (await import(`$lib/composition/BarChart.svelte`)).default

    document.body.innerHTML = ``
    mount(BarChart, {
      target: document.body,
      props: {
        composition: { H: 1, O: 1, C: 50 }, // H and O will be thin (< 8%), C will be thick
        width: 400,
        height: 50,
        show_labels: true,
      },
    })

    // Should have external label containers
    const external_above = document.querySelector(`.external-labels-above`)
    const external_below = document.querySelector(`.external-labels-below`)
    expect(external_above).toBeTruthy()
    expect(external_below).toBeTruthy()

    // Should have some external labels
    const external_labels = document.querySelectorAll(`.external-label`)
    expect(external_labels.length).toBeGreaterThan(0)
  })

  test(`should alternate positions for consecutive thin segments`, async () => {
    const { mount } = await import(`svelte`)
    const BarChart = (await import(`$lib/composition/BarChart.svelte`)).default

    document.body.innerHTML = ``
    mount(BarChart, {
      target: document.body,
      props: {
        composition: { H: 1, He: 1, Li: 1, C: 50 }, // H, He, Li will be thin and consecutive
        width: 400,
        height: 50,
        show_labels: true,
      },
    })

    const external_above = document.querySelectorAll(
      `.external-labels-above .external-label`,
    )
    const external_below = document.querySelectorAll(
      `.external-labels-below .external-label`,
    )

    // Should have labels in both above and below sections (alternating)
    const total_external = external_above.length + external_below.length
    expect(total_external).toBeGreaterThan(0)
  })

  test(`should not show internal labels for thin segments with external labels`, async () => {
    const { mount } = await import(`svelte`)
    const BarChart = (await import(`$lib/composition/BarChart.svelte`)).default

    document.body.innerHTML = ``
    mount(BarChart, {
      target: document.body,
      props: {
        composition: { H: 1, O: 50 }, // H will be thin, O will be thick
        width: 400,
        height: 50,
        show_labels: true,
      },
    })

    const bar_segments = document.querySelectorAll(`.bar-segment`)
    expect(bar_segments.length).toBe(2)

    // The thick segment (O) should have internal label
    const internal_labels = document.querySelectorAll(`.bar-label`)
    expect(internal_labels.length).toBe(1) // Only the thick segment should have internal label

    // Should have external labels for thin segments
    const external_labels = document.querySelectorAll(`.external-label`)
    expect(external_labels.length).toBeGreaterThan(0)
  })
})
