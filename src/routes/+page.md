<script>
  import { Structure } from '$lib'
  import { parse_structure_file } from '$lib/parsers'
  import { structures } from '$site'
  import TableDemo from './(demos)/periodic-table/+page.svelte'

  const structure_files_raw = import.meta.glob('$site/structures/*.{poscar,xyz}', {
    eager: true,
    query: '?raw',
    import: 'default',
  })

  let mp_id = `mp-756175`
  let structure = $derived(structures.find((struct) => struct.id === mp_id))

  const get_file_type = (filename) => filename.split('.').pop()?.toUpperCase() ?? 'FILE'

  const format_filename = (filename) => {
    if (filename.length <= 15) return filename

    // Try to break at hyphens or underscores
    const parts = filename.split(/[-_]/)
    if (parts.length > 1) {
      const mid_point = Math.ceil(parts.length / 2)
      return parts.slice(0, mid_point).join('-') + '\n' + parts.slice(mid_point).join('-')
    }

    // Fallback: break in the middle
    const mid = Math.floor(filename.length / 2)
    return filename.slice(0, mid) + '\n' + filename.slice(mid)
  }

  // Create file objects from glob imports and structures
  const sample_files = [
    // Non-JSON files from glob import
    ...Object.entries(structure_files_raw).map(([path, content]) => ({
      name: path.split('/').pop(),
      content: content
    })),
    // JSON files from structures import
    ...structures.map(s => ({
      name: `${s.id}.json`,
      content: JSON.stringify(s, null, 2)
    }))
  ].map(file => ({
    ...file,
    formatted_name: format_filename(file.name),
    type: get_file_type(file.name)
  }))

  let dragged_file_content = $state(``)
  let is_dragging = $state(false)
  let drag_target_element = $state(null)
  let last_loaded_file_content = $state(``)
  let last_loaded_filename = $state(``)

  // Set initial filename based on the default structure
  $effect(() => {
    if (structure?.id && !last_loaded_filename) {
      last_loaded_filename = `${structure.id}.json`
    }
  })

  // Show either dragged content, last loaded file content, or current structure content
  let displayed_content = $derived.by(() => {
    if (is_dragging && dragged_file_content) return dragged_file_content
    if (last_loaded_file_content) return last_loaded_file_content
    if (structure) return JSON.stringify(structure, null, 2)
    return `No structure loaded`
  })

  const handle_drag_start = (file, event) => {
    is_dragging = true
    dragged_file_content = file.content
    drag_target_element = event.target

    // Set drag data for our custom carousel format
    event.dataTransfer.setData(`text/plain`, file.content)
    event.dataTransfer.setData(
      `application/json`,
      JSON.stringify({ name: file.name, content: file.content, type: file.type })
    )
  }

  const handle_drag_end = () => {
    is_dragging = false
    dragged_file_content = ``
    drag_target_element = null
  }

  // Handle custom file drops including our carousel format
  const handle_structure_file_drop = (content, filename) => {
    try {
      // Check if this is from our file carousel (wrapped JSON format)
      if (content.includes('"name"') && content.includes('"content"') && content.includes('"type"')) {
        try {
          const file_info = JSON.parse(content)
          if (file_info.name && file_info.content && file_info.type) {
            // Extract the actual content and recurse
            return handle_structure_file_drop(file_info.content, file_info.name)
          }
        } catch {
          // Not our format, continue with normal parsing
        }
      }

      // Try to parse as JSON first
      try {
        const parsed_json = JSON.parse(content)
        structure = parsed_json
        last_loaded_file_content = content
        last_loaded_filename = filename
        return
      } catch {
        // Not JSON, try other formats
      }

      // Try to parse as structure file (POSCAR, XYZ, etc.)
      const parsed = parse_structure_file(content, filename)
      if (parsed) {
        // Convert ParsedStructure to the expected format
        const converted_structure = {
          sites: parsed.sites,
          charge: 0,
          ...(parsed.lattice && {
            lattice: {
              matrix: parsed.lattice.matrix,
              pbc: [true, true, true],
              a: parsed.lattice.a,
              b: parsed.lattice.b,
              c: parsed.lattice.c,
              alpha: 90, // Simplified - assumes orthogonal
              beta: 90,
              gamma: 90,
              volume: parsed.lattice.a * parsed.lattice.b * parsed.lattice.c,
            }
          })
        }

        structure = converted_structure
        last_loaded_file_content = content
        last_loaded_filename = filename
      } else {
        console.error(`Failed to parse structure file: ${filename}`)
        alert(`Failed to parse structure file. Supported formats: JSON, POSCAR, XYZ`)
      }
    } catch (error) {
      console.error(`Error processing file:`, error)
      alert(`Error processing file: ${error}`)
    }
  }
