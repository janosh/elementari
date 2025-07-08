<script lang="ts">
  import { Icon } from '$lib'
  import type { IconName } from '$lib/icons'
  import type { Snippet } from 'svelte'
  import { click_outside } from 'svelte-zoo'
  import type { HTMLAttributes } from 'svelte/elements'
  import { draggable } from './actions'

  interface Props {
    show?: boolean // Panel visibility
    show_panel?: boolean // Whether to show the panel at all
    children: Snippet<[]> // Panel content
    // Toggle button props
    show_toggle_button?: boolean // Whether the toggle button should be shown
    toggle_props?: HTMLAttributes<HTMLButtonElement> // Props for the toggle button
    open_icon?: IconName // Custom icon for open state
    closed_icon?: IconName // Custom icon for closed state
    icon_style?: string // Style for the icon
    // Panel styling and positioning
    position?: { top?: string; right?: string; left?: string; bottom?: string }
    max_width?: string
    panel_props?: HTMLAttributes<HTMLDivElement> // Props for the panel dialog
    // Callbacks
    onclose?: () => void
    on_drag_start?: () => void
    // DOM element refs
    toggle_panel_btn?: HTMLButtonElement
    panel_div?: HTMLDivElement
    has_been_dragged?: boolean
    currently_dragging?: boolean
  }
  let {
    show = $bindable(false),
    show_panel = true,
    children,
    show_toggle_button = true,
    toggle_props = {},
    open_icon = `Cross`,
    closed_icon = `Settings`,
    icon_style = ``,
    position = { top: `45px`, right: `-5em` },
    max_width = `450px`,
    panel_props = {},
    onclose = () => {},
    on_drag_start = () => {},
    toggle_panel_btn,
    panel_div,
    has_been_dragged = $bindable(false),
    currently_dragging = $bindable(false),
  }: Props = $props()

  function on_keydown(event: KeyboardEvent) {
    if (event.key === `Escape`) {
      event.preventDefault()
      show = false
      onclose()
    }
  }
  function toggle_panel() {
    show = !show
    if (!show) onclose()
  }
  function handle_drag_start() {
    has_been_dragged = true
    currently_dragging = true
    on_drag_start()
  }
  function handle_drag_end() {
    currently_dragging = false
  }
  function close_panel() {
    show = false
    onclose()
  }
</script>

<svelte:window onkeydown={on_keydown} />

