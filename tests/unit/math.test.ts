import type { NdVector, Vector } from '$lib'
import {
  add,
  calc_lattice_params,
  dot,
  euclidean_dist,
  norm,
  pbc_dist,
  scale,
} from '$lib'
import { expect, test } from 'vitest'

test(`norm of vector`, () => {
  expect(norm([3, 4])).toEqual(5)
})

test(`scale vector`, () => {
  expect(scale([1, 2, 3], 3)).toEqual([3, 6, 9])
})

test(`euclidean_dist between two vectors`, () => {
  expect(euclidean_dist([1, 2, 3], [4, 5, 6])).toEqual(Math.sqrt(27))
})

test.each([
  [[1, 2], [3, 4], [4, 6]],
  [[1, 2, 3], [4, 5, 6], [5, 7, 9]],
  [[1, 2, 3, 4, 5, 6], [7, 8, 9, 10, 11, 12], [8, 10, 12, 14, 16, 18]],
])(`add vectors`, (vec1, vec2, expected) => {
  expect(add(vec1, vec2)).toEqual(expected)
  expect(norm(add(vec1, vec2, scale(expected, -1)))).toEqual(0)
})

test.each([
  [[1, 2], [3, 4], 11],
  [[1, 2, 3], [4, 5, 6], 32],
])(`dot product`, (vec1, vec2, expected) => {
  expect(dot(vec1, vec2)).toEqual(expected)
})

test(`dot matrix operations`, () => {
  const matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]] as unknown as NdVector
  const vector: NdVector = [2, 3, 4]
  expect(dot(matrix, vector)).toEqual([20, 47, 74])

  const matrix1 = [[1, 2, 3], [4, 5, 6]] as unknown as NdVector
  const matrix2 = [[7, 8], [9, 10], [11, 12]] as unknown as NdVector
  expect(dot(matrix1, matrix2)).toEqual([[58, 64], [139, 154]])
})

test.each([
  // Cubic lattices
  [[[5, 0, 0], [0, 5, 0], [0, 0, 5]], {
    a: 5,
    b: 5,
    c: 5,
    alpha: 90,
    beta: 90,
    gamma: 90,
    volume: 125,
  }],
  [[[1, 0, 0], [0, 1, 0], [0, 0, 1]], {
    a: 1,
    b: 1,
    c: 1,
    alpha: 90,
    beta: 90,
    gamma: 90,
    volume: 1,
  }],
  // Tetragonal
  [[[3, 0, 0], [0, 3, 0], [0, 0, 6]], {
    a: 3,
    b: 3,
    c: 6,
    alpha: 90,
    beta: 90,
    gamma: 90,
    volume: 54,
  }],
  // Orthorhombic
  [[[4, 0, 0], [0, 5, 0], [0, 0, 6]], {
    a: 4,
    b: 5,
    c: 6,
    alpha: 90,
    beta: 90,
    gamma: 90,
    volume: 120,
  }],
  // Hexagonal (60° angle)
  [[[4, 0, 0], [2, 2 * Math.sqrt(3), 0], [0, 0, 8]], {
    a: 4,
    b: 4,
    c: 8,
    alpha: 90,
    beta: 90,
    gamma: 60,
    volume: 110.85,
  }],
  // Triclinic
  [[[3, 0, 0], [1, 2, 0], [0.5, 1, 2]], {
    a: 3,
    b: Math.sqrt(5),
    c: Math.sqrt(5.25),
    alpha: 60.79,
    beta: 77.40,
    gamma: 63.43,
    volume: 12,
  }],
])(`calc_lattice_params`, (matrix, expected) => {
  const result = calc_lattice_params(matrix as [Vector, Vector, Vector])
  expect(result.a).toBeCloseTo(expected.a, 2)
  expect(result.b).toBeCloseTo(expected.b, 2)
  expect(result.c).toBeCloseTo(expected.c, 2)
  expect(result.alpha).toBeCloseTo(expected.alpha, 1)
  expect(result.beta).toBeCloseTo(expected.beta, 1)
  expect(result.gamma).toBeCloseTo(expected.gamma, 1)
  expect(result.volume).toBeCloseTo(expected.volume, 1)
})

test(`pbc_dist`, () => {
  const cubic_lattice: [Vector, Vector, Vector] = [[10, 0, 0], [0, 10, 0], [0, 0, 10]]

  // Opposite corners via PBC
  expect(pbc_dist([1, 1, 1], [9, 9, 9], cubic_lattice)).toBeCloseTo(Math.sqrt(12), 3)
  expect(euclidean_dist([1, 1, 1], [9, 9, 9])).toBeCloseTo(13.856, 3)

  // Extreme PBC case
  expect(pbc_dist([0.5, 0.5, 0.5], [9.7, 9.7, 9.7], cubic_lattice)).toBeCloseTo(1.386, 3)

  // Close points
  const close_direct = euclidean_dist([2, 2, 2], [3, 3, 3])
  const close_pbc = pbc_dist([2, 2, 2], [3, 3, 3], cubic_lattice)
  expect(close_pbc).toBeCloseTo(close_direct, 5)
  expect(close_pbc).toBeCloseTo(1.732, 3)

  // 1D PBC
  expect(pbc_dist([0.5, 5, 5], [9.7, 5, 5], cubic_lattice)).toBeCloseTo(0.8, 5)

  // Hexagonal lattice
  const hex_lattice: [Vector, Vector, Vector] = [[4, 0, 0], [2, 3.464, 0], [0, 0, 8]]
  expect(euclidean_dist([0.2, 0.2, 1], [3.8, 3.264, 7])).toBeCloseTo(7.639, 3)
  expect(pbc_dist([0.2, 0.2, 1], [3.8, 3.264, 7], hex_lattice)).toBeCloseTo(2.3, 3)
})
