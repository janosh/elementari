<script lang="ts">
  import type { Atoms, BondPair, Site, Vector } from '$lib'
  import {
    Bond,
    Lattice,
    add,
    atomic_radii,
    euclidean_dist,
    pretty_num,
    scale,
  } from '$lib'
  import { selected } from '$lib/state.svelte'
  import { T } from '@threlte/core'
  import {
    Gizmo,
    HTML,
    InstancedMesh,
    OrbitControls,
    interactivity,
  } from '@threlte/extras'
  import type { ComponentProps } from 'svelte'
  import * as bonding_strategies from './bonding'

  // set to null to disable showing distance between hovered and active sites
  type ActiveHoveredDist = { color: string; width: number; opacity: number }

  // TODO bond_color_mode to be implemented
  export const bond_color_mode: `single` | `split-midpoint` | `gradient` = `single`
  interface Props {
    // output of pymatgen.core.Structure.as_dict()
    structure?: Atoms | undefined
    // scale factor for atomic radii
    atom_radius?: number
    // multiple of atom_radius (actually atom_radius * the element's atomic radius)
    // to use as distance for the site label(s) (multiple if site is disordered) from the site's center
    label_radius?: number
    // whether to use the same radius for all atoms. if not, the radius will be
    // determined by the atomic radius of the element
    same_size_atoms?: boolean
    // initial camera position from which to render the scene
    camera_position?: Vector
    // rotation damping factor (how quickly the rotation comes to rest after mouse release)
    rotation_damping?: number
    // zoom level of the camera
    max_zoom?: number | undefined
    min_zoom?: number | undefined
    // zoom speed. set to 0 to disable zooming.
    zoom_speed?: number
    // pan speed. set to 0 to disable panning.
    pan_speed?: number
    show_atoms?: boolean
    show_bonds?: boolean
    gizmo?: boolean | ComponentProps<typeof Gizmo>
    hovered_idx?: number | null
    active_idx?: number | null
    hovered_site?: Site | null
    active_site?: Site | null
    precision?: string
    auto_rotate?: number | boolean // auto rotate speed. set to 0 to disable auto rotation.
    bond_radius?: number | undefined
    bond_opacity?: number
    bond_color?: string // must be hex code for <input type='color'>
    bonding_strategy?: keyof typeof bonding_strategies
    bonding_options?: Record<string, unknown>
    active_hovered_dist?: ActiveHoveredDist | null
    fov?: number // field of view of the camera. 50 is THREE.js default
    ambient_light?: number
    directional_light?: number
    // number of segments in sphere geometry. higher is smoother but more
    // expensive to render (usually >16, <32)
    sphere_segments?: number
    lattice_props?: Omit<ComponentProps<typeof Lattice>, `matrix`>
  }

  let {
    structure = undefined,
    atom_radius = 0.5,
    label_radius = 1,
    same_size_atoms = true,
    camera_position = [12, 4, 2 * (structure?.lattice?.c ?? 5)],
    rotation_damping = 0.1,
    max_zoom = undefined,
    min_zoom = undefined,
    zoom_speed = 0.3,
    pan_speed = 1,
    show_atoms = true,
    show_bonds = true,
    gizmo = true,
    hovered_idx = $bindable(null),
    active_idx = $bindable(null),
    hovered_site = $bindable(null),
    active_site = $bindable(null),
    precision = `.3~f`,
    auto_rotate = 0,
    bond_radius = 0.05,
    bond_opacity = 0.5,
    bond_color = `#ffffff`,
    bonding_strategy = `nearest_neighbor`,
    bonding_options = {},
    active_hovered_dist = {
      color: `green`,
      width: 0.1,
      opacity: 0.5,
    },
    fov = 50,
    ambient_light = 1.8,
    directional_light = 2.5,
    sphere_segments = 20,
    lattice_props = {},
  }: Props = $props()

  let bond_pairs: BondPair[] = $state([])
  interactivity()
  $effect.pre(() => {
    hovered_site = structure?.sites?.[hovered_idx ?? -1] ?? null
  })
  $effect.pre(() => {
    active_site = structure?.sites?.[active_idx ?? -1] ?? null
  })
  $effect.pre(() => {
    if (structure?.sites && show_bonds) {
      bond_pairs = bonding_strategies[bonding_strategy](structure, bonding_options)
    }
  })

  // make bond thickness reactive to atom_radius unless bond_radius is set
  let bond_thickness = $derived(bond_radius ?? 0.05 * atom_radius)
  const gizmo_defaults: Partial<ComponentProps<typeof Gizmo>> = {
    horizontalPlacement: `left`,
    size: 100,
    paddingX: 10,
    paddingY: 10,
    toneMapped: true,
  } as const
</script>

<T.PerspectiveCamera makeDefault position={camera_position} {fov}>
  <!-- fix the ugly target -->
  <OrbitControls
    position={[0, 0, 0]}
    enableZoom={zoom_speed > 0}
    zoomSpeed={zoom_speed}
    enablePan={pan_speed > 0}
    panSpeed={pan_speed}
    target={structure?.lattice
      ? scale(add(...(structure?.lattice?.matrix ?? [])), 0.5)
      : [0, 0, 0]}
    maxZoom={max_zoom}
    minZoom={min_zoom}
    autoRotate={Boolean(auto_rotate)}
    autoRotateSpeed={auto_rotate}
    enableDamping={Boolean(rotation_damping)}
    dampingFactor={rotation_damping}
  />
