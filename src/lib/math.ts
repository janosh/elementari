import type { LatticeParams } from '$lib/structure/index'

export type Vec3 = [number, number, number]
export type Matrix3x3 = [Vec3, Vec3, Vec3]
export type NdVector = number[]

// Calculate all lattice parameters in a single efficient pass
export function calc_lattice_params(
  matrix: Matrix3x3,
): LatticeParams & { volume: number } {
  const [a_vec, b_vec, c_vec] = matrix

  // Calculate vector lengths (lattice parameters a, b, c)
  const a = Math.sqrt(a_vec[0] ** 2 + a_vec[1] ** 2 + a_vec[2] ** 2)
  const b = Math.sqrt(b_vec[0] ** 2 + b_vec[1] ** 2 + b_vec[2] ** 2)
  const c = Math.sqrt(c_vec[0] ** 2 + c_vec[1] ** 2 + c_vec[2] ** 2)

  // Calculate volume using scalar triple product
  const volume = Math.abs(
    a_vec[0] * (b_vec[1] * c_vec[2] - b_vec[2] * c_vec[1]) +
      a_vec[1] * (b_vec[2] * c_vec[0] - b_vec[0] * c_vec[2]) +
      a_vec[2] * (b_vec[0] * c_vec[1] - b_vec[1] * c_vec[0]),
  )

  // Calculate dot products for angles (only once each)
  const dot_ab = a_vec[0] * b_vec[0] + a_vec[1] * b_vec[1] + a_vec[2] * b_vec[2]
  const dot_ac = a_vec[0] * c_vec[0] + a_vec[1] * c_vec[1] + a_vec[2] * c_vec[2]
  const dot_bc = b_vec[0] * c_vec[0] + b_vec[1] * c_vec[1] + b_vec[2] * c_vec[2]

  // Convert to angles in degrees
  const rad_to_deg = 180 / Math.PI
  const alpha = Math.acos(dot_bc / (b * c)) * rad_to_deg
  const beta = Math.acos(dot_ac / (a * c)) * rad_to_deg
  const gamma = Math.acos(dot_ab / (a * b)) * rad_to_deg

  return { a, b, c, alpha, beta, gamma, volume }
}

export function norm(vec: NdVector): number {
  return Math.sqrt(vec.reduce((acc, val) => acc + val ** 2, 0))
}

export function scale<T extends NdVector>(vec: T, factor: number): T {
  return vec.map((component) => component * factor) as T
}

export function euclidean_dist(vec1: Vec3, vec2: Vec3): number {
  return norm(add(vec1, scale(vec2, -1)))
}

// Calculate the minimum distance between two points considering periodic boundary conditions.
export function pbc_dist(
  pos1: Vec3, // First position vector (Cartesian coordinates)
  pos2: Vec3, // Second position vector (Cartesian coordinates)
  lattice_matrix: Matrix3x3, // 3x3 lattice matrix where each row is a lattice vector
  lattice_inv?: Matrix3x3, // Optional pre-computed inverse matrix for optimization (since lattice is usually constant and repeatedly inverting matrix is expensive)
): number {
  // Use provided inverse or compute it
  const inv_matrix = lattice_inv ?? matrix_inverse_3x3(lattice_matrix)

  // Convert Cartesian coordinates to fractional coordinates
  const frac1 = mat3x3_vec3_multiply(inv_matrix, pos1)
  const frac2 = mat3x3_vec3_multiply(inv_matrix, pos2)

  // Calculate fractional distance vector
  const frac_diff = add(frac1, scale(frac2, -1))

  // Apply minimum image convention: wrap to [-0.5, 0.5)
  const wrapped_frac_diff: Vec3 = frac_diff.map((x) => {
    // Wrap to [0, 1) first, then shift to [-0.5, 0.5)
    let wrapped = x - Math.floor(x)
    if (wrapped >= 0.5) wrapped -= 1
    return wrapped
  }) as Vec3

  // Convert back to Cartesian coordinates
  const cart_diff = mat3x3_vec3_multiply(lattice_matrix, wrapped_frac_diff)

  return norm(cart_diff)
}

