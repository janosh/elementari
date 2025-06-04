/// <reference types="@sveltejs/kit" />

import type { ElementColorScheme } from '$lib/colors'
import type { PymatgenStructure } from '$lib/structure'

declare module '$site/structures/mp-*.json' {
  export default PymatgenStructure
}

declare module './lib/data/*-colors.yml' {
  export default ElementColorScheme
}
