/// <reference types="@sveltejs/kit" />

declare module '*periodic-table-data.ts' {
  const elements: import('./types').Element[]
  export default elements
}
