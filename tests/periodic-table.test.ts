import { heatmap_keys, heatmap_labels, pretty_num } from '$lib/labels.ts'
import { expect, test } from '@playwright/test'
import { element_data } from './index.ts'

export const category_counts: Record<string, number> = {}

for (const { category } of element_data) {
  category_counts[category] = (category_counts[category] ?? 0) + 1
}

test.describe(`Periodic Table`, () => {
  test(`in default state`, async ({ page }) => {
    await page.goto(`/`, { waitUntil: `networkidle` })

    const element_tiles = await page.$$(`.element-tile`)
    expect(element_tiles).toHaveLength(element_data.length)

    for (const [category, count] of Object.entries(category_counts)) {
      const css_cls = `.${category.replaceAll(` `, `-`)}`
      expect(await page.$$(css_cls)).toHaveLength(count as number)
    }
  })

  test(`shows stats on hover element`, async ({ page }) => {
    await page.goto(`/`, { waitUntil: `networkidle` })

    await page.hover(`text=Hydrogen`)

    expect(await page.$(`text=1 - Hydrogen diatomic nonmetal`)).not.toBeNull()
  })

  test(`can hover every element without throwing errors`, async ({ page }) => {
    const logs: string[] = []
    page.on(`console`, (msg) => {
      if (
        msg.type() === `error` &&
        !msg.text().startsWith(`Failed to load resource:`)
      )
        logs.push(msg.text())
    })
    await page.goto(`/`, { waitUntil: `networkidle` })

    const element_tiles = await page.$$(`.element-tile`)
    for (const element_tile of element_tiles) {
      await element_tile.hover()
    }

    expect(logs).toHaveLength(0)
  })

  test.describe(`in heatmap mode`, () => {
    test(`displays elemental heat values`, async ({ page }) => {
      await page.goto(`/`, { waitUntil: `networkidle` })

      // select all heatmaps in sequence making sure non of them crash
      for (const heatmap_label of Object.keys(heatmap_labels)) {
        await page.click(`div.multiselect`)
        // somehow clicking twice helps not to get stuck with a closed multi-select dropdown
        await page.click(`div.multiselect`)
        await page.click(`text=${heatmap_label}`)
      }

      for (const _ of [...Array(5)]) {
        // check 5 random element tiles display the expected heatmap value

        const rand_idx = Math.floor(Math.random() * element_data.length)
        const random_element = element_data[rand_idx]

        const heatmap_val = pretty_num(random_element[heatmap_keys.at(-1)])

        // make sure Fluorine electronegativity value is displayed correctly
        const elem_tile = await page.$(
          `text=${rand_idx + 1} ${random_element.symbol} ${heatmap_val}`,
          { strict: true }
        )
        expect(elem_tile).not.toBeNull()
      }
    })
  })
})
