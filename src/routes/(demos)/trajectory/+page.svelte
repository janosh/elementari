<script lang="ts">
  import { trajectory_labels } from '$lib/labels'
  import type { Trajectory } from '$lib/trajectory'
  import { TrajectoryViewer } from '$lib/trajectory'
  import { full_data_extractor } from '$lib/trajectory/extract'
  import { FileCarousel, type FileInfo } from '$site'

  let trajectories = $state<(Trajectory | undefined)[]>([undefined, undefined])
  let active_trajectory_files = $state<string[]>([])

  let default_trajectory_urls = $state([
    `/trajectories/pmg-LiMnO2-chgnet-relax.json.gz`, // Top viewer
    `/trajectories/XDATCAR-traj.gz`, // Bottom viewer
  ])

  // Load trajectory files from the trajectories directory
  // Load non-compressed files as raw text (excluding files that have compressed versions)
  const trajectory_files_raw = import.meta.glob(
    [`$site/trajectories/*.{traj}`, `$site/trajectories/pmg-*.json`],
    { eager: true, query: `?raw`, import: `default` },
  ) as Record<string, string>

  // Load compressed files as URLs (to be fetched and decompressed later)
  const trajectory_files_compressed = import.meta.glob(`$site/trajectories/*.gz`, {
    eager: true,
    query: `?url`,
    import: `default`,
  }) as Record<string, string>

  const get_file_type = (filename: string) =>
    filename.split(`.`).pop()?.toUpperCase() ?? `FILE`

  const format_filename = (filename: string) => {
    if (filename.length <= 15) return filename

    // Try to break at hyphens or underscores
    const parts: string[] = filename.split(/[-_]/)
    if (parts.length > 1) {
      const mid_point: number = Math.ceil(parts.length / 2)
      return parts.slice(0, mid_point).join(`-`) + `\n` + parts.slice(mid_point).join(`-`)
    }

    // Fallback: break in the middle
    const mid: number = Math.floor(filename.length / 2)
    return filename.slice(0, mid) + `\n` + filename.slice(mid)
  }

  // Helper function to load and decompress a compressed file
  async function load_compressed_file(url: string, filename: string): Promise<string> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`)
    }

    // Check if the server automatically decompressed the content
    const content_encoding = response.headers.get(`content-encoding`)

    if (content_encoding === `gzip`) {
      // Server sent compressed content, browser auto-decompressed it
      return await response.text()
    } else {
      // Server sent raw compressed bytes, we need to decompress manually
      const arrayBuffer = await response.arrayBuffer()

      // Import decompression utilities
      const { decompress_data, detect_compression_format } = await import(
        `$lib/io/decompress`
      )

      // Detect compression format from filename
      const format = detect_compression_format(filename)
      if (!format) {
        throw new Error(`Unsupported compression format: ${filename}`)
      }

      // Decompress the data
      return await decompress_data(arrayBuffer, format)
    }
  }

  // Create file objects from trajectory files and pre-load compressed ones
  let trajectory_files = $state<FileInfo[]>([])

  // Initialize files on component mount
  $effect(() => {
    const init_files = async () => {
      const files: FileInfo[] = []

      // Add non-compressed files
      for (const [path, content] of Object.entries(trajectory_files_raw)) {
        files.push({
          name: path.split(`/`).pop() as string,
          content: content,
          formatted_name: format_filename(path.split(`/`).pop() as string),
          type: get_file_type(path.split(`/`).pop() as string),
        })
      }

      // Add compressed files (load and decompress them)
      for (const [path, url] of Object.entries(trajectory_files_compressed)) {
        const filename = path.split(`/`).pop() as string
        try {
          const decompressed_content = await load_compressed_file(url, filename)
          files.push({
            name: filename,
            content: decompressed_content,
            formatted_name: format_filename(filename),
            type: get_file_type(filename),
          })
        } catch (error) {
          console.error(`Failed to load compressed file ${filename}:`, error)
          // Skip failed files instead of adding them with URL content
          // This prevents drag errors when the content is not valid JSON/trajectory data
        }
      }

      trajectory_files = files
    }

    init_files()
  })
</script>

<h1>Trajectory Viewer</h1>

<div class="dual-trajectory-container full-bleed">
  {#each trajectories as trajectory, idx (idx)}
    <TrajectoryViewer
      bind:trajectory={trajectories[idx]}
      trajectory_url={!trajectory ? default_trajectory_urls[idx] : undefined}
      data_extractor={full_data_extractor}
      layout="horizontal"
      property_labels={trajectory_labels}
      structure_props={{
        controls_open: false,
        show_full_controls: false,
        background_color: `#1a1a1a`,
        background_opacity: 0.8,
      }}
      plot_props={{
        x_label: `Step`,
        markers: `line+points`,
        legend: {
          responsive: true,
          layout: `horizontal`,
          layout_tracks: 2,
        },
        style: `background: var(--traj-plot-bg, #2d3748); color: var(--traj-plot-text, #e2e8f0);`,
      }}
      spinner_props={{
        style: `background: rgba(0, 0, 0, 0.1); color: white;`,
      }}
    />
  {/each}
