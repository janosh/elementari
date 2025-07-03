// deno-lint-ignore-file no-await-in-loop
import { expect, type Locator, type Page, test } from '@playwright/test'

// HELPER FUNCTIONS
const click_radio = async (page: Page, selector: string): Promise<void> => {
  await page.evaluate((sel) => {
    const radio = document.querySelector(sel) as HTMLInputElement
    if (radio) radio.click()
  }, selector)
}

const set_range_value = async (
  page: Page,
  selector: string,
  value: number,
): Promise<void> => {
  await page.evaluate(
    ({ sel, val }) => {
      const input = document.querySelector(sel) as HTMLInputElement
      if (input) {
        input.value = val.toString()
        input.dispatchEvent(new Event(`input`, { bubbles: true }))
        input.dispatchEvent(new Event(`change`, { bubbles: true }))
      }
    },
    { sel: selector, val: value },
  )
}

const get_bar_count = async (histogram_locator: Locator): Promise<number> => {
  return await histogram_locator.locator(`rect[fill]:not([fill="none"])`).count()
}

test.describe(`Histogram Component Tests`, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/test/histogram`, { waitUntil: `load` })
  })

  test(`renders basic histogram with correct structure`, async ({ page }) => {
    const histogram = page.locator(`#basic-single-series svg`).first()
    await expect(histogram).toBeVisible()

    const [x_label, y_label, bar_count, x_tick_count, y_tick_count] = await Promise.all([
      histogram.locator(`text:has-text("Value")`).isVisible(),
      histogram.locator(`text:has-text("Frequency")`).isVisible(),
      get_bar_count(histogram),
      histogram.locator(`g.x-axis .tick`).count(),
      histogram.locator(`g.y-axis .tick`).count(),
    ])

    expect(x_label).toBe(true)
    expect(y_label).toBe(true)
    expect(bar_count).toBeGreaterThan(0)
    expect(x_tick_count).toBeGreaterThan(0)
    expect(y_tick_count).toBeGreaterThan(0)
  })

  test(`responds to control changes`, async ({ page }) => {
    const histogram = page.locator(`#basic-single-series svg`).first()

    // Wait for histogram to render with bars (D3 may adjust bin count slightly)
    await expect(histogram.locator(`rect[fill]:not([fill="none"])`).first()).toBeVisible({
      timeout: 5000,
    })

    const controls = [
      {
        control: `bin count`,
        selector: `input[type="range"]:first-of-type`,
        values: [5, 50],
      },
      {
        control: `sample size`,
        selector: `input[type="range"]:nth-of-type(2)`,
        values: [100, 5000],
      },
    ]

    for (const { selector, values } of controls) {
      for (const value of values) {
        await set_range_value(page, `#basic-single-series ${selector}`, value)
        await page.waitForTimeout(300)
        const bar_count = await get_bar_count(histogram)
        expect(bar_count).toBeGreaterThan(0)
      }
    }
  })

  test(`multiple series overlay functionality`, async ({ page }) => {
    const histogram = page.locator(`#multiple-series-overlay svg`).first()
    await expect(histogram).toBeVisible()

    // Wait for histogram to render bars and axes
    await expect(histogram.locator(`rect[fill]:not([fill="none"])`).first()).toBeVisible({
      timeout: 5000,
    })
    await expect(histogram.locator(`g.x-axis`)).toBeVisible({ timeout: 5000 })
    await expect(histogram.locator(`g.y-axis`)).toBeVisible({ timeout: 5000 })

    // Debug: check if histogram has dimensions and content
    const has_dimensions = await histogram.evaluate((el) => {
      const rect = el.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    })
    expect(has_dimensions).toBe(true)

    const [series_count, series_bars, x_axis_count, y_axis_count] = await Promise.all([
      histogram.locator(`g.histogram-series`).count(),
      histogram.locator(`g.histogram-series rect`).all(),
      histogram.locator(`g.x-axis`).count(),
      histogram.locator(`g.y-axis`).count(),
    ])

    expect(x_axis_count).toBeGreaterThan(0)
    expect(y_axis_count).toBeGreaterThan(0)
    expect(series_count).toBeGreaterThan(0)
    expect(series_bars.length).toBeGreaterThan(0)

    const stroke_width = await series_bars[0].getAttribute(`stroke-width`)
    expect(parseFloat(stroke_width || `0`)).toBeGreaterThan(0)

    const opacity_slider = page.locator(`#multiple-series-overlay`).getByRole(`slider`, {
      name: `Opacity:`,
    })
    const stroke_slider = page.locator(`#multiple-series-overlay`).getByRole(`slider`, {
      name: `Stroke Width:`,
    })

    await opacity_slider.fill(`0.1`)
    await stroke_slider.fill(`3`)
    await page.waitForTimeout(300)

    const [final_x_axis, final_y_axis] = await Promise.all([
      histogram.locator(`g.x-axis`).count(),
      histogram.locator(`g.y-axis`).count(),
    ])
    expect(final_x_axis).toBeGreaterThan(0)
    expect(final_y_axis).toBeGreaterThan(0)
  })

  test(`series visibility toggles work`, async ({ page }) => {
    const histogram = page.locator(`#multiple-series-overlay svg`).first()
    const first_checkbox = page.locator(`#multiple-series-overlay input[type="checkbox"]`)
      .first()

    await page.waitForTimeout(500)
    const initial_bars = await get_bar_count(histogram)

    // Toggle off and on
    await first_checkbox.uncheck()
    await page.waitForTimeout(200)
    const after_toggle = await get_bar_count(histogram)

    await first_checkbox.check()
    await page.waitForTimeout(200)
    const after_restore = await get_bar_count(histogram)

    expect(initial_bars).toBeGreaterThan(0)
    expect(after_toggle).toBeGreaterThan(0)
    expect(after_restore).toBeGreaterThan(0)
  })

  test(`logarithmic scale combinations`, async ({ page }) => {
    const histogram = page.locator(`#logarithmic-scales svg`).first()

    // Wait for initial histogram to render
    await expect(histogram.locator(`rect[fill]:not([fill="none"])`).first()).toBeVisible({
      timeout: 5000,
    })

    const scale_combinations = [
      { x_scale: `linear`, y_scale: `linear` },
      { x_scale: `log`, y_scale: `linear` },
      { x_scale: `log`, y_scale: `log` },
      { x_scale: `linear`, y_scale: `log` },
    ]

    for (const { x_scale, y_scale } of scale_combinations) {
      await click_radio(page, `#logarithmic-scales input[value="${x_scale}"][name*="x"]`)
      await click_radio(page, `#logarithmic-scales input[value="${y_scale}"][name*="y"]`)

      // Wait for histogram to re-render with new scale and for axes to be visible
      await page.waitForTimeout(500)

      // Wait for axes to be rendered with ticks
      await expect(histogram.locator(`g.x-axis .tick`).first()).toBeVisible({
        timeout: 3000,
      })
      await expect(histogram.locator(`g.y-axis .tick`).first()).toBeVisible({
        timeout: 3000,
      })

      const [x_tick_count, y_tick_count, bar_count] = await Promise.all([
        histogram.locator(`g.x-axis .tick`).count(),
        histogram.locator(`g.y-axis .tick`).count(),
        get_bar_count(histogram),
      ])

      expect(x_tick_count).toBeGreaterThan(0)
      expect(y_tick_count).toBeGreaterThan(0)
      expect(bar_count).toBeGreaterThan(0)
    }
  })

  test(`distribution types`, async ({ page }) => {
    const histogram = page.locator(`#real-world-distributions svg`).first()
    const description = page.locator(`#real-world-distributions p[style*="italic"]`)

    const distributions = [
      { type: `bimodal`, expected_text: `Two distinct peaks`, min_bars: 5 },
      { type: `skewed`, expected_text: `Long tail extending`, min_bars: 5 },
      { type: `discrete`, expected_text: `Discrete values`, max_bars: 10 },
      { type: `age`, expected_text: `Multi-modal age groups`, min_bars: 5 },
    ]

    for (const { type, expected_text, min_bars, max_bars } of distributions) {
      await page.locator(`#real-world-distributions select`).selectOption(type)
      await page.waitForTimeout(500) // Increased wait time

      // Ensure histogram is visible and has content
      await expect(histogram).toBeVisible()

      const [bar_count, desc_text] = await Promise.all([
        get_bar_count(histogram),
        description.textContent(),
      ])

      expect(bar_count).toBeGreaterThan(0)
      expect(desc_text).toContain(expected_text)

      if (min_bars) expect(bar_count).toBeGreaterThan(min_bars)
      if (max_bars) expect(bar_count).toBeLessThanOrEqual(max_bars)
    }
  })

  test(`bin size comparison modes`, async ({ page }) => {
    const histogram = page.locator(`#bin-size-comparison svg`).first()
    const overlay_checkbox = page.locator(`#bin-size-comparison input[type="checkbox"]`)
    const info_box = page.locator(`#bin-size-comparison div[style*="background"]`)

    // Wait for histogram to render initially
    await expect(histogram.locator(`rect[fill]:not([fill="none"])`).first()).toBeVisible({
      timeout: 5000,
    })

    // Test single mode with different bin sizes
    await expect(overlay_checkbox).not.toBeChecked()
    for (const bin_size of [10, 100]) {
      await set_range_value(page, `#bin-size-comparison input[type="range"]`, bin_size)
      await page.waitForTimeout(300)
      const bar_count = await get_bar_count(histogram)
      expect(bar_count).toBeGreaterThan(0)
    }

    // Test overlay mode
    await overlay_checkbox.check()
    await page.waitForTimeout(300)
    const series_count = await histogram.locator(`g.histogram-series`).count()
    expect(series_count).toBeGreaterThan(1)

    // Check info box content
    const info_text = await info_box.textContent()
    expect(info_text).toContain(`Bin Size Effects`)
    expect(info_text).toContain(`Too few bins`)
  })

  test(`custom styling and color schemes`, async ({ page }) => {
    const color_scheme_select = page.getByLabel(`Color Scheme:`)
    const custom_section = page.locator(`#custom-styling`)

    await expect(color_scheme_select).toBeVisible()

    // Test different color schemes
    for (const scheme of [`warm`, `default`]) {
      await color_scheme_select.selectOption(scheme)
      await page.waitForTimeout(300)
      await expect(custom_section).toBeVisible()
    }

    // Check custom styling background
    const section_style = await custom_section.evaluate((el) =>
      globalThis.getComputedStyle(el).background
    )
    expect(section_style).toContain(`gradient`)
  })

  test.skip(`time-series data types`, async ({ page }) => {
    const histogram = page.locator(`#time-series-data svg`).first()
    const analysis_box = page.locator(
      `#time-series-data div[style*="background"]:has-text("Analysis")`,
    )

    await page.waitForTimeout(500)

    const data_types = [
      { data_type: `website_traffic`, expected_text: `Traffic Pattern Analysis` },
      { data_type: `server_response`, expected_text: `Performance Analysis` },
    ]

    for (const { data_type, expected_text } of data_types) {
      await page.locator(`#time-series-data`).getByLabel(`Data Type:`).selectOption(
        data_type,
      )
      await page.waitForTimeout(500)

      const [histogram_exists, analysis_text, x_axis, y_axis, _bar_count] = await Promise
        .all([
          histogram.count(),
          analysis_box.textContent(),
          histogram.locator(`g.x-axis`).count(),
          histogram.locator(`g.y-axis`).count(),
          get_bar_count(histogram),
        ])

      expect(histogram_exists).toBeGreaterThan(0)
      expect(analysis_text).toContain(expected_text)
      expect(x_axis).toBeGreaterThan(0)
      expect(y_axis).toBeGreaterThan(0)
    }
  })

  test(`tooltips and legend functionality`, async ({ page }) => {
    // Test tooltips
    const basic_histogram = page.locator(`#basic-single-series svg`).first()
    const first_bar = basic_histogram.locator(`rect[fill]:not([fill="none"])`).first()
    await first_bar.hover({ force: true })

    const tooltip = basic_histogram.locator(`.tooltip`)
    if (await tooltip.isVisible({ timeout: 1000 })) {
      const tooltip_content = await tooltip.textContent()
      expect(tooltip_content).toContain(`Value:`)
      expect(tooltip_content).toContain(`Count:`)
    }

    // Test legend visibility
    const multiple_legend = page.locator(`#multiple-series-overlay .legend`)
    const single_legend = page.locator(`#basic-single-series .legend`)

    if (await multiple_legend.isVisible()) {
      const legend_items = await multiple_legend.locator(`.legend-item`).count()
      expect(legend_items).toBeGreaterThan(1)
    }
    await expect(single_legend).not.toBeVisible()
  })

  test(`legend remains functional when all series are disabled`, async ({ page }) => {
    // First enable overlay mode to get multiple series with a legend
    const overlay_checkbox = page.locator(`#bin-size-comparison input[type="checkbox"]`)
    await overlay_checkbox.check()

    const histogram = page.locator(`#bin-size-comparison svg`).first()
    const legend = page.locator(`#bin-size-comparison .legend`)

    // Verify legend is initially visible with multiple items
    await expect(legend).toBeVisible()
    const legend_items = legend.locator(`.legend-item`)
    const initial_item_count = await legend_items.count()
    expect(initial_item_count).toBeGreaterThan(1)

    // Get initial bar count to verify plot has data
    const initial_bars = await get_bar_count(histogram)
    expect(initial_bars).toBeGreaterThan(0)

    // Disable all series by clicking each legend item
    for (let i = 0; i < initial_item_count; i++) {
      await legend_items.nth(i).click()
    }
    await page.waitForTimeout(50)

    await expect(legend).toBeVisible()
    const disabled_item_count = await legend_items.count()
    expect(disabled_item_count).toBe(initial_item_count)

    const [x_axis, y_axis] = await Promise.all([
      histogram.locator(`g.x-axis`).count(),
      histogram.locator(`g.y-axis`).count(),
    ])
    expect(x_axis).toBeGreaterThan(0)
    expect(y_axis).toBeGreaterThan(0)

    await legend_items.first().click()
    await page.waitForTimeout(50)
    await expect(legend).toBeVisible()

    await legend_items.nth(1).click()
    await page.waitForTimeout(50)

    const final_item_count = await legend_items.count()
    expect(final_item_count).toBe(initial_item_count)
  })

  test(`keyboard navigation and responsive behavior`, async ({ page }) => {
    const histogram = page.locator(`#basic-single-series svg`).first()

    // Test keyboard events
    await page.keyboard.press(`Tab`)
    await page.keyboard.press(`Escape`)
    await page.waitForTimeout(100)

    expect(page.url()).toContain(`/test/histogram`)
    await expect(histogram).toBeVisible()

    // Test responsive behavior
    const viewports = [
      { width: 400, height: 300 },
      { width: 800, height: 600 },
      { width: 1280, height: 720 },
    ]

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.waitForTimeout(100)
      await expect(histogram).toBeVisible()
    }
  })

  test(`error handling and edge cases`, async ({ page }) => {
    const page_errors: Error[] = []
    page.on(`pageerror`, (error) => page_errors.push(error))

    const histogram = page.locator(`#basic-single-series svg`).first()

    // Test rapid property changes
    for (let bin_count = 5; bin_count <= 50; bin_count += 15) {
      await set_range_value(
        page,
        `#basic-single-series input[type="range"]:first-of-type`,
        bin_count,
      )
      await page.waitForTimeout(10)
    }

    // Test rapid scale transitions
    const log_histogram = page.locator(`#logarithmic-scales svg`).first()
    const scales = [[`linear`, `linear`], [`log`, `log`], [`linear`, `log`]]

    for (const [x_scale, y_scale] of scales) {
      await click_radio(page, `#logarithmic-scales input[value="${x_scale}"][name*="x"]`)
      await click_radio(page, `#logarithmic-scales input[value="${y_scale}"][name*="y"]`)
      await page.waitForTimeout(50)
    }

    // Test rapid checkbox toggles
    const checkboxes = page.locator(`#multiple-series-overlay input[type="checkbox"]`)
    const checkbox_count = await checkboxes.count()

    for (let idx = 0; idx < checkbox_count; idx++) {
      await checkboxes.nth(idx).click()
      await page.waitForTimeout(25)
    }

    // Verify functionality still works
    const [basic_bars, log_bars] = await Promise.all([
      get_bar_count(histogram),
      get_bar_count(log_histogram),
    ])

    expect(basic_bars).toBeGreaterThan(0)
    expect(log_bars).toBeGreaterThan(0)
    expect(page_errors.length).toBeLessThan(5) // Allow some errors during rapid changes
  })

  test(`performance with large datasets and extreme values`, async ({ page }) => {
    const histogram = page.locator(`#basic-single-series svg`).first()

    // Test large dataset performance
    await set_range_value(
      page,
      `#basic-single-series input[type="range"]:nth-of-type(2)`,
      5000,
    )
    await page.waitForTimeout(500)

    const start_time = Date.now()
    const large_dataset_bars = await get_bar_count(histogram)
    const end_time = Date.now()

    expect(large_dataset_bars).toBeGreaterThan(0)
    expect(end_time - start_time).toBeLessThan(5000) // Should render within 5 seconds

    // Test extreme bin counts
    const bin_histogram = page.locator(`#bin-size-comparison svg`).first()

    for (const bin_size of [5, 100]) {
      await set_range_value(page, `#bin-size-comparison input[type="range"]`, bin_size)
      await page.waitForTimeout(200)
      const edge_bars = await get_bar_count(bin_histogram)
      expect(edge_bars).toBeGreaterThan(0)
    }

    // Test overlapping data ranges
    const overlay_histogram = page.locator(`#multiple-series-overlay svg`).first()
    const [series_count, total_bars] = await Promise.all([
      overlay_histogram.locator(`g.histogram-series`).count(),
      get_bar_count(overlay_histogram),
    ])

    expect(series_count).toBeGreaterThan(1)
    expect(total_bars).toBeGreaterThan(0)
  })

  test(`overlay opacity and stroke controls work`, async ({ page }) => {
    const histogram = page.locator(`#multiple-series-overlay svg`).first()
    await page.waitForTimeout(500)

    const opacity_slider = page.locator(`#multiple-series-overlay`).getByRole(`slider`, {
      name: `Opacity:`,
    })
    const stroke_slider = page.locator(`#multiple-series-overlay`).getByRole(`slider`, {
      name: `Stroke Width:`,
    })

    await expect(opacity_slider).toBeVisible()
    await opacity_slider.fill(`0.1`)
    await page.waitForTimeout(500)

    // Verify bars still exist (opacity change shouldn't remove bars)
    const bars_after_opacity = await histogram.locator(`g.histogram-series rect`).count()
    expect(bars_after_opacity).toBeGreaterThan(0)

    // Test stroke width changes - use label-based selector
    await stroke_slider.fill(`3`)
    await page.waitForTimeout(300)

    // Just verify the stroke width control exists and bars still render (don't check exact value)
    const bars_after_stroke = await histogram.locator(`g.histogram-series rect`).count()
    expect(bars_after_stroke).toBeGreaterThan(0)
  })

  test(`color scheme changes work correctly`, async ({ page }) => {
    const color_scheme_select = page.getByLabel(`Color Scheme:`)
    const custom_section = page.locator(`#custom-styling`)

    await expect(color_scheme_select).toBeVisible()
    await color_scheme_select.selectOption(`warm`)
    await page.waitForTimeout(1000)
    await expect(custom_section).toBeVisible()

    await color_scheme_select.selectOption(`default`)
    await page.waitForTimeout(500)
    await expect(custom_section).toBeVisible()
  })

  test(`grid lines are rendered correctly`, async ({ page }) => {
    const histogram = page.locator(`#basic-single-series svg`).first()
    await expect(histogram).toBeVisible()

    const [x_grid_lines, y_grid_lines] = await Promise.all([
      histogram.locator(`g.x-axis .tick line[stroke-dasharray]`).count(),
      histogram.locator(`g.y-axis .tick line[stroke-dasharray]`).count(),
    ])

    expect(x_grid_lines).toBeGreaterThan(0)
    expect(y_grid_lines).toBeGreaterThan(0)

    const x_grid_line = histogram.locator(`g.x-axis .tick line[stroke-dasharray]`).first()
    const y_grid_line = histogram.locator(`g.y-axis .tick line[stroke-dasharray]`).first()

    const [
      x_grid_stroke,
      y_grid_stroke,
      x_grid_dasharray,
      y_grid_dasharray,
      x_grid_y_extent,
      y_grid_x_extent,
    ] = await Promise.all([
      x_grid_line.getAttribute(`stroke`),
      y_grid_line.getAttribute(`stroke`),
      x_grid_line.getAttribute(`stroke-dasharray`),
      y_grid_line.getAttribute(`stroke-dasharray`),
      x_grid_line.getAttribute(`y1`),
      y_grid_line.getAttribute(`x2`),
    ])

    expect(x_grid_stroke).toBeTruthy()
    expect(y_grid_stroke).toBeTruthy()
    expect(x_grid_dasharray).toBeTruthy()
    expect(y_grid_dasharray).toBeTruthy()
    expect(parseFloat(x_grid_y_extent || `0`)).toBeLessThan(0)
    expect(parseFloat(y_grid_x_extent || `0`)).toBeGreaterThan(0)
  })
})
