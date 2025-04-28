import { ColorBar } from '$lib'
import * as d3_sc from 'd3-scale-chromatic'
import { mount } from 'svelte'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { doc_query } from '.'

const valid_color_scale_keys = Object.keys(d3_sc)
  .map((key) => key.split(`interpolate`)[1])
  .filter(Boolean)
  .join(`, `)

afterEach(() => {
  document.body.innerHTML = `` // Clean up DOM after each test
})

describe(`ColorBar Horizontal (Default)`, () => {
  test(`renders text, color scale, tick labels, and styles`, () => {
    mount(ColorBar, {
      target: document.body,
      props: {
        title: `Test Horizontal`,
        color_scale: `Viridis`,
        tick_labels: 5, // D3 nice().ticks(5) for [0, 100] -> [0, 20, 40, 60, 80, 100]
        range: [0, 100],
        title_side: `left`,
        tick_side: `primary`, // primary = bottom for horizontal
        style: `width: 200px; height: 20px;`,
        title_style: `font-weight: bold;`,
        wrapper_style: `margin: 10px;`,
      },
    })

    const title_span = doc_query(`.colorbar > span.label`) as HTMLElement
    expect(title_span.textContent).toBe(`Test Horizontal`)
    expect(title_span.getAttribute(`style`)).toContain(`font-weight: bold;`)
    expect(title_span.getAttribute(`style`)).not.toContain(`transform: rotate`) // No rotation

    const cbar_div = doc_query(`.colorbar > div.bar`)
    expect(cbar_div.style.width).toBe(`200px`)
    expect(cbar_div.style.height).toBe(`20px`)

    const tick_label_spans = document.querySelectorAll(
      `.colorbar > div.bar > span.tick-label`,
    )
    expect(tick_label_spans.length).toBe(6)
    const first_tick = tick_label_spans[0] as HTMLElement
    expect(first_tick.style.left).toBe(`0%`)
    expect(first_tick.style.top).toBe(`100%`) // Placed below the bar
    expect(first_tick.style.transform).toBe(`translateX(-50%)`)

    const wrapper = doc_query(`.colorbar`)
    expect(wrapper.style.margin).toBe(`10px`)
    expect(wrapper.style.flexDirection).toBe(`row`) // title_side: left
  })

  test(`handles invalid color_scale input`, () => {
    const spy = vi.spyOn(console, `error`)

    const color_scale = `test invalid`
    mount(ColorBar, { target: document.body, props: { color_scale } })

    expect(spy).toHaveBeenCalledWith(
      `Color scale '${color_scale}' not found, supported color scale ` +
        `names are ${valid_color_scale_keys}. Falling back on 'Viridis'.`,
    )
    spy.mockRestore()
  })
})

describe(`ColorBar Vertical`, () => {
  test(`renders correctly with default vertical props`, () => {
    mount(ColorBar, {
      target: document.body,
      props: {
        title: `Test Vertical Default`,
        orientation: `vertical`,
        range: [0, 10],
        tick_labels: 5, // D3 nice().ticks(5) for [0, 10] -> [0, 2, 4, 6, 8, 10]
      },
    })

    const wrapper_vert_def = doc_query(`.colorbar`)
    expect(wrapper_vert_def.style.flexDirection).toBe(`row`)

    const title_span_vert_def = doc_query(`.colorbar > span.label`)
    expect(title_span_vert_def.textContent).toBe(`Test Vertical Default`)
    expect(title_span_vert_def.getAttribute(`style`)).toContain(
      `transform: rotate(-90deg) translate(50%); transform-origin: right bottom;`,
    )

    const cbar_div = doc_query(`.colorbar > div.bar`)
    const computed_style = window.getComputedStyle(cbar_div)
    expect(computed_style.width).toBe(`14px`) // Check computed value of --cbar-thickness
    expect(computed_style.height).not.toBe(`14px`)

    const tick_label_spans = document.querySelectorAll(
      `.colorbar > div.bar > span.tick-label`,
    )
    expect(tick_label_spans.length).toBe(6)

    const first_tick = tick_label_spans[0] as HTMLElement
    expect(first_tick.style.top).toBe(`0%`)
    expect(first_tick.style.left).toBe(`100%`) // Placed right of the bar (primary)
    expect(first_tick.style.transform).toBe(`translateY(-50%)`)

    const last_tick = tick_label_spans[5] as HTMLElement
    expect(last_tick.style.top).toBe(`100%`)
  })

  test(`renders correctly with explicit vertical props (label top, ticks left)`, () => {
    mount(ColorBar, {
      target: document.body,
      props: {
        title: `Test Vertical Explicit`,
        orientation: `vertical`,
        range: [-50, 50],
        tick_labels: 4, // D3 nice().ticks(4) for [-50, 50] -> [-60, -40, -20, 0, 20, 40, 60]
        title_side: `top`,
        tick_side: `secondary`, // secondary = left for vertical
        style: `width: 20px; height: 300px;`,
        wrapper_style: `height: 350px;`,
      },
    })

    const wrapper_vert_exp = doc_query(`.colorbar`)
    expect(wrapper_vert_exp.style.flexDirection).toBe(`column`)
    expect(wrapper_vert_exp.style.height).toBe(`350px`)

    const title_span_vert_exp = doc_query(
      `.colorbar > span.label`,
    ) as HTMLElement
    expect(title_span_vert_exp.textContent).toBe(`Test Vertical Explicit`)

    const cbar_div = doc_query(`.colorbar > div.bar`)
    expect(cbar_div.style.width).toBe(`20px`)
    expect(cbar_div.style.height).toBe(`300px`)

    const tick_label_spans = document.querySelectorAll(
      `.colorbar > div.bar > span.tick-label`,
    )
    expect(tick_label_spans.length).toBe(7)

    const middle_tick = tick_label_spans[3] as HTMLElement // Tick '0'
    expect(middle_tick.textContent).toBe(`0`)
    expect(middle_tick.style.top).toBe(`50%`)
    expect(middle_tick.style.transform).toBe(`translateY(-50%)`)
  })
})