export function matrix_inverse_3x3(matrix: Matrix3x3): Matrix3x3 {
  /** Calculate the inverse of a 3x3 matrix */
  const [[a, b, c], [d, e, f], [g, h, i]] = matrix

  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)

  if (Math.abs(det) < 1e-10) {
    throw `Matrix is singular and cannot be inverted`
  }

  const inv_det = 1 / det

  return [
    [
      (e * i - f * h) * inv_det,
      (c * h - b * i) * inv_det,
      (b * f - c * e) * inv_det,
    ],
    [
      (f * g - d * i) * inv_det,
      (a * i - c * g) * inv_det,
      (c * d - a * f) * inv_det,
    ],
    [
      (d * h - e * g) * inv_det,
      (b * g - a * h) * inv_det,
      (a * e - b * d) * inv_det,
    ],
  ]
}

// Multiply a 3x3 matrix by a 3D vector
export function mat3x3_vec3_multiply(matrix: Matrix3x3, vector: Vec3): Vec3 {
  const [a, b, c] = matrix
  const [x, y, z] = vector
  return [
    a[0] * x + a[1] * y + a[2] * z,
    b[0] * x + b[1] * y + b[2] * z,
    c[0] * x + c[1] * y + c[2] * z,
  ]
}

export function add<T extends NdVector>(...vecs: T[]): T {
  // add up any number of same-length vectors
  if (vecs.length === 0) {
    throw new Error(`Cannot add zero vectors`)
  }

  const first_vec = vecs[0]
  const length = first_vec.length

  // Validate all vectors have the same length
  for (const vec of vecs) {
    if (vec.length !== length) {
      throw `All vectors must have the same length`
    }
  }

  const result = new Array(length).fill(0)
  for (const vec of vecs) {
    for (let idx = 0; idx < length; idx++) {
      result[idx] += vec[idx]
    }
  }
  return result as T
}

export function dot(vec1: NdVector, vec2: NdVector): number | number[] | number[][] {
  // Handle the case where both inputs are scalars
  if (typeof vec1 === `number` && typeof vec2 === `number`) {
    return vec1 * vec2
  }

  // Handle the case where one input is a scalar and the other is a vector
  if (typeof vec1 === `number` && Array.isArray(vec2)) {
    throw `Scalar and vector multiplication is not supported`
  }
  if (Array.isArray(vec1) && typeof vec2 === `number`) {
    throw `vector and scalar multiplication is not supported`
  }

  // Handle the case where both inputs are vectors
  if (!Array.isArray(vec1[0]) && !Array.isArray(vec2[0])) {
    if (vec1.length !== vec2.length) {
      throw `Vectors must be of same length`
    }
    return vec1.reduce((sum, val, index) => sum + val * vec2[index], 0)
  }

  // Handle the case where the first input is a matrix and the second is a vector
  if (Array.isArray(vec1[0]) && !Array.isArray(vec2[0])) {
    const mat1 = vec1 as unknown as number[][]
    if (mat1[0].length !== vec2.length) {
      throw `Number of columns in matrix must be equal to number of elements in vector`
    }
    return mat1.map((row) => row.reduce((sum, val, index) => sum + val * vec2[index], 0))
  }

  // Handle the case where both inputs are matrices
  if (Array.isArray(vec1[0]) && Array.isArray(vec2[0])) {
    const mat1 = vec1 as unknown as number[][]
    const mat2 = vec2 as unknown as number[][]
    if (mat1[0].length !== mat2.length) {
      throw `Number of columns in first matrix must be equal to number of rows in second matrix`
    }
    return mat1.map((row, i) =>
      mat2[0].map((_, j) => row.reduce((sum, _, k) => sum + mat1[i][k] * mat2[k][j], 0))
    )
  }

  // Handle any other cases
  throw `Unsupported input dimensions. Inputs must be scalars, vectors, or matrices.`
}