</script>

# Elementari

`elementari` is a toolkit for building interactive web UIs for materials science: periodic tables, 3d crystal structures (and molecules), Bohr atoms, nuclei, heatmaps, scatter plots. Check out some of the examples in the navigation bar above.

## Periodic Table

<TableDemo />

## Structure Viewer

The 3d structure viewer is built on the declarative [three.js](https://threejs.org) wrapper [`threlte`](https://threlte.xyz). It gets Svelte-compiled for great performance (even on supercells with 100+ atoms), is split up into `Bond`, `Lattice`, `Scene` and `Site` components for easy extensibility. You can pass various click, drag and touch event handlers for rich interactivity as well as inject custom HTML into tooltips using child components. This one shows the [Materials Project](https://materialsproject.org) structure for [{mp_id}](https://materialsproject.org/materials/{mp_id}) but you can select others below.

<Structure {structure} scene_props={{ auto_rotate: 0.5 }} on_file_drop={handle_structure_file_drop} />

## Try dragging files onto the structure viewer

Or drag a local `extXYZ`, `POSCAR` or `pymatgen` JSON files onto the structure viewer.

<div class="files-and-content">
  <div class="file-carousel">
    {#each sample_files as file}
      <div
        class="file-item"
        class:active={file.name === last_loaded_filename}
        draggable="true"
        ondragstart={(event) => handle_drag_start(file, event)}
        ondragend={handle_drag_end}
        role="button"
        tabindex="0"
        title="Drag this {file.type} file to the structure viewer"
      >
        <div class="drag-handle">
          <div class="drag-bar"></div>
          <div class="drag-bar"></div>
          <div class="drag-bar"></div>
        </div>
        <div class="file-name">{file.name}</div>
      </div>
    {/each}
  </div>

<textarea
    readonly
    value={displayed_content}
    placeholder="Structure content will appear here..."
    class="content-preview"
  />

</div>

<style>
  h1 {
    text-align: center;
    font-size: clamp(20pt, 5.5vw, 42pt);
  }
  h2 {
    text-align: center;
  }
  p {
    max-width: 40em;
    margin: 2em auto 3em;
    text-align: center;
  }
  .files-and-content {
    display: flex;
    gap: 2em;
    max-width: 1400px;
    margin: auto;
  }
  .file-carousel {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
    flex: 1;
  }
  .file-item {
    display: flex;
    align-items: center;
    padding: 4pt 8pt;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    cursor: grab;
    background: rgba(255, 255, 255, 0.1);
    transition: all 0.2s ease;
    gap: 0.5em;
  }
  .file-item:hover {
    border-color: #007acc;
    background: rgba(0, 122, 204, 0.2);
    transform: translateY(-1px);
  }
  .file-item.active {
    border-color: #00ff00;
    background: rgba(0, 255, 0, 0.15);
    box-shadow: 0 0 8px rgba(0, 255, 0, 0.3);
  }
  .file-item:active {
    cursor: grabbing;
  }
  .drag-handle {
    display: flex;
    flex-direction: column;
    gap: 2px;
    opacity: 0.6;
  }
  .drag-bar {
    width: 12px;
    height: 2px;
    background: currentColor;
    border-radius: 1px;
  }
  .file-name {
    font-size: 0.7em;
    line-height: 1.1;
  }
  textarea.content-preview {
    flex: 1;
    margin: 0;
    border-radius: 5pt;
    font-size: 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    resize: none;
    box-sizing: border-box;
    padding: 6pt 9pt;
  }

  @media (max-width: 768px) {
    .files-and-content {
      flex-direction: column;
      gap: 1rem;
      min-height: 400px;
    }
    .file-carousel {
      max-height: 200px;
      gap: 0.3rem;
    }
    .file-item {
      min-height: 32px;
      padding: 0.4rem 0.6rem;
      gap: 0.5rem;
    }
    .drag-handle {
      gap: 1px;
    }
    .drag-bar {
      width: 10px;
      height: 1.5px;
    }
    .file-name {
      font-size: 0.7rem;
      line-height: 1.1;
    }
  }
</style>
