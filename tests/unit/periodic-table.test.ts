import elements from '$lib/element-data.yml'
import PeriodicTable from '$lib/PeriodicTable.svelte'
import { beforeEach, describe, expect, test } from 'vitest'

beforeEach(() => {
  document.body.innerHTML = ``
})

export async function sleep(ms = 1) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function doc_query(selector: string): HTMLElement {
  const node = document.querySelector(selector)
  if (!node) {
    throw new Error(`Selector ${selector} not in document`)
  }
  return node as HTMLElement
}

describe(`PeriodicTable`, () => {
  test(`renders element tiles`, async () => {
    new PeriodicTable({ target: document.body })

    const element_tiles = document.querySelectorAll(`.element-tile`)
    expect(element_tiles.length).toBe(118)
  })

  test(`has no text content when symbols, names and numbers are disabled`, async () => {
    new PeriodicTable({
      target: document.body,
      props: {
        show_symbols: false,
        show_names: false,
        show_numbers: false,
        // style: `width: 500px; height: 100px;`,
      },
    })

    const ptable = doc_query(`.periodic-table`)

    expect(ptable?.textContent?.trim()).toBe(``)

    // make sure empty tiles are still rendered
    const symbol_tiles = document.querySelectorAll(`.element-tile`)
    expect(symbol_tiles.length).toBe(118)
  })

  test(`hovering element tile toggles CSS class 'active'`, async () => {
    new PeriodicTable({ target: document.body })

    const element_tile = doc_query(`.element-tile`)

    element_tile?.dispatchEvent(new MouseEvent(`mouseenter`))
    await sleep()
    expect([...element_tile.classList]).toContain(`active`)

    element_tile?.dispatchEvent(new MouseEvent(`mouseleave`))
    await sleep()
    expect([...element_tile.classList]).not.toContain(`active`)
  })

  test(`renders element photo when hovering element tile`, async () => {
    new PeriodicTable({ target: document.body })

    const rand_idx = Math.floor(Math.random() * elements.length)
    const random_element = elements[rand_idx]

    const element_tile = document.querySelectorAll(`.element-tile`)[rand_idx]

    element_tile?.dispatchEvent(new MouseEvent(`mouseenter`))
    await sleep()

    const element_photo = doc_query(`img[alt="${random_element.name}"]`)
    expect(element_photo?.style.gridArea).toBe(`9/1/span 2/span 2`)

    element_tile?.dispatchEvent(new MouseEvent(`mouseleave`))
    await sleep()
    expect(document.querySelector(`img`)).toBeNull()
  })
})