describe(`ColorBar tick_side='inside'`, () => {
  test(`Horizontal: hides first/last ticks, centers others, min 3 visible`, () => {
    mount(ColorBar, {
      target: document.body,
      props: {
        orientation: `horizontal`,
        tick_side: `inside`,
        range: [0, 100],
        tick_labels: 3, // Request 3 -> gen 5 -> d3 gives 6 ([0, 20,.., 100]) -> slice -> 4 visible
        style: `height: 30px;`,
      },
    })

    const tick_label_spans = document.querySelectorAll(
      `.colorbar > div.bar > span.tick-label`,
    )
    expect(tick_label_spans.length).toBe(4)

    const first_visible_tick = tick_label_spans[0] as HTMLElement
    expect(first_visible_tick.textContent).toBe(`20`)
    expect(first_visible_tick.style.left).toBe(`20%`)
    expect(first_visible_tick.style.top).toBe(`50%`) // Centered vertically
    expect(first_visible_tick.style.transform).toBe(`translate(-50%, -50%)`)

    const last_visible_tick = tick_label_spans[3] as HTMLElement
    expect(last_visible_tick.textContent).toBe(`80`)
    expect(last_visible_tick.style.left).toBe(`80%`)
    expect(last_visible_tick.style.top).toBe(`50%`)
  })

  test(`Vertical: hides first/last ticks, centers others`, () => {
    mount(ColorBar, {
      target: document.body,
      props: {
        orientation: `vertical`,
        tick_side: `inside`,
        range: [10, 90],
        tick_labels: 6, // Request 6 -> gen 6 -> d3 gives 9 ([10, 20,.., 90]) -> slice -> 7 visible
        style: `width: 30px;`,
      },
    })

    const tick_label_spans = document.querySelectorAll(
      `.colorbar > div.bar > span.tick-label`,
    )
    expect(tick_label_spans.length).toBe(7)

    const first_visible_tick = tick_label_spans[0] as HTMLElement
    expect(first_visible_tick.textContent).toBe(`20`)
    expect(first_visible_tick.style.top).toBe(`12.5%`)
    expect(first_visible_tick.style.left).toBe(`50%`) // Centered horizontally
    expect(first_visible_tick.style.transform).toBe(`translate(-50%, -50%)`)

    const last_visible_tick = tick_label_spans[6] as HTMLElement
    expect(last_visible_tick.textContent).toBe(`80`)
    expect(last_visible_tick.style.top).toBe(`87.5%`)
    expect(last_visible_tick.style.left).toBe(`50%`)
  })
})

