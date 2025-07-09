<script lang="ts">
  import { DraggablePanel, Icon } from '$lib'
  import { format_num } from '$lib/labels'
  import { theme_state } from '$lib/state.svelte'
  import { electro_neg_formula } from '$lib/structure'
  import { titles_as_tooltips } from 'svelte-zoo'
  import type { Trajectory } from './index'

  interface Props {
    trajectory: Trajectory
    current_step_idx: number
    current_filename?: string | null
    current_file_path?: string | null
    file_size?: number | null
    file_object?: File | null
    show_info?: boolean
  }
  let {
    trajectory,
    current_step_idx,
    current_filename,
    current_file_path,
    file_size,
    file_object,
    show_info = $bindable(true),
  }: Props = $props()

  let copied_items = $state<Set<string>>(new Set())

  async function copy_item(label: string, value: string, key: string) {
    try {
      await navigator.clipboard.writeText(`${label}: ${value}`)
      copied_items = new Set(copied_items).add(key)
      setTimeout(() => {
        copied_items.delete(key)
        copied_items = new Set(copied_items)
      }, 1000)
    } catch (error) {
      console.error(`Failed to copy to clipboard:`, error)
    }
  }

  // Helper to create info item
  function info_item(label: string, value: string, key: string, tooltip?: string) {
    return { label, value, key, tooltip }
  }

  // Get trajectory info organized by sections
  let info_sections = $derived.by(() => {
    if (!trajectory) return []

    const first_frame = trajectory.frames[0]
    const current_frame = trajectory.frames[current_step_idx]
    const sections = []

    // File info section
    const file_items = []
    if (current_filename) {
      file_items.push(
        info_item(
          `Name`,
          current_filename,
          `file-name`,
          current_file_path || undefined,
        ),
      )
    }
    if (file_size != null) {
      const size_str = file_size > 1024 * 1024
        ? `${format_num(file_size / (1024 * 1024), `.2~f`)} MB`
        : `${format_num(file_size / 1024, `.2~f`)} KB`
      file_items.push(info_item(`File Size`, size_str, `file-size`))
    }
    if (file_object) {
      file_items.push(
        info_item(
          `Modified`,
          new Date(file_object.lastModified).toLocaleString(),
          `file-modified`,
        ),
      )
    }
    if (trajectory.metadata?.source_format) {
      file_items.push(
        info_item(`Format`, String(trajectory.metadata.source_format), `file-format`),
      )
    }
    if (file_items.length > 0) sections.push(file_items)

    // Structure info section
    const structure_items = []
    structure_items.push(
      info_item(`Atoms`, `${current_frame.structure.sites.length}`, `atoms`),
    )
    structure_items.push(
      info_item(
        `Formula`,
        String(electro_neg_formula(current_frame.structure)),
        `formula`,
      ),
    )

    if (`lattice` in first_frame.structure) {
      const { volume, a, b, c, alpha, beta, gamma } = first_frame.structure.lattice
      structure_items.push(
        info_item(`Volume`, `${format_num(volume, `.3~s`)} Å³`, `volume`),
      )
      structure_items.push(
        info_item(
          `Density`,
          `${
            format_num(first_frame.structure.sites.length / volume, `.4~s`)
          } atoms/Å³`,
          `density`,
        ),
      )
      structure_items.push(
        info_item(
          `Cell Lengths`,
          `${format_num(a, `.3~f`)}, ${format_num(b, `.3~f`)}, ${
            format_num(c, `.3~f`)
          } Å`,
          `cell-lengths`,
        ),
      )
      structure_items.push(
        info_item(
          `Cell Angles`,
          `${format_num(alpha, `.2~f`)}°, ${format_num(beta, `.2~f`)}°, ${
            format_num(gamma, `.2~f`)
          }°`,
          `cell-angles`,
        ),
      )
    }
    sections.push(structure_items)

    // Trajectory info section
    const traj_items = []
    traj_items.push(
      info_item(
        `Steps`,
        `${trajectory.frames.length} (current: ${current_step_idx + 1})`,
        `steps`,
      ),
    )

    // Extract metadata arrays
    const times = trajectory.frames.map((f) => f.metadata?.time).filter((
      t,
    ): t is number => typeof t === `number`)
    const temps = trajectory.frames.map((f) => f.metadata?.temperature).filter((
      t,
    ): t is number => typeof t === `number`)
    const pressures = trajectory.frames.map((f) => f.metadata?.pressure).filter((
      p,
    ): p is number => typeof p === `number`)
    const energies = trajectory.frames.map((f) => f.metadata?.energy).filter((
      e,
    ): e is number => typeof e === `number`)
    const forces = trajectory.frames.map((f) => f.metadata?.force_max).filter((
      f,
    ): f is number => typeof f === `number`)

    // Add ranges/values for trajectory properties
    if (times.length > 1) {
      const duration = Math.max(...times) - Math.min(...times)
      const unit = trajectory.metadata?.time_unit || `fs`
      traj_items.push(
        info_item(`Duration`, `${format_num(duration, `.3~s`)} ${unit}`, `duration`),
      )
    }

    if (temps.length > 1) {
      const [min, max] = [Math.min(...temps), Math.max(...temps)]
      traj_items.push(
        info_item(
          `Temperature`,
          `${format_num(min, `.2~f`)} - ${format_num(max, `.2~f`)} K`,
          `temperature`,
        ),
      )
    } else if (temps.length === 1) {
      traj_items.push(
        info_item(`Temperature`, `${format_num(temps[0], `.2~f`)} K`, `temperature`),
      )
    }

    if (pressures.length > 1) {
      const [min, max] = [Math.min(...pressures), Math.max(...pressures)]
      if (Math.abs(max - min) > 0.1) {
        traj_items.push(
          info_item(
            `Pressure`,
            `${format_num(min, `.2~f`)} - ${format_num(max, `.2~f`)} GPa`,
            `pressure`,
          ),
        )
      }
    } else if (pressures.length === 1) {
      traj_items.push(
        info_item(`Pressure`, `${format_num(pressures[0], `.2~f`)} GPa`, `pressure`),
      )
    }
    sections.push(traj_items)

    // Energy info section
    if (energies.length > 1) {
      const energy_items = []
      const [min, max] = [Math.min(...energies), Math.max(...energies)]
      const current = current_frame.metadata?.energy as number | undefined
      if (current != null) {
        energy_items.push(
          info_item(
            `Current Energy`,
            `${format_num(current, `.3~s`)} eV`,
            `energy-current`,
          ),
        )
      }
      energy_items.push(
        info_item(
          `Energy Range`,
          `${format_num(min, `.3~s`)} to ${format_num(max, `.3~s`)} eV`,
          `energy-range`,
        ),
      )
      sections.push(energy_items)
    }

    // Forces info section
    if (forces.length > 1) {
      const force_items = []
      const [min, max] = [Math.min(...forces), Math.max(...forces)]
      const current = current_frame.metadata?.force_max as number | undefined
      if (current != null) {
        force_items.push(
          info_item(
            `Max Force`,
            `${format_num(current, `.3~s`)} eV/Å`,
            `force-current`,
          ),
        )
      }
      force_items.push(
        info_item(
          `Force Range`,
          `${format_num(min, `.3~s`)} - ${format_num(max, `.3~s`)} eV/Å`,
          `force-range`,
        ),
      )
      sections.push(force_items)
    }

    // Volume change section
    if (`lattice` in first_frame.structure && trajectory.frames.length > 1) {
      const volumes = trajectory.frames
        .map((f) => (`lattice` in f.structure ? f.structure.lattice.volume : null))
        .filter((v): v is number => v !== null)

      if (volumes.length > 1) {
        const vol_change =
          ((Math.max(...volumes) - Math.min(...volumes)) / Math.min(...volumes)) * 100
        if (Math.abs(vol_change) > 0.1) {
          sections.push([
            info_item(
              `Volume Change`,
              `${format_num(vol_change, `.2~f`)}%`,
              `vol-change`,
            ),
          ])
        }
      }
    }

    return sections
  })