</div>

<p style="margin: 2em auto;">
  Drag any of these trajectory files onto the second viewer above to load them:
</p>
<div class="trajectory-files-section">
  <FileCarousel
    files={trajectory_files}
    active_files={active_trajectory_files}
    show_structure_filters={false}
  />
</div>

<style>
  /* CSS Custom Properties for External Customization */
  :global(:root) {
    /* Dark theme colors for trajectory demo */
    --traj-bg: #1a202c;
    --traj-surface: #2d3748;
    --traj-surface-hover: #4a5568;
    --traj-border-bg: #4a5568;
    --traj-text: #e2e8f0;
    --traj-text-muted: #a0aec0;
    --traj-accent: #63b3ed;
    --traj-accent-hover: #4299e1;
    --traj-success: #68d391;
    --traj-warning: #fbd38d;
    --traj-error: #fc8181;
    --traj-plot-bg: #2d3748;
    --traj-plot-text: #e2e8f0;
  }

  h2 {
    text-align: center;
    margin-bottom: 2rem;
    color: var(--traj-text, #e2e8f0);
  }

  p {
    text-align: center;
    max-width: 800px;
    margin: 0 auto 2rem auto;
    color: var(--traj-text, #e2e8f0);
  }

  .dual-trajectory-container {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    min-height: 80vh;
  }

  .dual-trajectory-container :global(.trajectory-viewer) {
    height: 70vh;
    min-height: 500px;
    border: 1px solid var(--traj-border-bg, #4a5568);
    border-radius: 8px;
    background: var(--traj-surface, #2d3748);
  }

  .trajectory-files-section {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  /* Global trajectory styling for external customization */
  :global(.trajectory-viewer) {
    --trajectory-controls-bg: var(--traj-surface, #2d3748);
    --trajectory-button-bg: var(--traj-accent, #63b3ed);
    --trajectory-button-color: var(--traj-bg, #1a202c);
    --trajectory-button-hover-bg: var(--traj-accent-hover, #4299e1);
    --trajectory-panel-border: var(--traj-border-bg, #4a5568);
    --trajectory-info-bg: var(--traj-surface, rgba(45, 55, 72, 0.9));
    --trajectory-info-color: var(--traj-text, #e2e8f0);
    --trajectory-loading-bg: var(--traj-surface, rgba(45, 55, 72, 0.95));
    --trajectory-border: 1px solid var(--traj-border-bg, #4a5568);
    --trajectory-text-color: var(--traj-text, #e2e8f0);
    --trajectory-dropzone-border: var(--traj-border-bg, #4a5568);
    --trajectory-dropzone-bg: var(--traj-surface, #2d3748);
    --trajectory-dragover-border: var(--traj-accent, #63b3ed);
    --trajectory-dragover-bg: var(--traj-accent, rgba(99, 179, 237, 0.1));

    /* Dark theme overrides for error messages */
    --trajectory-error-bg: var(--traj-surface, #2d3748);
    --trajectory-error-color: var(--traj-error, #fc8181);
    --trajectory-error-border: var(--traj-error, #fc8181);
    --trajectory-error-button-bg: var(--traj-error, #fc8181);
    --trajectory-help-bg: var(--traj-bg, #1a202c);
    --trajectory-help-border: var(--traj-border-bg, #4a5568);
    --trajectory-code-bg: var(--traj-bg, #1a202c);
    --trajectory-code-border: var(--traj-border-bg, #4a5568);
    --trajectory-code-title-color: var(--traj-accent, #63b3ed);
    --trajectory-pre-bg: var(--traj-bg, #1a202c);
    --trajectory-pre-border: var(--traj-border-bg, #4a5568);
    --trajectory-inline-code-bg: var(--traj-border-bg, rgba(74, 85, 104, 0.3));
  }
</style>
