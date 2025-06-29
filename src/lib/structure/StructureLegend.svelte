<script lang="ts">
  import type { CompositionType } from '$lib'
  import { choose_bw_for_contrast, element_data, format_num } from '$lib'
  import { default_element_colors } from '$lib/colors'
  import { colors } from '$lib/state.svelte'
  import type { Snippet } from 'svelte'
  import { Tooltip } from 'svelte-zoo'

  interface Props {
    elements: CompositionType
    elem_color_picker_title?: string
    labels?: HTMLLabelElement[]
    tips_modal?: HTMLDialogElement | undefined
    dialog_style?: string | null
    tips_modal_snippet?: Snippet
    amount_format?: string // Float formatting for element amounts (default: 3 significant digits)
    show_amounts?: boolean // Whether to show element amounts
    get_element_label?: (element: string, amount: number) => string // Custom label function
    [key: string]: unknown
  }
  let {
    elements,
    elem_color_picker_title = `Double click to reset color`,
    labels = $bindable([]),
    tips_modal = $bindable(undefined),
    dialog_style = null,
    tips_modal_snippet,
    amount_format = `.3~f`,
    show_amounts = true,
    get_element_label,
    ...rest
  }: Props = $props()

  // Generate label text for each element
  function get_label_text(element: string, amount: number): string {
    if (get_element_label) return get_element_label(element, amount)
    return show_amounts ? `${element}${format_num(amount, amount_format)}` : element
  }
</script>

<div class="structure-legend" {...rest}>
  {#each Object.entries(elements) as [elem, amt], idx (elem + amt)}
    <Tooltip
      text={element_data.find((el) => el.symbol == elem)?.name}
      --zoo-tooltip-bg="rgba(255, 255, 255, 0.3)"
      tip_style="font-size: initial; padding: 0 5pt;"
    >
      <label
        bind:this={labels[idx]}
        style:background-color={colors.element[elem]}
        ondblclick={(event) => {
          event.preventDefault()
          colors.element[elem] = default_element_colors[elem]
        }}
        style:color={choose_bw_for_contrast(labels[idx], null, 0.55)}
      >
        {get_label_text(elem, amt)}
        <input
          type="color"
          bind:value={colors.element[elem]}
          title={elem_color_picker_title}
        />
      </label>
    </Tooltip>
  {/each}
</div>

<dialog
  bind:this={tips_modal}
  onclick={() => tips_modal?.close()}
  onkeydown={() => tips_modal?.close()}
  style={dialog_style}
>
  {#if tips_modal_snippet}{@render tips_modal_snippet()}{:else}
    <p>
      Drop a POSCAR, XYZ, CIF or pymatgen JSON file onto the canvas to load a new
      structure.
    </p>
    <p>
      Click on an atom to make it active. Then hover another atom to get its distance to
      the active atom (with PBC and direct).
    </p>
    <p>
      Hold <kbd>shift</kbd> or <kbd>cmd</kbd> or <kbd>ctrl</kbd> and drag to pan the
      scene.
    </p>
    <p>
      Click on an element label in the color legend to change its color. Double click to
      reset.
    </p>
  {/if}
</dialog>

<style>
  .structure-legend {
    display: flex;
    position: absolute;
    bottom: var(--struct-legend-bottom, 8pt);
    right: var(--struct-legend-right, 8pt);
    gap: var(--struct-legend-gap, 8pt);
    font-size: var(--struct-legend-font, 14pt);
    filter: grayscale(10%) brightness(0.8) saturate(0.8);
    z-index: var(--struct-legend-z-index, 1);
    pointer-events: auto;
    visibility: visible;
  }
  .structure-legend label {
    padding: var(--struct-legend-pad, 1pt 4pt);
    border-radius: var(--struct-legend-radius, 3pt);
    position: relative;
    display: inline-block;
    cursor: pointer;
    visibility: visible;
  }
  .structure-legend label input[type='color'] {
    z-index: var(--struct-legend-input-z, 1);
    opacity: 0;
    position: absolute;
    visibility: hidden;
    top: 7pt;
    left: 0;
    cursor: pointer;
  }
  dialog {
    position: fixed;
    top: var(--struct-dialog-top, 50%);
    left: var(--struct-dialog-left, 50%);
    transform: translate(-50%, -50%);
    margin: 0;
    padding: var(--struct-dialog-pad, 4pt 1em);
    background: var(--struct-dialog-bg, rgba(0, 0, 0, 0.8));
    color: var(--struct-dialog-color, white);
    border-radius: var(--struct-dialog-radius, 5px);
    transition: var(--struct-dialog-transition, all 0.3s);
    overflow: visible;
  }
  /* info icon in top left corner */
  dialog::before {
    content: '?';
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    place-content: center;
    place-items: center;
    transform: var(--struct-tooltip-before-transform, translate(-50%, -50%));
    box-sizing: border-box;
    font-size: var(--struct-tooltip-before-font-size, 20pt);
    color: var(--struct-tooltip-before-color, white);
    background: var(--struct-tooltip-before-bg, rgba(0, 0, 0, 0.8));
    border-radius: var(--struct-tooltip-before-border-radius, 50%);
    width: var(--struct-tooltip-before-width, 1em);
    height: var(--struct-tooltip-before-height, 1em);
    border: var(--struct-tooltip-before-border, 1px solid white);
  }
  dialog::backdrop {
    background: var(--struct-dialog-backdrop, rgba(0, 0, 0, 0.2));
  }
  dialog p {
    margin: var(--struct-dialog-text-margin, 0);
  }
</style>
