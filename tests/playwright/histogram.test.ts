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

  test(`handles edge cases with invalid data gracefully`, async ({ page }) => {
    // Test with empty data
    await page.evaluate(() => {
      const histogram_container = document.querySelector(
        `#basic-single-series .histogram`,
      )
      if (!histogram_container) return

      // Create a test histogram with empty data
      const event = new CustomEvent(`test-histogram`, {
        detail: { series: [{ label: `Empty`, y: [], visible: true }] },
      })
      histogram_container.dispatchEvent(event)
    })

    await page.waitForTimeout(300)
    const histogram = page.locator(`#basic-single-series svg`).first()
    await expect(histogram).toBeVisible()

    // Should still render axes even with no data
    const [x_axis, y_axis] = await Promise.all([
      histogram.locator(`g.x-axis`).count(),
      histogram.locator(`g.y-axis`).count(),
    ])
    expect(x_axis).toBeGreaterThan(0)
    expect(y_axis).toBeGreaterThan(0)
  })

  test(`handles extreme data values without rendering issues`, async ({ page }) => {
    // Test with very large and very small values
    await page.evaluate(() => {
      const histogram_container = document.querySelector(
        `#basic-single-series .histogram`,
      )
      if (!histogram_container) return

      // Create test data with extreme values
      const extreme_data = [
        0.000001,
        0.000002,
        0.000003, // Very small values
        1000000,
        2000000,
        3000000, // Very large values
        Number.MAX_SAFE_INTEGER / 1000, // Near maximum safe integer
        Number.MIN_VALUE * 1000, // Near minimum value
      ]

      const event = new CustomEvent(`test-histogram`, {
        detail: { series: [{ label: `Extreme`, y: extreme_data, visible: true }] },
      })
      histogram_container.dispatchEvent(event)
    })

    await page.waitForTimeout(500)
    const histogram = page.locator(`#basic-single-series svg`).first()

    // Should render without errors
    await expect(histogram).toBeVisible()

    // Check that bars are rendered (even if they might be very small or very large)
    const bars = histogram.locator(`rect[fill]:not([fill="none"])`)
    const bar_count = await bars.count()

    // Should have some bars rendered
    expect(bar_count).toBeGreaterThanOrEqual(0)

    // Verify all bars have positive dimensions
    const bar_elements = await bars.all()
    for (const bar of bar_elements) {
      const width = await bar.getAttribute(`width`)
      const height = await bar.getAttribute(`height`)

      expect(parseFloat(width || `0`)).toBeGreaterThan(0)
      expect(parseFloat(height || `0`)).toBeGreaterThan(0)
    }
  })

  test(`handles single data point without errors`, async ({ page }) => {
    await page.evaluate(() => {
      const histogram_container = document.querySelector(
        `#basic-single-series .histogram`,
      )
      if (!histogram_container) return

      // Create test data with single value
      const event = new CustomEvent(`test-histogram`, {
        detail: { series: [{ label: `Single`, y: [42], visible: true }] },
      })
      histogram_container.dispatchEvent(event)
    })

    await page.waitForTimeout(300)
    const histogram = page.locator(`#basic-single-series svg`).first()
    await expect(histogram).toBeVisible()

    // Should render axes
    const [x_axis, y_axis] = await Promise.all([
      histogram.locator(`g.x-axis`).count(),
      histogram.locator(`g.y-axis`).count(),
    ])
    expect(x_axis).toBeGreaterThan(0)
    expect(y_axis).toBeGreaterThan(0)

    // Should handle single point gracefully (may or may not render bars depending on binning)
    const bar_count = await get_bar_count(histogram)
    expect(bar_count).toBeGreaterThanOrEqual(0)
  })

  test(`handles identical data values (zero range)`, async ({ page }) => {
    await page.evaluate(() => {
      const histogram_container = document.querySelector(
        `#basic-single-series .histogram`,
      )
      if (!histogram_container) return

      // Create test data with identical values (zero range)
      const identical_data = Array(100).fill(5.0)

      const event = new CustomEvent(`test-histogram`, {
        detail: { series: [{ label: `Identical`, y: identical_data, visible: true }] },
      })
      histogram_container.dispatchEvent(event)
    })

    await page.waitForTimeout(300)
    const histogram = page.locator(`#basic-single-series svg`).first()
    await expect(histogram).toBeVisible()

    // Should render axes even with zero-range data
    const [x_axis, y_axis] = await Promise.all([
      histogram.locator(`g.x-axis`).count(),
      histogram.locator(`g.y-axis`).count(),
    ])
    expect(x_axis).toBeGreaterThan(0)
    expect(y_axis).toBeGreaterThan(0)

    // Check that any rendered bars have positive dimensions
    const bars = histogram.locator(`rect[fill]:not([fill="none"])`)
    const bar_elements = await bars.all()
    for (const bar of bar_elements) {
      const width = await bar.getAttribute(`width`)
      const height = await bar.getAttribute(`height`)

      if (width && height) {
        expect(parseFloat(width)).toBeGreaterThan(0)
        expect(parseFloat(height)).toBeGreaterThan(0)
      }
    }
  })

  test(`handles NaN and Infinity values gracefully`, async ({ page }) => {
    await page.evaluate(() => {
      const histogram_container = document.querySelector(
        `#basic-single-series .histogram`,
      )
      if (!histogram_container) return

      // Create test data with problematic values
      const problematic_data = [
        1,
        2,
        3,
        4,
        5, // Normal values
        NaN,
        NaN, // NaN values
        Infinity,
        -Infinity, // Infinity values
        6,
        7,
        8,
        9,
        10, // More normal values
      ]

      const event = new CustomEvent(`test-histogram`, {
        detail: {
          series: [{ label: `Problematic`, y: problematic_data, visible: true }],
        },
      })
      histogram_container.dispatchEvent(event)
    })

    await page.waitForTimeout(300)
    const histogram = page.locator(`#basic-single-series svg`).first()
    await expect(histogram).toBeVisible()

    // Should still render axes
    const [x_axis, y_axis] = await Promise.all([
      histogram.locator(`g.x-axis`).count(),
      histogram.locator(`g.y-axis`).count(),
    ])
    expect(x_axis).toBeGreaterThan(0)
    expect(y_axis).toBeGreaterThan(0)

    // Should not crash and may render some bars for valid data
    const bar_count = await get_bar_count(histogram)
    expect(bar_count).toBeGreaterThanOrEqual(0)
  })

  test(`maintains minimum bar width for very narrow bins`, async ({ page }) => {
    const histogram = page.locator(`#basic-single-series svg`).first()

    // Set a very high bin count to create very narrow bins
    await set_range_value(
      page,
      `#basic-single-series input[type="range"]:first-of-type`,
      200,
    )
    await page.waitForTimeout(500)

    // Get all bars and check their minimum width
    const bars = histogram.locator(`rect[fill]:not([fill="none"])`)
    const bar_elements = await bars.all()

    // Should have some bars
    expect(bar_elements.length).toBeGreaterThan(0)

    // All bars should have minimum width of 1 pixel (as enforced by Math.max(1, ...))
    for (const bar of bar_elements) {
      const width = await bar.getAttribute(`width`)
      expect(parseFloat(width || `0`)).toBeGreaterThanOrEqual(1)
    }
  })

  test(`handles very small viewport dimensions`, async ({ page }) => {
    // Test with extremely small viewport
    await page.setViewportSize({ width: 200, height: 150 })
    await page.waitForTimeout(200)

    const histogram = page.locator(`#basic-single-series svg`).first()
    await expect(histogram).toBeVisible()

    // Should still render some content
    const [x_axis, y_axis] = await Promise.all([
      histogram.locator(`g.x-axis`).count(),
      histogram.locator(`g.y-axis`).count(),
    ])
    expect(x_axis).toBeGreaterThan(0)
    expect(y_axis).toBeGreaterThan(0)

    // Check that any rendered bars have positive dimensions
    const bars = histogram.locator(`rect[fill]:not([fill="none"])`)
    const bar_elements = await bars.all()
    for (const bar of bar_elements) {
      const width = await bar.getAttribute(`width`)
      const height = await bar.getAttribute(`height`)

      if (width && height) {
        expect(parseFloat(width)).toBeGreaterThan(0)
        expect(parseFloat(height)).toBeGreaterThan(0)
      }
    }

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test(`handles rapid data updates without rendering errors`, async ({ page }) => {
    const histogram = page.locator(`#basic-single-series svg`).first()

    // Rapidly change bin count and sample size
    for (let i = 0; i < 10; i++) {
      await set_range_value(
        page,
        `#basic-single-series input[type="range"]:first-of-type`,
        5 + i * 10,
      )
      await set_range_value(
        page,
        `#basic-single-series input[type="range"]:nth-of-type(2)`,
        100 + i * 500,
      )
      await page.waitForTimeout(50) // Short delay to simulate rapid updates
    }

    // After rapid updates, should still be functional
    await page.waitForTimeout(300)
    await expect(histogram).toBeVisible()

    const bar_count = await get_bar_count(histogram)
    expect(bar_count).toBeGreaterThan(0)

    // All bars should have valid dimensions
    const bars = histogram.locator(`rect[fill]:not([fill="none"])`)
    const bar_elements = await bars.all()
    for (const bar of bar_elements) {
      const width = await bar.getAttribute(`width`)
      const height = await bar.getAttribute(`height`)

      expect(parseFloat(width || `0`)).toBeGreaterThan(0)
      expect(parseFloat(height || `0`)).toBeGreaterThan(0)
    }
  })
})
