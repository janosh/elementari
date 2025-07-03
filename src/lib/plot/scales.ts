import type { Point } from '$lib/plot'
import { extent, range } from 'd3-array'
import { scaleLinear, scaleLog, scaleTime } from 'd3-scale'

export type ScaleType = `linear` | `log`

// Constants
export const LOG_MIN_EPS = 1e-10

// Create a scale function based on type, domain, and range
export function create_scale(
  scale_type: ScaleType,
  domain: [number, number],
  range: [number, number],
) {
  const [min_val, max_val] = domain
  return scale_type === `log`
    ? scaleLog().domain([Math.max(min_val, LOG_MIN_EPS), max_val]).range(range)
    : scaleLinear().domain(domain).range(range)
}

// Create a time scale for time-based data
export function create_time_scale(
  domain: [number, number],
  range: [number, number],
) {
  return scaleTime()
    .domain([new Date(domain[0]), new Date(domain[1])])
    .range(range)
}

// Calculate domain from array of values (simple version)
export function calculate_domain(
  values: number[],
  scale_type: ScaleType = `linear`,
): [number, number] {
  const [min_val, max_val] = extent(values) as [number, number]
  if (min_val === undefined || max_val === undefined) return [0, 1]

  return scale_type === `log`
    ? [Math.max(min_val, LOG_MIN_EPS), max_val]
    : [min_val, max_val]
}

// Advanced domain calculation with padding and nice boundaries (from ScatterPlot)
export function get_nice_data_range(
  points: Point[],
  get_value: (p: Point) => number,
  lim: [number | null, number | null],
  scale_type: ScaleType,
  padding_factor: number,
  is_time = false,
): [number, number] {
  const [min_lim, max_lim] = lim
  const [min_ext, max_ext] = extent(points, get_value)
  let data_min = min_lim ?? min_ext ?? 0
  let data_max = max_lim ?? max_ext ?? 1

  // Apply padding *only if* limits were NOT provided
  if (min_lim === null && max_lim === null && points.length > 0) {
    if (data_min !== data_max) {
      // Apply percentage padding based on scale type if there's a range
      const span = data_max - data_min
      if (is_time) {
        const padding_ms = span * padding_factor
        data_min = data_min - padding_ms
        data_max = data_max + padding_ms
      } else if (scale_type === `log`) {
        const log_min = Math.log10(Math.max(data_min, LOG_MIN_EPS))
        const log_max = Math.log10(Math.max(data_max, LOG_MIN_EPS))
        const log_span = log_max - log_min
        data_min = Math.pow(10, log_min - log_span * padding_factor)
        data_max = Math.pow(10, log_max + log_span * padding_factor)
      } else {
        // Linear scale
        const padding_abs = span * padding_factor
        data_min = data_min - padding_abs
        data_max = data_max + padding_abs
      }
    } else {
      // Handle single data point case with fixed relative padding
      if (is_time) {
        const one_day = 86_400_000 // milliseconds in a day
        data_min = data_min - one_day
        data_max = data_max + one_day
      } else if (scale_type === `log`) {
        data_min = Math.max(LOG_MIN_EPS, data_min / 1.1) // 10% multiplicative padding
        data_max = data_max * 1.1
      } else {
        const padding_abs = data_min === 0 ? 1 : Math.abs(data_min * 0.1) // 10% additive padding, or 1 if value is 0
        data_min = data_min - padding_abs
        data_max = data_max + padding_abs
      }
    }
  }

  // If time or no range after padding, return the (potentially padded) domain directly
  if (is_time || data_min === data_max) return [data_min, data_max]

  // Use D3's nice() to create pretty boundaries
  // Create the scale with the *padded* data domain
  const scale = scale_type === `log`
    ? scaleLog().domain([
      Math.max(data_min, LOG_MIN_EPS),
      Math.max(data_max, data_min * 1.1),
    ]) // Ensure log domain > 0
    : scaleLinear().domain([data_min, data_max])

  scale.nice()
  return scale.domain() as [number, number]
}

// Generate logarithmic ticks (from ScatterPlot)
export function generate_log_ticks(
  min: number,
  max: number,
  ticks_option?: number | string | number[],
): number[] {
  // If ticks_option is already an array, use it directly
  if (Array.isArray(ticks_option)) return ticks_option
  min = Math.max(min, LOG_MIN_EPS)

  const min_power = Math.floor(Math.log10(min))
  const max_power = Math.ceil(Math.log10(max))

  // For very wide ranges, extend the range to include more ticks
  const range_size = max_power - min_power
  const extended_min_power = range_size <= 2
    ? min_power - 1
    : min_power - Math.max(1, Math.floor(range_size / 4))
  const extended_max_power = range_size <= 2 ? max_power + 1 : max_power

  const powers = range(extended_min_power, extended_max_power + 1).map((p: number) =>
    Math.pow(10, p)
  )

  // For narrow ranges, include intermediate values
  if (
    max_power - min_power < 3 &&
    typeof ticks_option === `number` &&
    ticks_option > 5
  ) {
    const detailed_ticks: number[] = []
    powers.forEach((power: number) => {
      detailed_ticks.push(power)
      if (power * 2 <= Math.pow(10, extended_max_power)) {
        detailed_ticks.push(power * 2)
      }
      if (power * 5 <= Math.pow(10, extended_max_power)) {
        detailed_ticks.push(power * 5)
      }
    })
    return detailed_ticks
  }

  return powers
}