describe(`ColorBar title_side Default Logic`, () => {
  test.each([
    // [orientation, tick_side, expected_flex_dir]
    [`horizontal`, `primary`, `column`],
    [`horizontal`, `secondary`, `column-reverse`],
    [`vertical`, `primary`, `row`],
    [`vertical`, `secondary`, `row-reverse`],
    [`horizontal`, `inside`, `row`],
    [`vertical`, `inside`, `row`],
  ] as const)(
    `orientation=%s, tick_side=%s -> defaults title flex-direction to %s`,
    (orientation, tick_side, expected_flex_dir) => {
      mount(ColorBar, {
        target: document.body,
        props: { title: `Test Default Title`, orientation, tick_side },
      })
      const wrapper = doc_query(`.colorbar`)
      expect(wrapper.style.flexDirection).toBe(expected_flex_dir)

      // Title span should exist
      const title_span = doc_query(`.colorbar > span.label`) as HTMLElement
      expect(title_span).toBeDefined()
      expect(title_span.textContent).toBe(`Test Default Title`)
      // Title span should not have overlap margin when using defaults
      expect(title_span.getAttribute(`style`)).not.toContain(`margin`)
    },
  )
})

describe(`ColorBar Date/Time Formatting`, () => {
  test(`formats ticks correctly using tick_format`, () => {
    const date_range: [number, number] = [
      new Date(2024, 0, 1).getTime(), // Jan 1, 2024
      new Date(2024, 11, 31).getTime(), // Dec 31, 2024
    ]

    mount(ColorBar, {
      target: document.body,
      props: {
        range: date_range,
        tick_format: `%Y-%m-%d`, // YYYY-MM-DD format
        tick_labels: 3, // Request 3 ticks
        snap_ticks: false, // Use exact range for predictability
      },
    })

    const tick_label_spans = document.querySelectorAll(
      `.colorbar > div.bar > span.tick-label`,
    )
    expect(tick_label_spans.length).toBe(3)
    expect(tick_label_spans[0].textContent).toBe(`2024-01-01`) // Start date
    expect(tick_label_spans[1].textContent).toBe(`2024-07-01`) // Mid-point (approx)
    expect(tick_label_spans[2].textContent).toBe(`2024-12-31`) // End date
  })

  test(`formats ticks with different format string`, () => {
    const date_range: [number, number] = [
      new Date(2024, 0, 1, 0, 0, 0).getTime(), // Start of day
      new Date(2024, 0, 1, 23, 59, 59).getTime(), // End of day
    ]

    mount(ColorBar, {
      target: document.body,
      props: {
        range: date_range,
        tick_format: `%H:%M`, // HH:MM format
        tick_labels: 5, // Request 5 ticks
        snap_ticks: false,
      },
    })

    const tick_label_spans_date_fmt = document.querySelectorAll(
      `.colorbar > div.bar > span.tick-label`,
    )
    expect(tick_label_spans_date_fmt.length).toBe(5)
    expect(tick_label_spans_date_fmt[0].textContent).toBe(`00:00`)
    expect([`11:59`, `12:00`]).toContain(
      tick_label_spans_date_fmt[2].textContent,
    )
    expect(tick_label_spans_date_fmt[4].textContent).toBe(`23:59`) // Near end of day
  })
})

