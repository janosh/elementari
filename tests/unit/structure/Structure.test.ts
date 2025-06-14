import type { Vector } from '$lib'
import { Structure } from '$lib'
import { euclidean_dist, pbc_dist } from '$lib/math'
import { structures } from '$site'
import { mount, tick } from 'svelte'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { doc_query } from '..'

const structure = structures[0]

// Skip tests that require WebGL context
describe.skip(`Structure`, () => {
  let struct: ReturnType<typeof mount>

  beforeEach(() => {
    struct = mount(Structure, {
      target: document.body,
      props: { structure },
    })
  })

  test(`open control panel when clicking toggle button`, async () => {
    expect(struct.$state.controls_open).toBe(false)
    doc_query(`button.controls-toggle`).click()
    await tick()
    expect(struct.$state.controls_open).toBe(true)
  })

  test(`JSON file download when clicking download button`, async () => {
    window.URL.createObjectURL = vi.fn()

    mount(Structure, {
      target: document.body,
      props: { structure },
    })

    const spy = vi.spyOn(document.body, `appendChild`)
    doc_query(`button.download-json`).click()

    expect(spy).toHaveBeenCalledWith(expect.any(HTMLAnchorElement))

    spy.mockRestore()
    // @ts-expect-error - function is mocked
    window.URL.createObjectURL.mockRestore()
  })

  test(`toggle fullscreen mode`, async () => {
    const requestFullscreenMock = vi.fn().mockResolvedValue(undefined)
    const exitFullscreenMock = vi.fn()

    struct.$nodes.wrapper = { requestFullscreen: requestFullscreenMock }
    document.exitFullscreen = exitFullscreenMock

    await struct.$state.toggle_fullscreen()
    expect(requestFullscreenMock).toHaveBeenCalledOnce()

    // Simulate fullscreen mode
    Object.defineProperty(document, `fullscreenElement`, {
      value: struct.$nodes.wrapper,
      configurable: true,
    })

    await struct.$state.toggle_fullscreen()
    expect(exitFullscreenMock).toHaveBeenCalledOnce()

    // Reset fullscreenElement
    Object.defineProperty(document, `fullscreenElement`, {
      value: null,
      configurable: true,
    })
  })
})

test(`pbc_dist with realistic structure scenarios`, () => {
  // Test with a simple cubic structure similar to CsCl (from mp-1.json)
  const cubic_lattice_matrix: [Vector, Vector, Vector] = [
    [6.256930122878799, 0.0, 0.0],
    [0.0, 6.256930122878799, 0.0],
    [0.0, 0.0, 6.256930122878799],
  ]

  // Two atoms: one at origin, one at (0.5, 0.5, 0.5) in fractional coordinates
  // which corresponds to center of unit cell in Cartesian
  const atom1_xyz: Vector = [0.0, 0.0, 0.0]
  const atom2_xyz: Vector = [
    3.1284650614394, 3.1284650614393996, 3.1284650614394,
  ]

  const direct_dist = euclidean_dist(atom1_xyz, atom2_xyz)
  const pbc_distance = pbc_dist(atom1_xyz, atom2_xyz, cubic_lattice_matrix)

  // For atoms at (0,0,0) and (0.5,0.5,0.5), the distance should be the same via PBC
  // since they're already at the shortest separation
  expect(pbc_distance).toBeCloseTo(direct_dist, 2)
  expect(pbc_distance).toBeCloseTo(5.419, 3) // expected distance

  // Test case 2: Create artificial scenario with atoms at opposite corners
  // Atom at (0.1, 0.1, 0.1) and (5.9, 5.9, 5.9) - very close to opposite corners
  const corner1: Vector = [0.1, 0.1, 0.1]
  const corner2: Vector = [
    6.156930122878799, 6.156930122878799, 6.156930122878799,
  ] // 0.9 fractional

  const corner_direct = euclidean_dist(corner1, corner2)
  const corner_pbc = pbc_dist(corner1, corner2, cubic_lattice_matrix)

  expect(corner_direct).toBeCloseTo(10.491, 3)
  expect(corner_pbc).toBeCloseTo(0.346, 3) // PBC distance should be sqrt(0.2^2 * 3)

  // Test case 3: Very long unit cell to test the issue user reported
  const long_cell_matrix: [Vector, Vector, Vector] = [
    [20.0, 0.0, 0.0], // Very long in x direction
    [0.0, 5.0, 0.0],
    [0.0, 0.0, 5.0],
  ]

  // Atoms at opposite ends of the long axis
  const long_atom1: Vector = [1.0, 2.5, 2.5] // close to x=0 side
  const long_atom2: Vector = [19.0, 2.5, 2.5] // close to x=20 side

  const long_direct = euclidean_dist(long_atom1, long_atom2)
  const long_pbc = pbc_dist(long_atom1, long_atom2, long_cell_matrix)

  expect(long_direct).toBeCloseTo(18.0, 3)
  expect(long_pbc).toBeCloseTo(2.0, 3) // PBC distance should be 2.0 Å (1.0 + 1.0 through boundary)
})
