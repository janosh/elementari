import type { Category } from '$lib'
import { element_data, PeriodicTable, PropertySelect } from '$lib'
import { category_counts, heatmap_labels } from '$lib/labels'
import { tick } from 'svelte'
import { describe, expect, test, vi } from 'vitest'
import { doc_query } from '.'

const mouseenter = new MouseEvent(`mouseenter`)
const mouseleave = new MouseEvent(`mouseleave`)

describe(`PeriodicTable`, () => {
  test.each([
    [true, 120],
    [false, 118],
    [null, 118],
    [[], 118],
  ])(
    `renders element tiles with show_lanth_act_tiles=%s`,
    async (lanth_act_tiles, expected_tiles) => {
      const props = lanth_act_tiles == true ? {} : { lanth_act_tiles }
      new PeriodicTable({ target: document.body, props })

      const element_tiles = document.querySelectorAll(`.element-tile`)
      expect(element_tiles.length).toBe(expected_tiles)
    },
  )

  test(`has no text content when symbols, names and numbers are disabled`, async () => {
    const tile_props = {
      show_symbol: false,
      show_name: false,
      show_number: false,
    }
    new PeriodicTable({ target: document.body, props: { tile_props } })

    const table = doc_query(`.periodic-table`)

    expect(table?.textContent?.trim()).toBe(``)

    // make sure empty tiles are still rendered
    const symbol_tiles = document.querySelectorAll(`.element-tile`)
    expect(symbol_tiles.length).toBe(118)
  })

  test(`hovering element tile toggles CSS class 'active'`, async () => {
    new PeriodicTable({ target: document.body })

    const element_tile = doc_query(`.element-tile`)

    element_tile?.dispatchEvent(mouseenter)
    await tick()
    expect([...element_tile.classList]).toContain(`active`)

    element_tile?.dispatchEvent(mouseleave)
    await tick()
    expect([...element_tile.classList]).not.toContain(`active`)
  })

  test(`shows element photo when hovering element tile`, async () => {
    new PeriodicTable({ target: document.body })

    const rand_idx = Math.floor(Math.random() * element_data.length)
    const random_element = element_data[rand_idx]

    const element_tile = document.querySelectorAll(`.element-tile`)[rand_idx]

    element_tile?.dispatchEvent(mouseenter)
    await tick()

    const element_photo = doc_query(`img[alt="${random_element.name}"]`)
    expect(element_photo?.style.gridArea).toBe(`9/1/span 2/span 2`)

    element_tile?.dispatchEvent(mouseleave)
    await tick()
    expect(document.querySelector(`img`)).toBeNull()
  })

  test(`hooking PeriodicTable up to PropertySelect and selecting heatmap sets element tile background`, async () => {
    const table = new PeriodicTable({ target: document.body })
    new PropertySelect({ target: document.body })

    const li = doc_query(`ul.options > li`)
    li.dispatchEvent(new MouseEvent(`mouseup`))
    await tick()

    const selected = doc_query(`div.multiselect > ul.selected`)
    const heatmap_label = `Atomic Mass (u)`
    expect(selected.textContent?.trim()).toBe(heatmap_label)
    const heatmap_key = heatmap_labels[heatmap_label]

    expect(heatmap_key).toBe(`atomic_mass`)
    table.$set({
      heatmap_values: element_data.map((elem) => elem[heatmap_key]),
    })
    await tick()

    const element_tile = doc_query(`div.element-tile`)
    // hydrogen with lowest mass should be blue (low end of color scale)
    expect(element_tile.style.backgroundColor).toBe(`rgb(68, 1, 84)`)
  })

  test.each([[0], [0.5], [1], [2]])(
    `inner_transition_metal_offset`,
    async (inner_transition_metal_offset) => {
      new PeriodicTable({
        target: document.body,
        props: { inner_transition_metal_offset },
      })

      if (inner_transition_metal_offset) {
        const spacer = doc_query(`div.spacer`)
        expect(getComputedStyle(spacer).gridRow).toBe(`8`)
      } else {
        expect(document.querySelector(`div.spacer`)).toBeNull()
      }
    },
  )

  test(`clicking element tile emits event`, async () => {
    const table = new PeriodicTable({ target: document.body })
    let expected_active = false

    let emitted = false
    table.$on(`click`, (event) => {
      emitted = true
      expect(event.detail.element).toBe(element_data[0])
      expect(event.detail.active).toBe(expected_active)
      expect(event.detail.dom_event).toBeInstanceOf(MouseEvent)
      expect(event.detail.dom_event.type).toBe(`click`)
    })

    const element_tile = doc_query(`.element-tile`)
    element_tile?.dispatchEvent(new MouseEvent(`click`))
    await tick()
    expect(emitted).toBe(true)

    expected_active = true
    element_tile?.dispatchEvent(mouseenter)
    await tick()

    element_tile?.dispatchEvent(new MouseEvent(`click`))
  })

  test.each([[`0`], [`10px`], [`1cqw`]])(`gap prop`, (gap) => {
    new PeriodicTable({ target: document.body, props: { gap } })
    const table = doc_query(`.periodic-table`)
    expect(getComputedStyle(table).gap).toBe(gap)
  })

  test.each(Object.entries(category_counts))(
    `setting active_category=%s highlights corresponding element tiles`,
    (active_category, expected_active) => {
      new PeriodicTable({
        target: document.body,
        props: {
          active_category: active_category.replaceAll(` `, `-`) as Category,
        },
      })

      const active_tiles = document.querySelectorAll(`.element-tile.active`)
      expect(active_tiles.length).toBe(expected_active)
    },
  )

  test.each([[[...Array(200).keys()]], [[...Array(119).keys()]]])(
    `raises error when receiving more than 118 heatmap values`,
    (heatmap_values) => {
      console.error = vi.fn()

      new PeriodicTable({
        target: document.body,
        props: { heatmap_values },
      })

      expect(console.error).toHaveBeenCalledOnce()
      expect(console.error).toBeCalledWith(
        `heatmap_values is an array of numbers, length should be 118 or less, one for ` +
          `each element possibly omitting elements at the end, got ${heatmap_values.length}`,
      )
    },
  )

  test.each([[{ he: 0 }], [{ foo: 42 }]])(
    `raises error when heatmap_values=%o is object with unknown element symbols`,
    (heatmap_values) => {
      console.error = vi.fn()

      new PeriodicTable({
        target: document.body,
        // @ts-expect-error testing invalid input
        props: { heatmap_values },
      })

      expect(console.error).toHaveBeenCalledOnce()
      expect(console.error).toBeCalledWith(
        `heatmap_values is an object, keys should be element symbols, got ${Object.keys(
          heatmap_values,
        )}`,
      )
    },
  )

  test(`element tiles are accessible to keyboard users`, async () => {
    new PeriodicTable({ target: document.body })

    const element_tiles = document.querySelectorAll(`.element-tile`)

    // Simulate keyboard navigation of the element tiles
    let activeIndex = 0
    element_tiles[activeIndex].dispatchEvent(mouseenter)
    await tick()
    expect(element_tiles[activeIndex].classList.contains(`active`)).toBe(true)
    expect(element_tiles[activeIndex].textContent?.trim()).toBe(`1 H Hydrogen`)

    // Press the down arrow key to move to the next row
    window.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowDown` }))
    await tick()
    activeIndex += 2
    expect(element_tiles[activeIndex].classList.contains(`active`)).toBe(true)
    expect(element_tiles[activeIndex].textContent?.trim()).toBe(`3 Li Lithium`)

    // Press the right arrow key to move to the next column
    activeIndex += 1
    window.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowRight` }))
    await tick()
    expect(element_tiles[activeIndex].textContent?.trim()).toBe(
      `4 Be Beryllium`,
    )

    // Press the left arrow key to move back to the previous column
    activeIndex -= 1
    window.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowLeft` }))
    await tick()
    expect(element_tiles[activeIndex].textContent?.trim()).toBe(`3 Li Lithium`)
  })
})