describe(`ColorBar Numeric Formatting`, () => {
  test(`formats ticks correctly using numeric d3-format (e.g., '.1f')`, () => {
    mount(ColorBar, {
      target: document.body,
      props: {
        range: [0, 10],
        tick_format: `.1f`, // Format to one decimal place
        tick_labels: 6, // Request 6 ticks (0, 2, 4, 6, 8, 10)
        snap_ticks: true, // Use nice range
      },
    })

    const tick_label_spans = document.querySelectorAll(
      `.colorbar > div.bar > span.tick-label`,
    )
    expect(tick_label_spans.length).toBe(6)
    expect(tick_label_spans[0].textContent).toBe(`0.0`)
    expect(tick_label_spans[1].textContent).toBe(`2.0`)
    expect(tick_label_spans[2].textContent).toBe(`4.0`)
    expect(tick_label_spans[3].textContent).toBe(`6.0`)
    expect(tick_label_spans[4].textContent).toBe(`8.0`)
    expect(tick_label_spans[5].textContent).toBe(`10.0`)
  })

  test(`formats ticks with percentage format ('p')`, () => {
    mount(ColorBar, {
      target: document.body,
      props: {
        range: [0, 1],
        tick_format: `.0%`, // Format as percentage with no decimals
        tick_labels: 5, // Request 5 ticks (0, 0.25, 0.5, 0.75, 1)
        snap_ticks: false, // Use exact range
      },
    })

    const tick_label_spans = document.querySelectorAll(
      `.colorbar > div.bar > span.tick-label`,
    )
    expect(tick_label_spans.length).toBe(5)
    expect(tick_label_spans[0].textContent).toBe(`0%`)
    expect(tick_label_spans[1].textContent).toBe(`25%`)
    expect(tick_label_spans[2].textContent).toBe(`50%`)
    expect(tick_label_spans[3].textContent).toBe(`75%`)
    expect(tick_label_spans[4].textContent).toBe(`100%`)
  })

  test(`falls back to pretty_num when tick_format is undefined`, () => {
    mount(ColorBar, {
      target: document.body,
      props: {
        range: [0.1234, 5.6789],
        tick_format: undefined, // Explicitly undefined
        tick_labels: 3,
        snap_ticks: false,
      },
    })

    const tick_label_spans = document.querySelectorAll(
      `.colorbar > div.bar > span.tick-label`,
    )
    expect(tick_label_spans.length).toBe(3)
    // Check pretty_num's formatting
    expect(tick_label_spans[0].textContent).toBe(`0.123`)
    expect(tick_label_spans[1].textContent).toBe(`2.9`)
    expect(tick_label_spans[2].textContent).toBe(`5.68`)
  })

  test(`falls back to pretty_num when tick_format is null`, () => {
    // Test with null (should behave same as undefined)
    mount(ColorBar, {
      target: document.body,
      props: {
        range: [1000, 5000],
        tick_format: undefined, // Use undefined as null is not assignable
        tick_labels: 2,
        snap_ticks: false,
      },
    })
    const tick_label_spans = document.querySelectorAll(
      `.colorbar > div.bar > span.tick-label`,
    )
    expect(tick_label_spans.length).toBe(2) // Should be 2 ticks
    expect(tick_label_spans[0].textContent).toBe(`1k`) // Assuming pretty_num uses 'k' suffix
    expect(tick_label_spans[1].textContent).toBe(`5k`)
  })
})

describe(`ColorBar Other Features`, () => {
  test(`uses explicit tick_labels array`, () => {
    const explicit_ticks = [10, 25, 50, 75, 90]
    mount(ColorBar, {
      target: document.body,
      props: {
        range: [0, 100],
        tick_labels: explicit_ticks,
        snap_ticks: true, // snap_ticks should be ignored when array is passed
      },
    })

    const tick_label_spans = document.querySelectorAll(
      `.colorbar > div.bar > span.tick-label`,
    )
    expect(tick_label_spans.length).toBe(explicit_ticks.length)
    explicit_ticks.forEach((tick, idx) => {
      expect(tick_label_spans[idx].textContent).toBe(tick.toString())
    })
  })

  test(`snap_ticks=false generates exact number of ticks`, () => {
    mount(ColorBar, {
      target: document.body,
      props: { range: [0, 99], tick_labels: 4, snap_ticks: false },
    })

    const tick_label_spans = document.querySelectorAll(
      `.colorbar > div.bar > span.tick-label`,
    )
    expect(tick_label_spans.length).toBe(4)
    expect(tick_label_spans[0].textContent).toBe(`0`)
    expect(tick_label_spans[1].textContent).toBe(`33`)
    expect(tick_label_spans[2].textContent).toBe(`66`)
    expect(tick_label_spans[3].textContent).toBe(`99`)
  })

  test(`does NOT apply label overlap margin when ticks and title are on opposite sides`, () => {
    mount(ColorBar, {
      target: document.body,
      props: {
        title: `No Overlap Test`,
        orientation: `horizontal`,
        title_side: `top`,
        tick_side: `primary`,
        tick_labels: 3,
      },
    })

    const title_span_no_overlap = doc_query(`.colorbar > span.label`)
    expect(title_span_no_overlap.getAttribute(`style`)).not.toContain(`margin`)
  })

  test(`accepts a function for color_scale`, () => {
    const custom_scale = vi.fn((t: number): string => `rgb(${t * 255}, 0, 0)`) // Mock scale
    mount(ColorBar, {
      target: document.body,
      props: { color_scale: custom_scale, range: [0, 1] }, // Use default steps=50
    })

    // Verify the mock function was called (steps times)
    expect(custom_scale).toHaveBeenCalled()
    expect(custom_scale).toHaveBeenCalledTimes(50) // Default steps is 50

    // Optional: Check if the first call was with the expected value (approx 0)
    expect(custom_scale).toHaveBeenNthCalledWith(1, expect.closeTo(0))
    // Optional: Check if the last call was with the expected value (approx 1)
    expect(custom_scale).toHaveBeenNthCalledWith(50, expect.closeTo(1))
  })
})
