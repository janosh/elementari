import type { PymatgenStructure } from '$lib/structure'
import type { BondingAlgo } from '$lib/structure/bonding'
import { max_dist, nearest_neighbor } from '$lib/structure/bonding'
import { performance } from 'perf_hooks'
import { describe, expect, test } from 'vitest'

const ci_max_time_multiplier = process.env.CI ? 5 : 1

// Function to generate a random structure
function make_rand_structure(numAtoms: number) {
  return {
    sites: Array.from({ length: numAtoms }, () => ({
      xyz: [Math.random() * 10, Math.random() * 10, Math.random() * 10],
    })),
  } as PymatgenStructure
}

// Updated performance test function
function perf_test(func: BondingAlgo, atom_count: number, max_time: number) {
  const run = () => {
    const structure = make_rand_structure(atom_count)
    const start = performance.now()
    func(structure)
    const end = performance.now()
    return end - start
  }

  const time1 = run()
  const time2 = run()
  const avg_time = (time1 + time2) / 2

  expect(
    avg_time,
    `average run time: ${Math.ceil(avg_time)}, max expected: ${max_time * ci_max_time_multiplier}`, // Apply scaling factor
  ).toBeLessThanOrEqual(max_time * ci_max_time_multiplier)
}

describe(`Bonding Functions Performance Tests`, () => {
  const bonding_functions = [
    {
      func: max_dist,
      max_times: [
        [10, 0.1],
        [100, 1],
        [1000, 40],
        [5000, 1000],
      ],
    },
    {
      func: nearest_neighbor,
      max_times: [
        [10, 0.2],
        [100, 3],
        [1000, 50],
        [5000, 1000],
      ],
    },
  ]

  for (const { func, max_times } of bonding_functions) {
    for (const [atom_count, max_time] of max_times) {
      test(`${func.name} performance for ${atom_count} atoms`, () => {
        perf_test(func, atom_count, max_time)
      })
    }
  }
})
