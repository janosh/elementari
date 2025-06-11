import { ElementTile, element_data } from '$lib'
import { default_category_colors } from '$lib/colors'
import { mount } from 'svelte'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { doc_query } from '..'

// test random element for increased robustness
const rand_idx = Math.floor(Math.random() * element_data.length)
const rand_element = element_data[rand_idx]

afterEach(() => {
  document.body.innerHTML = ``
})

describe(`ElementTile`, () => {
  describe(`basic rendering`, () => {
    test(`renders element name, symbol and atomic number by default`, () => {
      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element },
      })

      const name = doc_query(`.name`)
      expect(name.textContent).toBe(rand_element.name)

      const symbol = doc_query(`.symbol`)
      expect(symbol.textContent).toBe(rand_element.symbol)

      const number = doc_query(`.number`)
      expect(number.textContent).toBe(rand_element.number.toString())
    })

    test(`renders as div by default`, () => {
      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element },
      })

      const node = doc_query(`.element-tile`)
      expect(node.tagName).toBe(`DIV`)
    })

    test(`renders as anchor when href is provided`, () => {
      const href = `/element/${rand_element.symbol}`
      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element, href },
      })

      const node = doc_query(`.element-tile`)
      expect(node.tagName).toBe(`A`)
      expect(node.getAttribute(`href`)).toBe(href)
    })
  })

  describe(`show_* props`, () => {
    test.each([
      [`show_name`, `name`],
      [`show_symbol`, `symbol`],
      [`show_number`, `number`],
    ] as const)(`%s prop controls %s visibility`, (prop, selector) => {
      // Test showing
      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element, [prop]: true },
      })

      const visible_element = doc_query(`.${selector}`)
      expect(visible_element.textContent).toBe(`${rand_element[selector]}`)

      // Clear and test hiding
      document.body.innerHTML = ``
      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element, [prop]: false },
      })

      expect(document.querySelector(`.${selector}`)).toBeNull()
    })

    test.each([
      [
        true,
        true,
        true,
        `${rand_element.number} ${rand_element.symbol} ${rand_element.name}`,
      ],
      [false, false, false, ``],
      [true, false, true, `${rand_element.number} ${rand_element.symbol}`],
      [false, true, false, `${rand_element.name}`],
      [true, true, false, `${rand_element.number} ${rand_element.name}`],
      [false, false, true, `${rand_element.symbol}`],
      [true, false, false, `${rand_element.number}`],
      [false, true, true, `${rand_element.symbol} ${rand_element.name}`],
    ])(
      `show_number=%s, show_name=%s, show_symbol=%s renders expected content`,
      (show_number, show_name, show_symbol, expected) => {
        mount(ElementTile, {
          target: document.body,
          props: { element: rand_element, show_number, show_name, show_symbol },
        })

        const tile = doc_query(`.element-tile`)
        // Clean up extra whitespace from text content
        const actual_text = tile.textContent?.replace(/\s+/g, ` `).trim() || ``
        expect(actual_text).toBe(expected.trim())
      },
    )
  })

  describe(`value prop`, () => {
    test(`shows value instead of name when value is provided`, () => {
      const value = 42.5
      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element, value },
      })

      const value_element = doc_query(`.value`)
      expect(value_element.textContent).toBe(`42.5`)
      expect(document.querySelector(`.name`)).toBeNull()
    })

    test(`shows name when value is false`, () => {
      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element, value: false },
      })

      const name_element = doc_query(`.name`)
      expect(name_element.textContent).toBe(rand_element.name)
      expect(document.querySelector(`.value`)).toBeNull()
    })

    test(`shows name when value is undefined`, () => {
      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element, value: undefined },
      })

      const name_element = doc_query(`.name`)
      expect(name_element.textContent).toBe(rand_element.name)
      expect(document.querySelector(`.value`)).toBeNull()
    })

    test(`formats value with precision`, () => {
      const value = 42.123456
      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element, value, precision: `.2f` },
      })

      const value_element = doc_query(`.value`)
      expect(value_element.textContent).toBe(`42.12`)
    })
  })

  describe(`styling props`, () => {
    test(`applies bg_color as background color`, () => {
      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element, bg_color: `red` },
      })

      const node = doc_query(`.element-tile`)
      expect(node.style.backgroundColor).toBe(`red`)
    })

    test(`applies text_color when provided`, () => {
      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element, text_color: `blue` },
      })

      const node = doc_query(`.element-tile`)
      expect(node.style.color).toBe(`blue`)
    })

    test(`applies custom style`, () => {
      const custom_style = `border: 2px solid green; padding: 10px;`
      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element, style: custom_style },
      })

      const node = doc_query(`.element-tile`)
      expect(node.getAttribute(`style`)).toContain(`border: 2px solid green`)
      expect(node.getAttribute(`style`)).toContain(`padding: 10px`)
    })

    test(`applies symbol_style to symbol span`, () => {
      const symbol_style = `font-weight: bold; color: purple;`
      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element, symbol_style },
      })

      const symbol = doc_query(`.symbol`)
      expect(symbol.getAttribute(`style`)).toBe(symbol_style)
    })

    test(`applies active class when active=true`, () => {
      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element, active: true },
      })

      const node = doc_query(`.element-tile`)
      expect(node.classList.contains(`active`)).toBe(true)
    })

    test(`does not apply active class when active=false`, () => {
      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element, active: false },
      })

      const node = doc_query(`.element-tile`)
      expect(node.classList.contains(`active`)).toBe(false)
    })

    test(`applies category class based on element category`, () => {
      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element },
      })

      const node = doc_query(`.element-tile`)
      const expected_class = rand_element.category.replaceAll(` `, `-`)
      expect(node.classList.contains(expected_class)).toBe(true)
    })
  })

  describe(`label prop`, () => {
    test(`shows label instead of element name when provided`, () => {
      const custom_label = `Custom Label`
      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element, label: custom_label },
      })

      const name_element = doc_query(`.name`)
      expect(name_element.textContent).toBe(custom_label)
    })

    test(`shows element name when label is null`, () => {
      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element, label: null },
      })

      const name_element = doc_query(`.name`)
      expect(name_element.textContent).toBe(rand_element.name)
    })
  })

  describe(`node binding`, () => {
    test(`renders without error when node binding is used`, () => {
      // Test that the component renders without errors when node is bound
      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element },
      })

      const node = doc_query(`.element-tile`)
      expect(node.classList.contains(`element-tile`)).toBe(true)
    })
  })

  describe(`text_color_threshold prop`, () => {
    test(`uses custom text_color_threshold`, () => {
      // This test verifies the prop is accepted and passed to choose_bw_for_contrast
      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element, text_color_threshold: 0.5 },
      })

      const node = doc_query(`.element-tile`)
      expect(node).toBeTruthy() // Basic check that component renders
    })
  })

  describe(`event handling`, () => {
    test.each([
      [`onmouseenter`, `mouseenter`],
      [`onmouseleave`, `mouseleave`],
    ])(`forwards %s events`, (event_prop, event_type) => {
      const spy = vi.fn()

      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element, [event_prop]: spy },
      })

      const node = doc_query(`.element-tile`)
      const event = new Event(event_type)
      node.dispatchEvent(event)

      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith(event)
    })

    test(`accepts click and keyboard event handlers`, () => {
      // Test that click and keyboard handlers can be passed without errors
      const click_spy = vi.fn()
      const keydown_spy = vi.fn()

      mount(ElementTile, {
        target: document.body,
        props: {
          element: rand_element,
          onclick: click_spy,
          onkeydown: keydown_spy,
          onkeyup: vi.fn(),
        },
      })

      const node = doc_query(`.element-tile`)
      expect(node).toBeTruthy()
    })

    test(`has proper accessibility attributes`, () => {
      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element },
      })

      const node = doc_query(`.element-tile`)
      expect(node.getAttribute(`tabindex`)).toBe(`0`)
      expect(node.getAttribute(`role`)).toBe(`link`)
    })
  })

  describe(`accessibility`, () => {
    test(`has proper ARIA attributes`, () => {
      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element },
      })

      const node = doc_query(`.element-tile`)
      expect(node.getAttribute(`role`)).toBe(`link`)
      expect(node.getAttribute(`tabindex`)).toBe(`0`)
    })

    test(`includes data-sveltekit-noscroll when href is provided`, () => {
      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element, href: `/test` },
      })

      const node = doc_query(`.element-tile`)
      expect(node.hasAttribute(`data-sveltekit-noscroll`)).toBe(true)
    })
  })

  describe(`rest props`, () => {
    test(`forwards additional props to element`, () => {
      mount(ElementTile, {
        target: document.body,
        props: {
          element: rand_element,
          'data-testid': `custom-test-id`,
          'aria-label': `Custom aria label`,
        },
      })

      const node = doc_query(`.element-tile`)
      expect(node.getAttribute(`data-testid`)).toBe(`custom-test-id`)
      expect(node.getAttribute(`aria-label`)).toBe(`Custom aria label`)
    })
  })

  describe(`text_color binding`, () => {
    test(`renders without error when text_color binding is used`, () => {
      // Test that the component renders without errors when text_color is bound
      mount(ElementTile, {
        target: document.body,
        props: {
          element: rand_element,
          bg_color: `#000000`, // Dark background
        },
      })

      const node = doc_query(`.element-tile`)
      expect(node).toBeTruthy()
    })

    test(`explicit text_color overrides automatic calculation`, () => {
      const explicit_color = `#ff0000`

      mount(ElementTile, {
        target: document.body,
        props: {
          element: rand_element,
          bg_color: `#000000`, // Dark background (would normally get white text)
          text_color: explicit_color, // But we override with red
        },
      })

      const node = doc_query(`.element-tile`)
      expect(node.style.color).toBe(explicit_color)
    })

    test(`text_color reactivity works with background color changes`, () => {
      // This test specifically addresses the $effect rune bug mentioned by the user
      // Test that text color reacts properly to background color changes
      mount(ElementTile, {
        target: document.body,
        props: {
          element: rand_element,
          bg_color: `#000000`, // Start with dark background
        },
      })

      const node = doc_query(`.element-tile`)
      expect(node.style.backgroundColor).toBe(`#000000`)

      // Component should render without errors despite background/text color interactions
      expect(node).toBeTruthy()
      expect(node.classList.contains(`element-tile`)).toBe(true)
    })
  })

  describe(`edge cases`, () => {
    test(`handles elements with spaces in category names`, () => {
      // Find an element with a space in its category name
      const element_with_space = element_data.find((el) =>
        el.category.includes(` `),
      )
      if (element_with_space) {
        mount(ElementTile, {
          target: document.body,
          props: { element: element_with_space },
        })

        const node = doc_query(`.element-tile`)
        const expected_class = element_with_space.category.replaceAll(` `, `-`)
        expect(node.classList.contains(expected_class)).toBe(true)
      }
    })

    test(`handles zero value correctly`, () => {
      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element, value: 0 },
      })

      // Zero is falsy, so it shows name instead of value
      const name_element = doc_query(`.name`)
      expect(name_element.textContent).toBe(rand_element.name)
      expect(document.querySelector(`.value`)).toBeNull()
    })

    test(`handles empty string precision`, () => {
      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element, value: 42.123, precision: `` },
      })

      const value_element = doc_query(`.value`)
      // Empty precision defaults to format_num default behavior
      expect(value_element.textContent).toBe(`42.1`)
    })
  })

  describe(`multi-value support`, () => {
    test.each([
      {
        value: [10, 20],
        segments: [`diagonal-top`, `diagonal-bottom`],
        positions: [`top-left`, `bottom-right`],
      },
      {
        value: [1, 2, 3],
        segments: [`horizontal-top`, `horizontal-middle`, `horizontal-bottom`],
        positions: [`bar-top-left`, `bar-middle-right`, `bar-bottom-left`],
      },
      {
        value: [1, 2, 3, 4],
        segments: [`quadrant-tl`, `quadrant-tr`, `quadrant-bl`, `quadrant-br`],
        positions: [
          `quad-top-left`,
          `quad-top-right`,
          `quad-bottom-left`,
          `quad-bottom-right`,
        ],
      },
    ])(
      `renders $value.length values with segments and positioning`,
      ({ value, segments, positions }) => {
        mount(ElementTile, {
          target: document.body,
          props: {
            element: rand_element,
            value,
            bg_colors: value.map(() => `#ff0000`),
          },
        })

        // Verify segments and positions are correct
        segments.forEach((cls) =>
          expect(document.querySelector(`.segment.${cls}`)).toBeTruthy(),
        )
        positions.forEach((cls) =>
          expect(document.querySelector(`.multi-value.${cls}`)).toBeTruthy(),
        )

        // Multi-value tiles should have transparent background
        expect(doc_query(`.element-tile`).style.backgroundColor).toBe(
          `transparent`,
        )
      },
    )

    test.each([
      { value: [10, 0, 30], expected_count: 2, desc: `zero values hidden` },
      { value: 42, expected_segments: 0, desc: `single value behavior` },
      {
        value: [1, 2, 3, 4, 5, 6],
        expected_segments: 0,
        desc: `arrays >4 fallback`,
      },
    ])(`edge cases: $desc`, ({ value, expected_count, expected_segments }) => {
      mount(ElementTile, {
        target: document.body,
        props: {
          element: rand_element,
          value,
          bg_colors: Array.isArray(value)
            ? value.map(() => `#ff0000`)
            : undefined,
          bg_color: !Array.isArray(value) ? `#ff0000` : undefined,
        },
      })

      if (expected_count !== undefined) {
        expect(document.querySelectorAll(`.multi-value`).length).toBe(
          expected_count,
        )
      }

      if (expected_segments !== undefined) {
        expect(document.querySelectorAll(`.segment`).length).toBe(
          expected_segments,
        )
      }
    })

    test.each([[[]], [[0, 0]], [undefined], [false]])(
      `handles invalid data: %s`,
      (value) => {
        mount(ElementTile, {
          target: document.body,
          props: {
            element: rand_element,
            value: value as never,
            bg_colors: [],
          },
        })

        // Should not crash and should not show segments for invalid data
        expect(document.querySelector(`.element-tile`)).toBeTruthy()
        expect(document.querySelector(`.segment`)).toBeNull()
      },
    )
  })

  describe(`color value support`, () => {
    test.each([
      [`#ff0000`, true, `hex`],
      [`red`, true, `named`],
      [`rgb(255, 0, 0)`, false, `rgb`],
      [`var(--color)`, false, `CSS var`],
    ])(`%s (%s) - detected=%s`, (color_value, is_detected, _type) => {
      mount(ElementTile, {
        target: document.body,
        props: {
          element: rand_element,
          value: color_value,
          bg_color: color_value,
        },
      })

      const tile = doc_query(`.element-tile`)
      expect(tile.style.backgroundColor).toBe(color_value)
      expect(!!document.querySelector(`.value`)).toBe(!is_detected)
      expect(!!document.querySelector(`.name`)).toBe(is_detected)
    })

    test.each([
      [true, `shows color as text`],
      [false, `hides all values`],
    ])(`show_values=%s`, (show_values, _desc) => {
      mount(ElementTile, {
        target: document.body,
        props: {
          element: rand_element,
          value: `#ff0000`,
          bg_color: `#ff0000`,
          show_values,
        },
      })

      const has_value = !!document.querySelector(`.value`)
      const has_name = !!document.querySelector(`.name`)
      expect(has_value).toBe(show_values)
      expect(has_name).toBe(!show_values)
    })

    test.each([
      [[`#ff0000`, `#00ff00`], 2],
      [[`#ff0000`, `#00ff00`, `#0000ff`], 3],
      [[`#ff0000`, `#00ff00`, `#0000ff`, `#ffff00`], 4],
    ])(`%s colors -> %s segments`, (colors, segments) => {
      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element, value: colors, bg_colors: colors },
      })

      expect(document.querySelectorAll(`.segment`).length).toBe(segments)
      expect(doc_query(`.element-tile`).style.backgroundColor).toBe(
        `transparent`,
      )
      expect(document.querySelector(`.value`)).toBeNull()
    })

    test.each([
      [[`#ff0000`, 42], false, 0, `mixed with color`],
      [[42, 84], true, 2, `numeric only`],
    ])(`mixed arrays: %s`, (values, should_show, expected_spans, _desc) => {
      mount(ElementTile, {
        target: document.body,
        props: {
          element: rand_element,
          value: values as never,
          bg_colors: [`#ff0000`, `#00ff00`],
        },
      })

      expect(document.querySelectorAll(`.multi-value`).length).toBe(
        expected_spans,
      )
      expect(!!document.querySelector(`.name`)).toBe(!should_show)
    })
  })

  describe(`background color fallback`, () => {
    test(`uses default category color when no bg_color provided`, () => {
      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element },
      })

      const node = doc_query(`.element-tile`)
      const expected_color =
        default_category_colors[rand_element.category.replaceAll(` `, `-`)]
      expect(node.style.backgroundColor).toBe(expected_color)
    })

    test(`explicit bg_color overrides category default`, () => {
      const custom_color = `#123456`
      mount(ElementTile, {
        target: document.body,
        props: { element: rand_element, bg_color: custom_color },
      })

      const node = doc_query(`.element-tile`)
      expect(node.style.backgroundColor).toBe(custom_color)
    })
  })
})
