import type { PymatgenStructure } from '$lib/index'

export const structures = Object.entries(
  import.meta.glob(`./*.json`, {
    eager: true,
    import: `default`,
  }) as Record<string, PymatgenStructure>,
)
  .map(([path, structure]) => {
    const id = path.split(`/`).at(-1)?.split(`.`)[0] as string
    structure.id = id
    return structure
  })
  .sort((struct1, struct2) => {
    const [n1, n2] = [struct1, struct2].map((struct) =>
      struct.id?.split(`-`)[1].padStart(6, `0`)
    )
    return n1?.localeCompare(n2 ?? ``) ?? 0
  })

export const structure_map = new Map(structures.map((struct) => [struct.id, struct]))
