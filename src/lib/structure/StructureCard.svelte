<script lang="ts">
  import { format_num, InfoCard } from '$lib'
  import { electro_neg_formula, get_density, type PymatgenStructure } from './index'

  interface Props {
    structure: PymatgenStructure
    title?: string
    [key: string]: unknown
  }
  let { structure, title = `Structure`, ...rest }: Props = $props()

  let { volume, a, b, c, alpha, beta, gamma } = $derived(structure?.lattice ?? {})
</script>

<InfoCard
  data={[
    { title: `Formula`, value: electro_neg_formula(structure) },
    { title: `Number of atoms`, value: structure?.sites?.length, fmt: `.0f` },
    { title: `Volume`, value: volume, unit: `Å³` },
    {
      title: `Density`,
      value: format_num(get_density(structure), `.2f`),
      unit: `g/cm³`,
    },
    {
      title: `Lattice lengths a, b, c`,
      value: [a, b, c].map(format_num).join(`, `),
      unit: `Å`,
    },
    {
      title: `Lattice angles α, β, γ`,
      value: [alpha, beta, gamma].map(format_num).join(`°, `) + `°`,
    },
    // { title: 'Charge', value: structure?.charge },
  ]}
  {...rest}
  {title}
/>
