import type { IdStructure } from '../lib'

export { default as DemoNav } from './DemoNav.svelte'
export { default as Footer } from './Footer.svelte'

export const structures = Object.entries(
  import.meta.glob(`./structures/*.json`, {
    eager: true,
    import: `default`,
  }) as Record<string, IdStructure>,
)
  .map(([path, structure]) => {
    const id = path.split(`/`).at(-1)?.split(`.`)[0] as string
    structure.id = id
    return structure
  })
  .sort((struct1, struct2) => {
    const [n1, n2] = [struct1, struct2].map((struct) =>
      struct.id.split(`-`)[1].padStart(6, `0`),
    )
    return n1.localeCompare(n2)
  })