// Conversion utilities for vectors and tensors below

// Convert 3x3 symmetric tensor to 6-element Voigt notation vector
// Voigt notation maps: (1,1)->1, (2,2)->2, (3,3)->3, (2,3)->4, (1,3)->5, (1,2)->6
export function to_voigt(tensor: number[][]): number[] {
  if (tensor.length !== 3 || !tensor.every((row) => row.length === 3)) {
    throw new Error(
      `Expected 3x3 tensor, got ${tensor.length}x${tensor[0]?.length ?? `n/a`}`,
    )
  }
  const [t11, t12, t13, _t21, t22, t23, _t31, _t32, t33] = tensor.flat()
  return [t11, t22, t33, t23, t13, t12]
}

// Convert 6-element Voigt notation vector to 3x3 symmetric tensor
export function from_voigt(voigt: number[]): number[][] {
  if (voigt.length !== 6) {
    throw new Error(`Expected 6-element Voigt vector, got ${voigt.length} elements`)
  }
  const [v1, v2, v3, v4, v5, v6] = voigt

  return [[v1, v6, v5], [v6, v2, v4], [v5, v4, v3]]
}

// Convert flat 9-element array to 3x3 tensor (row-major order)
export function vec9_to_mat3x3(flat_array: number[]): number[][] {
  if (flat_array.length !== 9) {
    throw new Error(`Expected 9-element array, got ${flat_array.length} elements`)
  }
  const [a1, a2, a3, a4, a5, a6, a7, a8, a9] = flat_array
  return [[a1, a2, a3], [a4, a5, a6], [a7, a8, a9]]
}

// Convert 3x3 tensor to flat 9-element array (row-major order)
export function tensor_to_flat_array(tensor: number[][]): number[] {
  if (tensor.length !== 3 || !tensor.every((row) => row.length === 3)) {
    throw new Error(
      `Expected 3x3 tensor, got ${tensor.length}x${tensor[0]?.length ?? `n/a`}`,
    )
  }

  const [t11, t12, t13, t21, t22, t23, t31, t32, t33] = tensor.flat()
  return [t11, t12, t13, t21, t22, t23, t31, t32, t33]
}

// Transpose a 3x3 matrix
export const transpose_matrix = (matrix: Matrix3x3): Matrix3x3 => [
  [matrix[0][0], matrix[1][0], matrix[2][0]],
  [matrix[0][1], matrix[1][1], matrix[2][1]],
  [matrix[0][2], matrix[1][2], matrix[2][2]],
]

// Convert unit cell parameters to lattice matrix (crystallographic convention)
export function cell_to_lattice_matrix(
  a: number,
  b: number,
  c: number,
  alpha: number,
  beta: number,
  gamma: number,
): Matrix3x3 {
  // Convert angles to radians
  const alpha_rad = (alpha * Math.PI) / 180
  const beta_rad = (beta * Math.PI) / 180
  const gamma_rad = (gamma * Math.PI) / 180

  const cos_alpha = Math.cos(alpha_rad)
  const cos_beta = Math.cos(beta_rad)
  const cos_gamma = Math.cos(gamma_rad)
  const sin_gamma = Math.sin(gamma_rad)

  // Calculate volume factor for triclinic system
  const vol_factor = Math.sqrt(
    1 -
      cos_alpha ** 2 -
      cos_beta ** 2 -
      cos_gamma ** 2 +
      2 * cos_alpha * cos_beta * cos_gamma,
  )

  // Standard crystallographic lattice vectors
  const c1 = c * cos_beta
  const c2 = (c * (cos_alpha - cos_beta * cos_gamma)) / sin_gamma
  const c3 = (c * vol_factor) / sin_gamma
  return [
    [a, 0, 0],
    [b * cos_gamma, b * sin_gamma, 0],
    [c1, c2, c3],
  ]
}
