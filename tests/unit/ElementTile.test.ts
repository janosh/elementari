import { ElementTile, element_data, type PeriodicTableEvents } from '$lib'
import { describe, expect, test, vi } from 'vitest'
import { doc_query } from '.'

// test random element for increased robustness
const rand_idx = Math.floor(Math.random() * element_data.length)
const rand_element = element_data[rand_idx]

describe(`ElementTile`, () => {
  test(`renders element name, symbol and atomic number`, () => {
    new ElementTile({
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

  test.each([
    [`mouseenter`],
    [`mouseleave`],
    [`click`],
    [`keydown`],
    [`keyup`],
  ])(`forwards %s events with payload`, (event_type) => {
    const element_tile = new ElementTile({
      target: document.body,
      props: { element: rand_element },
    })

    const spy = vi.fn()

    element_tile.$on(event_type as keyof PeriodicTableEvents, spy)

    const node = doc_query(`.element-tile`)

    node.dispatchEvent(new MouseEvent(event_type))

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(new CustomEvent(event_type))
  })

  test(`applies bg_color as background color`, async () => {
    new ElementTile({
      target: document.body,
      props: { element: rand_element, bg_color: `red` },
    })

    const node = doc_query(`.element-tile`)

    expect(node.style.backgroundColor).toBe(`red`)
  })

  // skipping for now as JSDOM doesn't actually apply the bg_color so ElementTile can't determine its text color from background
  test.skip.each([
    [`red`, `white`],
    [`#eee`, `black`],
    [`#ddd`, `black`],
    [`#cccccc`, `black`],
    [`green`, `white`],
    [`blue`, `white`],
    [`yellow`, `white`],
    [`orange`, `white`],
    [`purple`, `white`],
    [`white`, `black`],
    [`lightgray`, `black`],
  ])(
    `sets text_color based on lightness of bg_color`,
    async (bg_color, text_color) => {
      new ElementTile({
        target: document.body,
        props: { element: rand_element, bg_color },
      })

      const node = doc_query(`.element-tile`)

      expect(
        node.style.color,
        `got text_color=${node.style.color} for bg_color=${bg_color}, expected ${text_color}`
      ).toBe(text_color)
    }
  )

  test.each([[true], [false]])(
    `applies class active when active=true`,
    async (active) => {
      new ElementTile({
        target: document.body,
        props: { element: rand_element, active },
      })

      const node = doc_query(`.element-tile`)

      expect(node.classList.contains(`active`)).toBe(active)
    }
  )

  describe.each([[`name`], [`number`], [`symbol`]] as const)(
    `prop=%s`,
    (prop) => {
      test.each([[true], [false]])(
        `show_${prop} toggles ${prop} visibility`,
        (value) => {
          new ElementTile({
            target: document.body,
            props: { element: rand_element, [`show_${prop}`]: value },
          })

          if (value) {
            const span = doc_query(`.${prop}`)

            expect(span.textContent).toBe(`${rand_element[prop]}`)
          } else {
            expect(document.querySelector(`.${prop}`)).toBeNull()
          }
        }
      )
    }
  )
  test.each([
    [true, true, true],
    [false, false, false],
    [true, false, true],
    [false, false, true],
  ])(
    `props show_symbol = %s, show_number = %s, show_name = %s`,
    async (show_name, show_number, show_symbol) => {
      let expected = ``
      if (show_number) expected += rand_element.number
      if (show_symbol) expected += ` ${rand_element.symbol}`
      if (show_name) expected += ` ${rand_element.name}`
      new ElementTile({
        target: document.body,
        props: { element: rand_element, show_symbol, show_name, show_number },
      })

      const tile = doc_query(`.element-tile`)

      expect(tile.textContent?.trim()).toBe(expected.trim())
    }
  )
})
