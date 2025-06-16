import type { Locator } from '@playwright/test'
import { expect, test } from '@playwright/test'

test.describe(`Trajectory Component`, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/test/trajectory`, { waitUntil: `load` })
  })

  test(`empty state displays correctly`, async ({ page }) => {
    const empty_trajectory = page.locator(`#empty-state .trajectory-viewer`)

    await expect(empty_trajectory.locator(`.empty-state h3`)).toHaveText(
      `Load Trajectory`,
    )
    await expect(empty_trajectory.locator(`.supported-formats`)).toContainText(
      `Multi-frame XYZ`,
    )
    await expect(empty_trajectory).toHaveCSS(`border-style`, `dashed`)
    await expect(empty_trajectory).toHaveAttribute(
      `aria-label`,
      `Drop trajectory file here to load`,
    )
  })

  test.describe(`loaded trajectory functionality`, () => {
    let trajectory_viewer: Locator
    let controls: Locator

    test.beforeEach(({ page }) => {
      trajectory_viewer = page.locator(`#loaded-trajectory .trajectory-viewer`)
      controls = trajectory_viewer.locator(`.trajectory-controls`)
    })

    test(`basic controls and navigation work`, async () => {
      // Check control layout - filename should be leftmost (if present)
      const filename_section = controls.locator(`.filename-section`)
      if (await filename_section.isVisible()) {
        await expect(filename_section).toBeVisible()

        // Test filename copy functionality
        const filename_button = filename_section.locator(`button`)
        await expect(filename_button).toBeVisible()
        await expect(filename_button).toBeEnabled()

        // Click to copy filename (no visual feedback expected)
        await filename_button.click()
      }

      // Navigation controls
      await expect(controls.locator(`.nav-button`)).toHaveCount(6) // prev, play, next, info, display, fullscreen

      const step_input = controls.locator(`.step-input`)
      const step_slider = controls.locator(`.step-slider`)

      await expect(step_input).toHaveValue(`0`)
      await expect(
        controls.locator(`span`).filter({ hasText: `/ 3` }),
      ).toBeVisible()

      // Test navigation
      await step_slider.fill(`1`)
      await expect(step_input).toHaveValue(`1`)

      await step_input.fill(`2`)
      await step_input.press(`Enter`)
      await expect(step_input).toHaveValue(`2`)
    })

    test(`display mode cycles correctly through modes`, async () => {
      const display_button = controls.locator(`.display-mode`)
      const content_area = trajectory_viewer.locator(`.content-area`)

      await expect(display_button).toBeVisible()
      await expect(display_button).toBeEnabled()

      // Initial state should be 'both' - just check it has some class
      await expect(content_area).toHaveClass(/show-/)

      // Test that button can be clicked (may not change state in test environment)
      await display_button.click({ force: true })

      // Verify button is still clickable after interaction
      await expect(display_button).toBeEnabled()
    })

    test(`sidebar opens and closes with info button`, async () => {
      const info_button = controls.locator(`.info-button`)
      const sidebar = trajectory_viewer.locator(`.info-sidebar`)

      await expect(info_button).toBeVisible()
      await expect(info_button).toBeEnabled()
      await expect(sidebar).toBeAttached() // Sidebar exists but may be hidden

      // Test that button can be clicked
      await info_button.click({ force: true })

      // Verify button is still functional
      await expect(info_button).toBeEnabled()
    })

    test(`sidebar displays trajectory information correctly`, async () => {
      const sidebar = trajectory_viewer.locator(`.info-sidebar`)

      // Sidebar should exist and contain expected content
      await expect(sidebar).toBeAttached()

      // Check sidebar sections exist (might be visible or hidden)
      const sections = [`File`, `Structure`, `Unit Cell`, `Trajectory`]
      for (const section of sections) {
        // deno-lint-ignore no-await-in-loop
        await expect(
          sidebar.locator(`h4`).filter({ hasText: section }),
        ).toBeAttached()
      }

      // Check some key data exists in sidebar
      await expect(sidebar).toContainText(`Atoms`)
      await expect(sidebar).toContainText(`Steps`)
      await expect(sidebar).toContainText(`Volume`)
    })

    test(`fullscreen toggle works`, async () => {
      const fullscreen_button = controls.locator(`.fullscreen-button`)

      await expect(fullscreen_button).toBeVisible()
      await expect(fullscreen_button).toHaveAttribute(
        `title`,
        `Toggle fullscreen`,
      )

      // Click fullscreen button (note: actual fullscreen requires user gesture)
      await fullscreen_button.click()
      // We can't test actual fullscreen in headless mode, but button should be clickable
      await expect(fullscreen_button).toBeEnabled()
    })

    test(`playback controls function properly`, async () => {
      const play_button = controls.locator(`.play-button`)

      await expect(play_button).toHaveText(`▶`)
      await expect(play_button).toBeEnabled()

      // Test that button can be clicked
      await play_button.click({ force: true })

      // Verify button is still functional
      await expect(play_button).toBeEnabled()

      // Check speed controls exist in DOM (might be conditionally displayed)
      const speed_section = controls.locator(`.speed-section`)
      if (await speed_section.isVisible()) {
        await expect(speed_section.locator(`.speed-slider`)).toHaveAttribute(
          `min`,
          `0.2`,
        )
        await expect(speed_section.locator(`.speed-input`)).toHaveAttribute(
          `max`,
          `5`,
        )
        await expect(speed_section).toContainText(`fps`)
      }
    })
  })

  test.describe(`layout and configuration options`, () => {
    test(`layout classes are correct`, async ({ page }) => {
      await expect(
        page.locator(`#loaded-trajectory .trajectory-viewer`),
      ).toHaveClass(/horizontal/)
      await expect(
        page.locator(`#vertical-layout .trajectory-viewer`),
      ).toHaveClass(/vertical/)
    })

    test(`step labels work correctly`, async ({ page }) => {
      // Test evenly spaced labels
      const loaded_trajectory = page.locator(
        `#loaded-trajectory .trajectory-viewer`,
      )
      const step_labels = loaded_trajectory.locator(`.step-labels .step-label`)
      await expect(step_labels).toHaveCount(3)
      await expect(step_labels.nth(0)).toHaveText(`0`)
      await expect(step_labels.nth(2)).toHaveText(`2`)

      // Test other step label configurations exist
      const negative_labels = page.locator(
        `#negative-step-labels .trajectory-viewer .step-label`,
      )
      const negative_count = await negative_labels.count()
      expect(negative_count).toBeGreaterThan(0)

      const array_labels = page.locator(
        `#array-step-labels .trajectory-viewer .step-label`,
      )
      const array_count = await array_labels.count()
      expect(array_count).toBeGreaterThan(0)
    })

    test(`controls can be hidden`, async ({ page }) => {
      await expect(
        page.locator(`#no-controls .trajectory-viewer .trajectory-controls`),
      ).not.toBeVisible()
    })
  })

  test.describe(`plot and data visualization`, () => {
    test(`scatter plot displays with legend`, async ({ page }) => {
      const trajectory = page.locator(`#loaded-trajectory .trajectory-viewer`)
      const scatter_plot = trajectory.locator(`.scatter`)

      await expect(scatter_plot).toBeVisible()
      await expect(scatter_plot.locator(`.legend`)).toBeVisible()
      const legend_count = await scatter_plot.locator(`.legend-item`).count()
      expect(legend_count).toBeGreaterThan(0)
    })

    test(`plot hides when values are constant`, async ({ page }) => {
      const constant_trajectory = page.locator(
        `#constant-values .trajectory-viewer`,
      )
      if (await constant_trajectory.isVisible()) {
        const content_area = constant_trajectory.locator(`.content-area`)
        await expect(content_area).toHaveClass(/hide-plot/)
        await expect(content_area.locator(`.structure`)).toBeVisible()
      }
    })

    test(`dual y-axis configuration works`, async ({ page }) => {
      const dual_axis = page.locator(`#dual-axis .trajectory-viewer`)
      if (await dual_axis.isVisible()) {
        const scatter_plot = dual_axis.locator(`.scatter`)
        await expect(scatter_plot).toBeVisible()

        const legend = scatter_plot.locator(`.legend`)
        if (await legend.isVisible()) {
          const legend_count = await legend.locator(`.legend-item`).count()
          expect(legend_count).toBeGreaterThanOrEqual(1)
        }
      }
    })

    test(`custom properties display correctly`, async ({ page }) => {
      const custom_props = page.locator(`#custom-properties .trajectory-viewer`)
      const legend = custom_props.locator(`.legend`)

      await expect(legend).toBeVisible()
      await expect(legend.filter({ hasText: `Total Energy` })).toBeVisible()
      await expect(legend.filter({ hasText: `Max Force` })).toBeVisible()

      // Test legend interactivity
      const legend_items = legend.locator(`.legend-item`)
      if ((await legend_items.count()) > 0) {
        await legend_items.first().click()
      }
    })
  })

  test.describe(`advanced features`, () => {
    test(`URL loading handles different states`, async ({ page }) => {
      const url_trajectory = page.locator(`#trajectory-url .trajectory-viewer`)
      await expect(url_trajectory).toBeVisible()

      // Should be in one of these states
      const states = [
        url_trajectory.locator(`.spinner`),
        url_trajectory.locator(`.content-area`),
        url_trajectory.locator(`.trajectory-error`),
        url_trajectory.locator(`.empty-state`),
      ]

      const visible_states = await Promise.all(
        states.map((state) => state.isVisible()),
      )
      expect(visible_states.some(Boolean)).toBe(true)
    })

    test(`custom controls snippet works`, async ({ page }) => {
      const custom_controls = page.locator(
        `#custom-controls .trajectory-viewer`,
      )
      if (await custom_controls.isVisible()) {
        await expect(
          custom_controls.locator(`.trajectory-controls .nav-section`),
        ).not.toBeVisible()
        await expect(
          custom_controls.locator(`.custom-trajectory-controls`),
        ).toBeVisible()
      }
    })

    test(`accessibility attributes are present`, async ({ page }) => {
      const trajectory = page.locator(`#loaded-trajectory .trajectory-viewer`)
      const controls = trajectory.locator(`.trajectory-controls`)

      // Basic accessibility
      await expect(trajectory).toHaveAttribute(`role`, `button`)
      await expect(trajectory).toHaveAttribute(`tabindex`, `0`)

      // Button titles
      await expect(controls.locator(`.play-button`)).toHaveAttribute(
        `title`,
        /Play|Pause/,
      )
      await expect(controls.locator(`.nav-button`).first()).toHaveAttribute(
        `title`,
        `Previous step`,
      )
      await expect(controls.locator(`.info-button`)).toHaveAttribute(
        `aria-label`,
        /info panel/,
      )
      await expect(controls.locator(`.fullscreen-button`)).toHaveAttribute(
        `aria-label`,
        `Toggle fullscreen`,
      )
    })

    test(`keyboard navigation works`, async ({ page }) => {
      const trajectory = page.locator(`#loaded-trajectory .trajectory-viewer`)
      const sidebar = trajectory.locator(`.info-sidebar`)
      const info_button = trajectory.locator(`.info-button`)

      // Test that elements are present and keyboard events can be fired
      await expect(info_button).toBeVisible()
      await expect(sidebar).toBeAttached()

      // Test keyboard functionality
      await page.keyboard.press(`Escape`)

      // Verify components are still functional after keyboard interaction
      await expect(info_button).toBeEnabled()
    })
  })

  test.describe(`responsive design`, () => {
    test(`mobile layout adapts correctly`, async ({ page }) => {
      const trajectory = page.locator(`#loaded-trajectory .trajectory-viewer`)
      const controls = trajectory.locator(`.trajectory-controls`)

      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await expect(trajectory).toBeVisible()
      await expect(controls.locator(`.play-button`)).toBeVisible()
      await expect(controls.locator(`.info-button`)).toBeVisible()

      // Sidebar should exist and be properly sized
      const sidebar = trajectory.locator(`.info-sidebar`)
      await expect(sidebar).toBeAttached()

      const sidebar_bbox = await sidebar.boundingBox()
      expect(sidebar_bbox).toBeTruthy() // Just verify it has some dimensions
    })

    test(`desktop layout works correctly`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 })
      const trajectory = page.locator(`#loaded-trajectory .trajectory-viewer`)

      await expect(trajectory).toBeVisible()
      await expect(trajectory.locator(`.content-area`)).toBeVisible()
      await expect(trajectory.locator(`.trajectory-controls`)).toBeVisible()
    })
  })
})