</script>

{#if show_info}
  <DraggablePanel
    max_width="24em"
    toggle_props={{ class: `trajectory-info-toggle`, title: `Toggle trajectory info` }}
    open_icon="Cross"
    closed_icon="Info"
    icon_style="transform: scale(1.3);"
    panel_props={{
      class: `trajectory-info-panel`,
      style: `box-shadow: 0 5px 10px rgba(0, 0, 0, ${
        theme_state.type === `dark` ? `0.5` : `0.1`
      }); max-height: 80vh;`,
    }}
  >
    <div class="info-content">
      <h4>Trajectory Info</h4>
      {#each info_sections as section, section_idx (section_idx)}
        {#if section.length > 0}
          {#if section_idx > 0}
            <hr class="section-divider" />
          {/if}
          {#each section as item (item.key)}
            <div
              class="info-item"
              title="Click to copy: {item.label}: {item.value}"
              onclick={() => copy_item(item.label, item.value, item.key)}
              role="button"
              tabindex="0"
              onkeydown={(event) => {
                if (event.key === `Enter` || event.key === ` `) {
                  event.preventDefault()
                  copy_item(item.label, item.value, item.key)
                }
              }}
            >
              <span>{item.label}</span>
              <span title={item.tooltip} use:titles_as_tooltips>{@html item.value}</span>
              {#if copied_items.has(item.key)}
                <div class="copy-check">
                  <Icon
                    icon="Check"
                    style="color: var(--success-color, #10b981); width: 12px; height: 12px"
                  />
                </div>
              {/if}
            </div>
          {/each}
        {/if}
      {/each}
    </div>
  </DraggablePanel>
{/if}

<style>
  .info-content {
    padding-top: 8pt;
  }
  h4 {
    margin: 8pt 0 6pt;
    font-size: 0.9em;
    color: var(--text-muted, #ccc);
  }
  .section-title {
    margin: 12pt 0 6pt;
    font-size: 0.8em;
    color: var(--text-muted, #ccc);
    font-weight: 500;
  }
  .section-divider {
    margin: 12pt 0;
    border: none;
    border-top: 1px solid var(--border-color, #444);
  }
  .info-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6pt;
    padding: 1pt 0;
    margin-bottom: 1pt;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
  }
  .info-item:hover {
    background: var(--panel-btn-hover-bg, rgba(255, 255, 255, 0.03));
    padding-left: 3pt;
    padding-right: 3pt;
  }
  .info-item span:first-child {
    font-size: 0.85em;
    font-weight: 500;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .info-item span:last-child {
    font-size: 0.8em;
    font-weight: 500;
    text-align: right;
    flex-shrink: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .copy-check {
    position: absolute;
    top: 50%;
    right: 3pt;
    transform: translateY(-50%);
    background: var(--panel-bg, rgba(0, 0, 0, 0.9));
    border-radius: 50%;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: appear 0.1s ease-out;
  }
  @keyframes appear {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