</T.PerspectiveCamera>

{#if gizmo}
  <Gizmo {...{ ...gizmo_defaults, ...(typeof gizmo === `boolean` ? {} : gizmo) }} />
{/if}

<T.DirectionalLight position={[3, 10, 10]} intensity={directional_light} />
<T.AmbientLight intensity={ambient_light} />

{#if show_atoms && structure?.sites}
  {#each structure.sites as site, site_idx (`${site.abc}-${site.xyz}`)}
    {@const { species, xyz } = site}
    {#each species as { element: elem, occu }, spec_idx (`${elem}-${occu}`)}
      {@const radius = (same_size_atoms ? 1 : atomic_radii[elem]) * atom_radius}
      {@const start_angle = species
        .slice(0, spec_idx)
        .reduce((total, spec) => total + spec.occu, 0)}
      <T.Mesh position={xyz}>
        <T.SphereGeometry
          args={[
            0.5,
            sphere_segments,
            sphere_segments,
            2 * Math.PI * start_angle,
            2 * Math.PI * (start_angle + occu),
          ]}
        />
        <T.MeshStandardMaterial
          color={selected.element?.[elem]}
          onpointerenter={() => {
            hovered_idx = site_idx
          }}
          onpointerleave={() => {
            hovered_idx = null
          }}
          onclick={() => {
            if (active_idx == site_idx) active_idx = null
            else active_idx = site_idx
          }}
          scale={radius}
        />
      </T.Mesh>
      {#if structure}
        <!-- use polar coordinates + offset if site has partial occupancy to move the text to the side of the corresponding sphere slice -->
        {@const phi = 2 * Math.PI * (start_angle + occu / 2)}
        {@const pos = add(
          xyz,
          scale([Math.cos(phi), 0, Math.sin(phi)], label_radius * radius),
        )}
        <HTML center position={pos}>
          {#snippet atom_label({ elem })}
            {@render atom_label?.({ elem, xyz: pos, species })}
          {/snippet}
        </HTML>
      {/if}
    {/each}
  {/each}
{/if}

{#if show_bonds}
  <InstancedMesh>
    <T.CylinderGeometry args={[bond_thickness, bond_thickness, 1, 16]} />
    <T.MeshStandardMaterial opacity={bond_opacity} color={bond_color} />
    {#each bond_pairs as [from, to] (`${from}-${to}`)}
      <Bond {from} {to} radius={1} />
    {/each}
  </InstancedMesh>
{/if}

<!-- highlight active and hovered sites -->
{#each [{ site: hovered_site, opacity: 0.2 }, { site: active_site, opacity: 0.3 }] as { site, opacity } (opacity)}
  {#if site}
    {@const { xyz, species } = site}
    {@const elem = species[0].element}
    {@const radius = 1.1 * (same_size_atoms ? 1 : atomic_radii[elem]) * atom_radius}
    <T.Mesh position={xyz}>
      <T.SphereGeometry args={[radius, 20, 20]} />
      <T.MeshStandardMaterial color="white" transparent {opacity} />
    </T.Mesh>
  {/if}
{/each}

<!-- cylinder between active and hovered site to indicate measured distance -->
{#if active_site && hovered_site && active_hovered_dist}
  {@const { color, width, opacity } = active_hovered_dist}
  <InstancedMesh>
    <T.CylinderGeometry args={[width, width, 1, 16]} />
    <T.MeshStandardMaterial {opacity} {color} />
    <Bond from={active_site.xyz} to={hovered_site.xyz} radius={1} />
  </InstancedMesh>
{/if}

<!-- hovered site tooltip -->
{#if hovered_site}
  <HTML position={hovered_site.xyz} pointerEvents="none">
    <div class="tooltip">
      {#each hovered_site.species ?? [] as { element, occu, oxidation_state } (element + occu + oxidation_state)}
        {@const oxi_state =
          oxidation_state &&
          Math.abs(oxidation_state) + (oxidation_state > 0 ? `+` : `-`)}
        <strong>{element}{oxi_state ?? ``}</strong>
        {occu == 1 ? `` : `(occu=${occu})`}
      {/each}
      ({hovered_site.xyz.map((num) => pretty_num(num, precision)).join(`, `)})
      <!-- distance from hovered to active site -->
      <!-- TODO this doesn't handle periodic boundaries yet, so is currently grossly misleading -->
      {#if active_site && active_site != hovered_site && active_hovered_dist}
        {@const distance = euclidean_dist(hovered_site.xyz, active_site.xyz)}
        <br />
        dist={pretty_num(distance)} Å (no PBC yet)
      {/if}
    </div>
  </HTML>
{/if}

{#if structure?.lattice}
  <Lattice matrix={structure?.lattice?.matrix} {...lattice_props} />
{/if}

<style>
  div.tooltip {
    width: max-content;
    box-sizing: border-box;
    pointer-events: none;
    border-radius: var(--struct-tooltip-border-radius, 5pt);
    background: var(--struct-tooltip-bg, rgba(0, 0, 0, 0.5));
    padding: var(--struct-tooltip-padding, 1pt 5pt);
  }
</style>