{#if show_panel}
  {#if show_toggle_button}
    <button
      bind:this={toggle_panel_btn}
      onclick={toggle_panel}
      aria-expanded={show}
      aria-controls="draggable-panel"
      title={toggle_props.title ?? (show ? `Close panel` : `Open panel`)}
      {...toggle_props}
      class="panel-toggle {toggle_props.class ?? ``}"
    >
      <Icon icon={show ? open_icon : closed_icon} style={icon_style} />
    </button>
  {/if}

  <div
    use:click_outside={{
      callback: () => {
        if (show && !has_been_dragged && !currently_dragging) {
          show = false
          onclose()
        }
      },
    }}
    use:draggable={show
    ? {
      handle_selector: `.drag-handle`,
      on_drag_start: handle_drag_start,
      on_drag_end: handle_drag_end,
    }
    : { disabled: true }}
    bind:this={panel_div}
    role="dialog"
    aria-label="Draggable panel"
    aria-modal="false"
    style:max-width={max_width}
    style:top={position.top}
    style:right={position.right}
    style:left={position.left}
    style:bottom={position.bottom}
    style:display={show ? `grid` : `none`}
    {...panel_props}
    class="draggable-panel {show ? `panel-open` : ``} {panel_props.class ?? ``}"
  >
    {#if show}
      <Icon icon="DragIndicator" class="drag-handle" />
      {#if has_been_dragged}
        <button
          class="close-button"
          onclick={close_panel}
          title="Close panel"
          aria-label="Close panel"
          style="margin-right: 3pt"
        >
          <Icon icon="Cross" style="width: 1.25em; height: 1.25em" />
        </button>
      {/if}
      {@render children()}
    {/if}
  </div>
{/if}

<style>
  .panel-toggle {
    width: 30px;
    height: 30px;
    box-sizing: border-box;
    display: flex;
    place-items: center;
    padding: 4pt;
    border-radius: var(--panel-toggle-border-radius, 3pt);
  }
  .draggable-panel {
    position: absolute;
    background: var(--panel-bg, rgba(15, 23, 42, 0.95));
    border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.15));
    border-radius: 6px;
    padding: 5px 15px 15px;
    box-sizing: border-box;
    z-index: 10;
    display: grid;
    gap: 4pt;
    text-align: left;
    /* Exclude position properties from transitions to prevent sluggish dragging */
    transition: opacity 0.3s, background-color 0.3s, border-color 0.3s, box-shadow 0.3s;
    width: 28em;
    max-width: 90cqw;
    color: var(--panel-text-color, #eee);
    overflow: auto;
    max-height: calc(100vh - 3em);
    pointer-events: auto;
  }
  :global(body.fullscreen) .draggable-panel {
    top: 3.3em !important;
    right: 1em !important;
    left: auto !important;
  }
  /* Inherit all the panel styling */
  .draggable-panel :global(hr) {
    border: none;
    background: var(--panel-hr-bg, rgba(255, 255, 255, 0.1));
    margin: 0;
    height: 0.5px;
  }
  .draggable-panel :global(label) {
    display: flex;
    align-items: center;
    gap: 2pt;
  }
  .draggable-panel :global(input[type='range']) {
    margin-left: auto;
    width: 100px;
    flex-shrink: 0;
  }
  .draggable-panel :global(.slider-control input[type='range']) {
    margin-left: 0;
  }
  .draggable-panel :global(input[type='number']) {
    box-sizing: border-box;
    text-align: center;
    border-radius: 3pt;
    width: 2.2em;
    margin-right: 3pt;
    margin-left: 6pt;
    flex-shrink: 0;
  }
  .draggable-panel :global(input::-webkit-inner-spin-button) {
    display: none;
  }
  .draggable-panel :global(button) {
    width: max-content;
    background-color: var(--panel-btn-bg, rgba(255, 255, 255, 0.1));
  }
  .draggable-panel :global(button:hover) {
    background-color: var(--panel-btn-hover-bg, rgba(255, 255, 255, 0.2));
  }
  .draggable-panel :global(select) {
    margin: 0 0 0 5pt;
  }
  .draggable-panel :global(input[type='color']) {
    width: 40px;
    height: 16px;
    margin: 0 0 0 5pt;
    border: 1px solid rgba(255, 255, 255, 0.05);
    box-sizing: border-box;
  }
  .draggable-panel :global(.section-heading) {
    margin: 8pt 0 2pt;
    font-size: 0.9em;
  }
  .draggable-panel :global(.panel-row) {
    display: flex;
    gap: 4pt;
    align-items: flex-start;
  }
  .draggable-panel :global(.panel-row label) {
    min-width: 0;
  }
  .draggable-panel :global(.panel-row label.compact) {
    flex: 0 0 auto;
    margin-right: 8pt;
  }
  .draggable-panel :global(.panel-row label.slider-control) {
    flex: 1;
  }
  /* Drag handle styling */
  .draggable-panel :global(.drag-handle) {
    width: 1.3em;
    height: 1.3em;
    cursor: grab;
    position: absolute;
    top: 5px;
    right: 5px;
    border-radius: 3px;
    padding: 2px;
    box-sizing: border-box;
    /* Light mode - dark handle */
    color: rgba(0, 0, 0, 0.6);
    background-color: rgba(0, 0, 0, 0.1);
    z-index: 1;
  }
  /* Dark mode - light handle */
  :global([data-theme='dark']) .draggable-panel :global(.drag-handle),
  :global(.dark) .draggable-panel :global(.drag-handle) {
    color: rgba(255, 255, 255, 0.6);
    background-color: rgba(255, 255, 255, 0.1);
  }
  /* Ensure drag handle cursor changes properly */
  .draggable-panel :global(.drag-handle:active) {
    cursor: grabbing;
  }
  /* Close button styling */
  .draggable-panel .close-button {
    position: absolute;
    top: 5px;
    right: 30px; /* To the right of the drag handle */
    background: none;
    border: none;
    cursor: pointer;
    padding: 2px;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    z-index: 10;
    /* Light mode - dark button */
    color: rgba(0, 0, 0, 0.6);
    background-color: rgba(0, 0, 0, 0.1);
  }
  .draggable-panel .close-button:hover {
    /* Light mode - darker on hover */
    color: rgba(0, 0, 0, 0.8);
    background-color: rgba(0, 0, 0, 0.2);
  }
  /* Dark mode - light button */
  :global([data-theme='dark']) .draggable-panel .close-button,
  :global(.dark) .draggable-panel .close-button {
    color: rgba(255, 255, 255, 0.6);
    background-color: rgba(255, 255, 255, 0.1);
  }
  :global([data-theme='dark']) .draggable-panel .close-button:hover,
  :global(.dark) .draggable-panel .close-button:hover {
    color: rgba(255, 255, 255, 0.9);
    background-color: rgba(255, 255, 255, 0.2);
  }
</style>
