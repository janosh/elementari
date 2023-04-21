<script>
  import struct_json from './mp-1234.json?raw'
</script>

## `Structure.svelte`

```svelte example stackblitz code_above
<script>
  import { Structure, alphabetical_formula } from '$lib'
  import structure from './mp-1234.json'

  const mp_id = 'mp-1234'
  const href = `https://materialsproject.org/materials/${mp_id}`
</script>

<h2>
  <a {href}>{mp_id}</a> ({alphabetical_formula(structure)})
</h2>

<Structure {structure} />
```

<details>
  <summary>JSON Structure for mp-1234</summary>
  <pre>
    <code>
    {struct_json}
    </code>
  </pre>
</details>

<style>

  h2 {
    text-align: center;
  }
</style>
