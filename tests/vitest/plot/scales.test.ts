import * as math from '$lib/math'
import {
  calculate_domain,
  create_scale,
  create_time_scale,
  generate_log_ticks,
  get_nice_data_range,
  type ScaleType,
} from '$lib/plot/scales'
import { describe, expect, test } from 'vitest'

// Common test data
const sample_points = [
  { x: 1, y: 10 },
  { x: 2, y: 20 },
  { x: 3, y: 30 },
  { x: 4, y: 40 },
  { x: 5, y: 50 },
]

describe(`scales`, () => {
  describe(`create_scale`, () => {
    test.each([
      [`linear`, [0, 100], [0, 500]],
      [`log`, [1, 1000], [0, 300]],
      [`log`, [0.1, 100], [50, 350]],
    ])(`%s scale`, (scale_type, domain, range) => {
      const scale = create_scale(
        scale_type as ScaleType,
        domain as [number, number],
        range as [number, number],
      )

      expect(scale).toBeDefined()
      expect(scale.domain()).toEqual(
        scale_type === `log`
          ? [Math.max(domain[0], math.LOG_MIN_EPS), domain[1]]
          : domain,
      )
      expect(scale.range()).toEqual(range)
    })

    test(`log scale with negative domain`, () => {
      const scale = create_scale(`log`, [-5, 100], [0, 500])
      expect(scale.domain()).toEqual([math.LOG_MIN_EPS, 100])
    })
  })

  describe(`create_time_scale`, () => {
    test(`creates time scale`, () => {
      const [t1, t2] = [new Date(2023, 0, 1).getTime(), new Date(2023, 11, 31).getTime()]
      const scale = create_time_scale([t1, t2], [0, 500])
      expect(scale.domain()).toEqual([new Date(t1), new Date(t2)])
      expect(scale.range()).toEqual([0, 500])
    })
  })

  describe(`calculate_domain`, () => {
    test.each([
      [[1, 2, 3, 4, 5], `linear`, [1, 5]],
      [[10, 100, 1000], `log`, [10, 1000]],
      [[0.001, 0.1, 1], `log`, [0.001, 1]],
      [[-5, 0, 5], `log`, [math.LOG_MIN_EPS, 5]],
      [[], `linear`, [0, 1]],
      [[42], `linear`, [42, 42]],
    ])(`%s %s scale`, (values, scale_type, expected) => {
      const domain = calculate_domain(values, scale_type as ScaleType)
      if (scale_type === `log` && expected[0] === math.LOG_MIN_EPS) {
        expect(domain).toEqual([math.LOG_MIN_EPS, expected[1]])
      } else {
        expect(domain).toEqual(expected)
      }
    })
  })

  describe(`get_nice_data_range`, () => {
    test.each([
      {
        points: sample_points,
        limits: [null, null],
        scale_type: `linear`,
        is_time: false,
        padding: 0.05,
        check: (range: [number, number]) => {
          expect(range[0]).toBeLessThan(1)
          expect(range[1]).toBeGreaterThan(5)
        },
      },
      {
        points: sample_points,
        limits: [0, 10],
        scale_type: `linear`,
        is_time: false,
        padding: 0.05,
        check: (range: [number, number]) => expect(range).toEqual([0, 10]),
      },
      {
        points: [{ x: 1, y: 10 }, { x: 10, y: 20 }, { x: 100, y: 30 }],
        limits: [null, null],
        scale_type: `log`,
        is_time: false,
        padding: 0.1,
        check: (range: [number, number]) => {
          expect(range[0]).toBeLessThan(1)
          expect(range[1]).toBeGreaterThan(100)
        },
      },
      {
        points: [{ x: new Date(2023, 0, 1).getTime(), y: 10 }, {
          x: new Date(2023, 11, 1).getTime(),
          y: 30,
        }],
        limits: [null, null],
        scale_type: `linear`,
        is_time: true,
        padding: 0.1,
        check: (range: [number, number]) => {
          expect(range[0]).toBeLessThan(new Date(2023, 0, 1).getTime())
          expect(range[1]).toBeGreaterThan(new Date(2023, 11, 1).getTime())
        },
      },
      {
        points: [{ x: 42, y: 100 }],
        limits: [null, null],
        scale_type: `linear`,
        is_time: false,
        padding: 0.1,
        check: (range: [number, number]) => {
          expect(range[0]).toBeLessThan(42)
          expect(range[1]).toBeGreaterThan(42)
        },
      },
      {
        points: [],
        limits: [null, null],
        scale_type: `linear`,
        is_time: false,
        padding: 0.1,
        check: (range: [number, number]) => expect(range).toEqual([0, 1]),
      },
    ])(
      `nice range: $scale_type, $points.length points`,
      ({ points, limits, scale_type, is_time, padding, check }) => {
        const range = get_nice_data_range(
          points,
          (p) => p.x,
          limits as [number | null, number | null],
          scale_type as ScaleType,
          padding,
          is_time,
        )
        expect(range).toHaveLength(2)
        check(range)
      },
    )
  })

  describe(`generate_log_ticks`, () => {
    test.each([
      { min: 0.1, max: 1000, ticks: 5, contains: [0.1, 1, 10, 100, 1000] },
      { min: 1, max: 10, ticks: 8, contains: [1, 2, 5, 10] },
      { min: 1e-12, max: 1, ticks: 5, contains: [math.LOG_MIN_EPS, 1e-6, 1e-3, 1] },
      { min: 0.5, max: 5, ticks: 10, contains: [0.5, 1, 2, 5] },
      { min: 50, max: 500, ticks: 6, contains: [50, 100, 200, 500] },
    ])(`log ticks: $min to $max`, ({ min, max, ticks, contains }) => {
      const result = generate_log_ticks(min, max, ticks)
      expect(result.length).toBeGreaterThan(0)
      contains.forEach((val) => expect(result).toContain(val))
      // Log ticks may extend beyond the range for better tick placement
      expect(result.some((t) => t >= min && t <= max)).toBe(true)
    })

    test.each([
      [100],
      [1],
      [0.001],
    ])(`single value domain: %s`, (value) => {
      const result = generate_log_ticks(value, value, 5)
      expect(result).toContain(value)
      expect(result.length).toBeGreaterThan(0)
    })

    test(`negative values clamped`, () => {
      const result = generate_log_ticks(-10, 100, 5)
      expect(result.some((t) => t >= math.LOG_MIN_EPS)).toBe(true)
      expect(result).toContain(100)
    })
  })
})
