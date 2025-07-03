import {
  calculate_domain,
  create_scale,
  create_time_scale,
  generate_log_ticks,
  get_nice_data_range,
  LOG_MIN_EPS,
  type ScaleType,
} from '$lib/plot/scales'
import { describe, expect, test } from 'vitest'

describe(`scales utility functions`, () => {
  describe(`create_scale`, () => {
    test.each([
      [`linear`, [0, 100], [0, 500]],
      [`log`, [1, 1000], [0, 300]],
      [`log`, [0.1, 100], [50, 350]],
    ])(`creates %s scale correctly`, (scale_type, domain, range) => {
      const scale = create_scale(
        scale_type as ScaleType,
        domain as [number, number],
        range as [number, number],
      )

      expect(scale).toBeDefined()
      expect(scale.domain()).toEqual(
        scale_type === `log` ? [Math.max(domain[0], LOG_MIN_EPS), domain[1]] : domain,
      )
      expect(scale.range()).toEqual(range)
    })

    test(`handles log scale with negative domain minimum`, () => {
      const scale = create_scale(`log`, [-5, 100], [0, 500])
      expect(scale.domain()[0]).toBe(LOG_MIN_EPS)
      expect(scale.domain()[1]).toBe(100)
    })
  })

  describe(`create_time_scale`, () => {
    test(`creates time scale correctly`, () => {
      const timestamp1 = new Date(2023, 0, 1).getTime()
      const timestamp2 = new Date(2023, 11, 31).getTime()
      const scale = create_time_scale([timestamp1, timestamp2], [0, 500])

      expect(scale).toBeDefined()
      expect(scale.domain()).toEqual([new Date(timestamp1), new Date(timestamp2)])
      expect(scale.range()).toEqual([0, 500])
    })
  })

  describe(`calculate_domain`, () => {
    test.each([
      { values: [1, 2, 3, 4, 5], scale_type: `linear` as ScaleType, expected: [1, 5] },
      { values: [10, 100, 1000], scale_type: `log` as ScaleType, expected: [10, 1000] },
      { values: [0.001, 0.1, 1], scale_type: `log` as ScaleType, expected: [0.001, 1] },
      { values: [-5, 0, 5], scale_type: `log` as ScaleType, expected: [LOG_MIN_EPS, 5] },
      { values: [], scale_type: `linear` as ScaleType, expected: [0, 1] },
      { values: [42], scale_type: `linear` as ScaleType, expected: [42, 42] },
    ])(
      `calculates domain for $scale_type scale with $values`,
      ({ values, scale_type, expected }) => {
        const domain = calculate_domain(values, scale_type)
        if (scale_type === `log` && expected[0] === LOG_MIN_EPS) {
          expect(domain[0]).toBe(LOG_MIN_EPS)
          expect(domain[1]).toBe(expected[1])
        } else {
          expect(domain).toEqual(expected)
        }
      },
    )
  })

  describe(`get_nice_data_range`, () => {
    const sample_points = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 30 },
      { x: 4, y: 40 },
      { x: 5, y: 50 },
    ]

    test.each([
      {
        name: `no limits with linear scale`,
        points: sample_points,
        limits: [null, null],
        scale_type: `linear` as ScaleType,
        is_time: false,
        padding: 0.05,
        expected_min_less_than: 1,
        expected_max_greater_than: 5,
      },
      {
        name: `explicit limits`,
        points: sample_points,
        limits: [0, 10],
        scale_type: `linear` as ScaleType,
        is_time: false,
        padding: 0.05,
        expected_exact: [0, 10],
      },
      {
        name: `log scale with padding`,
        points: [{ x: 1, y: 10 }, { x: 10, y: 20 }, { x: 100, y: 30 }],
        limits: [null, null],
        scale_type: `log` as ScaleType,
        is_time: false,
        padding: 0.1,
        expected_min_less_than: 1,
        expected_max_greater_than: 100,
      },
      {
        name: `time scale with padding`,
        points: [
          { x: new Date(2023, 0, 1).getTime(), y: 10 },
          { x: new Date(2023, 5, 1).getTime(), y: 20 },
          { x: new Date(2023, 11, 1).getTime(), y: 30 },
        ],
        limits: [null, null],
        scale_type: `linear` as ScaleType,
        is_time: true,
        padding: 0.1,
        expected_min_less_than: new Date(2023, 0, 1).getTime(),
        expected_max_greater_than: new Date(2023, 11, 1).getTime(),
      },
      {
        name: `single point`,
        points: [{ x: 42, y: 100 }],
        limits: [null, null],
        scale_type: `linear` as ScaleType,
        is_time: false,
        padding: 0.1,
        expected_min_less_than: 42,
        expected_max_greater_than: 42,
      },
      {
        name: `empty array`,
        points: [],
        limits: [null, null],
        scale_type: `linear` as ScaleType,
        is_time: false,
        padding: 0.1,
        expected_exact: [0, 1],
      },
    ])(
      `calculates nice range for $name`,
      (
        {
          points,
          limits,
          scale_type,
          is_time,
          padding,
          expected_exact,
          expected_min_less_than,
          expected_max_greater_than,
        },
      ) => {
        const range = get_nice_data_range(
          points,
          (p) => p.x,
          limits as [number | null, number | null],
          scale_type,
          padding,
          is_time,
        )

        expect(range).toHaveLength(2)

        if (expected_exact) {
          expect(range).toEqual(expected_exact)
        } else {
          expect(range[0]).toBeLessThan(expected_min_less_than)
          expect(range[1]).toBeGreaterThan(expected_max_greater_than)
        }
      },
    )
  })

  describe(`generate_log_ticks`, () => {
    test.each([
      {
        name: `wide log range`,
        min: 0.1,
        max: 1000,
        ticks: 5,
        expected_contains: [0.1, 1, 10, 100, 1000],
      },
      {
        name: `narrow range with detailed ticks`,
        min: 1,
        max: 10,
        ticks: 8,
        expected_contains: [1, 2, 5, 10],
        expected_min_length: 5,
      },
      {
        name: `very small minimum values`,
        min: 1e-12,
        max: 1,
        ticks: 5,
        expected_contains: [1e-10, 1e-5, 1],
        expected_all_positive: true,
      },
      {
        name: `zero minimum with LOG_MIN_EPS`,
        min: 0,
        max: 10,
        ticks: 5,
        expected_min_value: 1e-12,
      },
    ])(
      `generates ticks for $name`,
      (
        {
          min,
          max,
          ticks,
          expected_contains,
          expected_min_length,
          expected_all_positive,
          expected_min_value,
        },
      ) => {
        const result = generate_log_ticks(min, max, ticks)

        expect(result).toBeInstanceOf(Array)
        expect(result.length).toBeGreaterThan(0)

        if (expected_contains) {
          for (const expected_tick of expected_contains) {
            expect(result).toContain(expected_tick)
          }
        }

        if (expected_min_length) {
          expect(result.length).toBeGreaterThan(expected_min_length)
        }

        if (expected_all_positive) {
          expect(result.every((tick) => tick > 0)).toBe(true)
        }

        if (expected_min_value !== undefined) {
          expect(result[0]).toBeGreaterThanOrEqual(expected_min_value)
        }
      },
    )

    test(`handles array input`, () => {
      const custom_ticks = [1, 5, 10, 50, 100]
      const ticks = generate_log_ticks(1, 100, custom_ticks)
      expect(ticks).toEqual(custom_ticks)
    })
  })
})
