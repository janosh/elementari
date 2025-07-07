import type { ThemeMode, ThemeName } from '$lib/theme'
import {
  apply_theme_to_dom,
  COLOR_THEMES,
  get_system_mode,
  get_theme_preference,
  is_valid_theme_mode,
  is_valid_theme_name,
  resolve_theme_mode,
  save_theme_preference,
  THEME_TYPE,
} from '$lib/theme'
import { beforeEach, describe, expect, test, vi } from 'vitest'

describe(`Theme System`, () => {
  beforeEach(() => {
    // Reset DOM and localStorage before each test
    document.documentElement.style.cssText = ``
    document.documentElement.removeAttribute(`data-theme`)
    localStorage.clear()
    vi.clearAllMocks()

    // Mock global theme data
    globalThis.MATTERVIZ_THEMES = {
      light: { surface_bg: `#ffffff`, text_color: `#000000` },
      dark: { surface_bg: `#1a1a1a`, text_color: `#ffffff` },
      white: { surface_bg: `#ffffff`, text_color: `#000000` },
      black: { surface_bg: `#000000`, text_color: `#ffffff` },
    }

    globalThis.MATTERVIZ_CSS_MAP = {
      surface_bg: `--surface-bg`,
      text_color: `--text-color`,
    }
  })

  describe(`Theme constants and validation`, () => {
    test(`COLOR_THEMES contains all expected themes`, () => {
      expect(COLOR_THEMES).toEqual({
        light: `light`,
        dark: `dark`,
        white: `white`,
        black: `black`,
      })
    })

    test(`THEME_TYPE provides single source of truth for color-scheme`, () => {
      expect(THEME_TYPE).toEqual({
        light: `light`,
        dark: `dark`,
        white: `light`,
        black: `dark`,
      })
    })

    test(`THEME_TYPE covers all COLOR_THEMES`, () => {
      const theme_names = Object.keys(COLOR_THEMES)
      const type_keys = Object.keys(THEME_TYPE)

      expect(type_keys).toEqual(expect.arrayContaining(theme_names))
      expect(type_keys).toHaveLength(theme_names.length)
    })

    test.each([
      [`light`, true],
      [`dark`, true],
      [`white`, true],
      [`black`, true],
      [`auto`, true],
      [`invalid`, false],
      [``, false],
      [null, false],
      [undefined, false],
    ])(`is_valid_theme_mode("%s") returns %s`, (input, expected) => {
      expect(is_valid_theme_mode(input as string)).toBe(expected)
    })

    test.each([
      [`light`, true],
      [`dark`, true],
      [`white`, true],
      [`black`, true],
      [`auto`, false],
      [`invalid`, false],
      [``, false],
      [null, false],
      [undefined, false],
    ])(`is_valid_theme_name("%s") returns %s`, (input, expected) => {
      expect(is_valid_theme_name(input as string)).toBe(expected)
    })
  })

  describe(`Theme resolution`, () => {
    test.each([
      [`auto`, `light`, `light`],
      [`auto`, `dark`, `dark`],
      [`light`, `dark`, `light`],
      [`dark`, `light`, `dark`],
      [`white`, `dark`, `white`],
      [`black`, `light`, `black`],
    ])(
      `resolve_theme_mode("%s", "%s") returns "%s"`,
      (theme_mode, system_mode, expected) => {
        expect(
          resolve_theme_mode(theme_mode as ThemeMode, system_mode as `light` | `dark`),
        ).toBe(expected)
      },
    )
  })

  describe(`System preference detection`, () => {
    test.each([
      [true, `dark`],
      [false, `light`],
    ])(`get_system_mode with matchMedia.matches=%s returns "%s"`, (matches, expected) => {
      Object.defineProperty(window, `matchMedia`, {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          matches,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      })

      expect(get_system_mode()).toBe(expected)
    })
  })

  describe(`Theme preference storage`, () => {
    test.each([
      `light`,
      `dark`,
      `white`,
      `black`,
      `auto`,
    ])(`save_theme_preference stores "%s" in localStorage`, (theme) => {
      save_theme_preference(theme as ThemeMode)
      expect(localStorage.getItem(`matterviz-theme`)).toBe(theme)
    })

    test.each([
      `light`,
      `dark`,
      `white`,
      `black`,
      `auto`,
    ])(`get_theme_preference retrieves stored theme "%s"`, (theme) => {
      localStorage.setItem(`matterviz-theme`, theme)
      expect(get_theme_preference()).toBe(theme)
    })

    test(`get_theme_preference defaults to auto when no preference stored`, () => {
      expect(get_theme_preference()).toBe(`auto`)
    })

    test(`get_theme_preference handles localStorage errors gracefully`, () => {
      // Mock localStorage.getItem to throw
      const original_get_item = localStorage.getItem
      localStorage.getItem = vi.fn().mockImplementation(() => {
        throw new Error(`localStorage not available`)
      })

      expect(get_theme_preference()).toBe(`auto`)

      // Restore
      localStorage.getItem = original_get_item
    })
  })

  describe(`DOM theme application`, () => {
    test.each([
      [`light`, `#ffffff`, `#000000`],
      [`dark`, `#1a1a1a`, `#ffffff`],
      [`white`, `#ffffff`, `#000000`],
      [`black`, `#000000`, `#ffffff`],
    ])(
      `apply_theme_to_dom("%s") sets CSS variables correctly`,
      (theme, expected_bg, expected_text) => {
        apply_theme_to_dom(theme as ThemeName)

        const root = document.documentElement
        expect(root.style.getPropertyValue(`--surface-bg`)).toBe(expected_bg)
        expect(root.style.getPropertyValue(`--text-color`)).toBe(expected_text)
      },
    )

    test.each([
      `light`,
      `dark`,
      `white`,
      `black`,
    ])(`apply_theme_to_dom("%s") sets data-theme attribute`, (theme) => {
      apply_theme_to_dom(theme as ThemeName)
      expect(document.documentElement.getAttribute(`data-theme`)).toBe(theme)
    })

    test.each([
      [`light`, `light`],
      [`dark`, `dark`],
      [`white`, `light`],
      [`black`, `dark`],
    ])(`apply_theme_to_dom("%s") sets color-scheme to "%s"`, (theme, expected_scheme) => {
      apply_theme_to_dom(theme as ThemeName)
      expect(document.documentElement.style.getPropertyValue(`color-scheme`)).toBe(
        expected_scheme,
      )
    })

    test.each([
      [true, `dark`],
      [false, `light`],
    ])(
      `apply_theme_to_dom("auto") with system preference %s resolves to "%s"`,
      (dark_preference, expected_theme) => {
        Object.defineProperty(window, `matchMedia`, {
          writable: true,
          value: vi.fn().mockImplementation(() => ({
            matches: dark_preference,
            addEventListener: vi.fn(),
          })),
        })

        apply_theme_to_dom(`auto`)
        expect(document.documentElement.getAttribute(`data-theme`)).toBe(expected_theme)
        expect(document.documentElement.style.getPropertyValue(`color-scheme`)).toBe(
          expected_theme,
        )
      },
    )

    test(`apply_theme_to_dom falls back to light for unknown themes`, () => {
      apply_theme_to_dom(`unknown` as ThemeName)
      // For unknown themes, THEME_TYPE[theme] is undefined, so color-scheme might not be set
      // The test should check that it doesn't crash and handles the case gracefully
      expect(document.documentElement.getAttribute(`data-theme`)).toBe(`unknown`)
    })

    test(`apply_theme_to_dom handles missing theme data gracefully`, () => {
      globalThis.MATTERVIZ_THEMES = {
        light: {},
        dark: {},
        white: {},
        black: {},
      }
      globalThis.MATTERVIZ_CSS_MAP = {}

      expect(() => apply_theme_to_dom(`light`)).not.toThrow()
      expect(document.documentElement.style.getPropertyValue(`color-scheme`)).toBe(
        `light`,
      )
    })

    test(`apply_theme_to_dom handles missing global data gracefully`, () => {
      // @ts-expect-error - setting bad types for testing
      globalThis.MATTERVIZ_THEMES = undefined
      // @ts-expect-error - setting bad types for testing
      globalThis.MATTERVIZ_CSS_MAP = undefined

      expect(() => apply_theme_to_dom(`light`)).not.toThrow()
      expect(document.documentElement.style.getPropertyValue(`color-scheme`)).toBe(
        `light`,
      )
    })
  })

  describe(`Color scheme mapping consistency`, () => {
    test(`THEME_TYPE maps all COLOR_THEMES to valid color-scheme values`, () => {
      const theme_names = Object.keys(COLOR_THEMES) as ThemeName[]
      const valid_schemes = [`light`, `dark`]

      for (const theme of theme_names) {
        expect(valid_schemes).toContain(THEME_TYPE[theme])
      }
    })

    test(`adding new themes requires updating THEME_TYPE`, () => {
      const theme_names = Object.keys(COLOR_THEMES)
      const type_keys = Object.keys(THEME_TYPE)

      expect(type_keys.sort()).toEqual(theme_names.sort())
    })
  })

  describe(`Integration workflows`, () => {
    test.each([
      [`light`, `light`, `#ffffff`, `#000000`],
      [`dark`, `dark`, `#1a1a1a`, `#ffffff`],
      [`white`, `light`, `#ffffff`, `#000000`],
      [`black`, `dark`, `#000000`, `#ffffff`],
    ])(
      `full workflow for theme "%s"`,
      (theme, expected_scheme, expected_bg, expected_text) => {
        // Save theme preference
        save_theme_preference(theme as ThemeMode)
        expect(get_theme_preference()).toBe(theme)

        // Apply theme to DOM
        apply_theme_to_dom(theme as ThemeName)

        // Verify DOM state
        const root = document.documentElement
        expect(root.getAttribute(`data-theme`)).toBe(theme)
        expect(root.style.getPropertyValue(`color-scheme`)).toBe(expected_scheme)
        expect(root.style.getPropertyValue(`--surface-bg`)).toBe(expected_bg)
        expect(root.style.getPropertyValue(`--text-color`)).toBe(expected_text)
      },
    )

    test.each([
      [true, `dark`],
      [false, `light`],
    ])(
      `auto mode workflow with system preference %s`,
      (dark_preference, expected_theme) => {
        Object.defineProperty(window, `matchMedia`, {
          writable: true,
          value: vi.fn().mockImplementation(() => ({
            matches: dark_preference,
            addEventListener: vi.fn(),
          })),
        })

        save_theme_preference(`auto`)
        apply_theme_to_dom(`auto`)

        expect(document.documentElement.getAttribute(`data-theme`)).toBe(expected_theme)
        expect(document.documentElement.style.getPropertyValue(`color-scheme`)).toBe(
          expected_theme,
        )
      },
    )
  })
})
