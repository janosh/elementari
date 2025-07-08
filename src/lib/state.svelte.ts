import type { Category, ChemicalElement } from '$lib'
import { AUTO_THEME, COLOR_THEMES, THEME_TYPE } from '$lib/theme/index'
import { default_category_colors, default_element_colors } from './colors'
import { type Tooltip } from './plot'
import { type ThemeMode } from './theme'

export const selected = $state<{
  category: Category | null
  element: ChemicalElement | null
  last_element: ChemicalElement | null
  heatmap_key: keyof ChemicalElement | null
}>({
  category: null,
  element: null,
  last_element: null,
  heatmap_key: null,
})

export const colors = $state<{
  category: typeof default_category_colors
  element: typeof default_element_colors
}>({
  category: { ...default_category_colors },
  element: { ...default_element_colors },
})

export const tooltip = $state<Tooltip>({
  show: false,
  x: 0,
  y: 0,
  title: ``,
  items: [],
})

export const periodic_table_state = $state({
  show_bonding_info: false,
  show_oxidation_state: false,
  highlighted_elements: [] as string[],
})

// Theme state with safe initialization
let initial_theme_mode: ThemeMode = AUTO_THEME
let initial_system_mode: typeof COLOR_THEMES.light | typeof COLOR_THEMES.dark =
  COLOR_THEMES.light

// Safe theme initialization for test environments
try {
  if (typeof window !== `undefined` && globalThis.localStorage) {
    initial_theme_mode = (localStorage.getItem(`matterviz-theme`) as ThemeMode) ||
      AUTO_THEME
  } else {
    initial_theme_mode = AUTO_THEME
    initial_system_mode = COLOR_THEMES.light
  }
} catch {
  // Fallback for test environments or when localStorage is not available
}

export const theme_state = $state<
  {
    mode: ThemeMode
    system_mode: typeof COLOR_THEMES.light | typeof COLOR_THEMES.dark
    type: `light` | `dark`
  }
>({
  mode: initial_theme_mode,
  system_mode: initial_system_mode,
  get type() {
    // For AUTO_THEME, use system_mode, otherwise lookup the mode in THEME_TYPE
    const effective_mode = this.mode === AUTO_THEME ? this.system_mode : this.mode
    return THEME_TYPE[effective_mode as keyof typeof THEME_TYPE]
  },
})
