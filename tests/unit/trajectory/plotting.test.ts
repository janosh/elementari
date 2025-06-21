import type { ElementSymbol, Vec3 } from '$lib'
import type { DataSeries } from '$lib/plot'
import type { Trajectory, TrajectoryFrame } from '$lib/trajectory'
import {
  generate_axis_labels,
  generate_plot_series,
  should_hide_plot,
} from '$lib/trajectory/plotting'
import { describe, expect, it } from 'vitest'

// Helper to create a simple trajectory with metadata properties
function create_trajectory(property_frames: Record<string, number>[]): Trajectory {
  return {
    frames: property_frames.map((props, step) => ({
      structure: {
        sites: [{
          species: [{ element: `H` as ElementSymbol, occu: 1, oxidation_state: 0 }],
          abc: [0, 0, 0] as Vec3,
          xyz: [0, 0, 0] as Vec3,
          label: `H1`,
          properties: {},
        }],
        charge: 0,
      },
      step,
      metadata: props,
    })),
  }
}

// Simple test data extractor
function test_extractor(frame: TrajectoryFrame): Record<string, number> {
  const data: Record<string, number> = { Step: frame.step }
  if (frame.metadata) {
    for (const [key, value] of Object.entries(frame.metadata)) {
      if (typeof value === `number`) data[key] = value
    }
  }
  return data
}

// Helper to create a mock series for should_hide_plot tests
function create_series(y_values: number[], visible = true, label = `Test`): DataSeries {
  return {
    x: y_values.map((_, idx) => idx),
    y: y_values,
    label,
    visible,
    y_axis: `y1` as const,
    markers: `line` as const,
    metadata: [],
    line_style: { stroke: `blue`, stroke_width: 2 },
    point_style: { fill: `blue`, radius: 4, stroke: `blue`, stroke_width: 1 },
  }
}

describe(`generate_plot_series`, () => {
  describe(`basic functionality`, () => {
    it(`should generate series for varying properties`, () => {
      const trajectory = create_trajectory([
        { energy: -10.0 },
        { energy: -10.5 },
        { energy: -11.0 },
      ])

      const series = generate_plot_series(trajectory, test_extractor)

      expect(series).toHaveLength(1)
      expect(series[0]).toMatchObject({
        label: `Energy`,
        y: [-10.0, -10.5, -11.0],
        x: [0, 1, 2],
        visible: true,
      })
    })

    it.each([
      { name: `empty trajectory`, frames: [], expected_length: 0 },
      { name: `single frame`, frames: [{ energy: -10.0 }], expected_length: 0 },
    ])(`should handle $name`, ({ frames, expected_length }) => {
      const trajectory = create_trajectory(frames)
      const series = generate_plot_series(trajectory, test_extractor)
      expect(series).toHaveLength(expected_length)
    })
  })

  describe(`constant property filtering`, () => {
    it.each([
      {
        name: `filter out constant properties`,
        values: [10.0, 10.0, 10.0],
        should_include: false,
      },
      {
        name: `filter out nearly constant properties`,
        values: [10.000001, 10.000002, 10.000001],
        should_include: false,
      },
      {
        name: `include significantly varying properties`,
        values: [10.0, 10.1, 10.2],
        should_include: true,
      },
      {
        name: `include small but meaningful variations`,
        values: [1000.0, 1000.1, 1000.2],
        should_include: true,
      },
    ])(`should $name`, ({ values, should_include }) => {
      const trajectory = create_trajectory(
        values.map((value) => ({ test_prop: value })),
      )

      const series = generate_plot_series(trajectory, test_extractor)

      if (should_include) {
        expect(series).toHaveLength(1)
        expect(series[0].y).toEqual(values)
      } else {
        expect(series).toHaveLength(0)
      }
    })

    it(`should filter constant volume but keep varying energy`, () => {
      const trajectory = create_trajectory([
        { volume: 17.2, energy: -10.0 },
        { volume: 17.2, energy: -10.5 },
        { volume: 17.2, energy: -11.0 },
      ])

      const series = generate_plot_series(trajectory, test_extractor)

      expect(series).toHaveLength(1)
      expect(series[0].label).toBe(`Energy`)
    })
  })

  describe(`y-axis assignment`, () => {
    it.each([
      { property: `energy`, axis: `y1` },
      { property: `force_max`, axis: `y2` },
      { property: `pressure`, axis: `y2` },
      { property: `temperature`, axis: `y2` },
      { property: `custom_prop`, axis: `y1` },
    ])(`should assign $property to $axis`, ({ property, axis }) => {
      const trajectory = create_trajectory([
        { [property]: 1.0 },
        { [property]: 2.0 },
      ])

      const [series] = generate_plot_series(trajectory, test_extractor)
      expect(series.y_axis).toBe(axis)
    })

    it(`should assign volume to y2 when varying significantly`, () => {
      const trajectory = create_trajectory([{ volume: 10.0 }, { volume: 20.0 }])
      const [series] = generate_plot_series(trajectory, test_extractor)
      expect(series.y_axis).toBe(`y2`)
    })
  })

  describe(`visibility and options`, () => {
    it(`should make energy, force_max, and stress_frobenius visible by default`, () => {
      const trajectory = create_trajectory([
        { energy: -10.0, force_max: 0.01, stress_frobenius: 5.2, other_prop: 1.0 },
        { energy: -10.5, force_max: 0.02, stress_frobenius: 5.5, other_prop: 2.0 },
      ])

      const series = generate_plot_series(trajectory, test_extractor)

      // Check that the high-priority properties are visible
      const energy_series = series.find((s) => s.label === `Energy`)
      const force_max_series = series.find((s) => s.label === `F<sub>max</sub>`)
      const stress_frobenius_series = series.find((s) => s.label === `σ<sub>F</sub>`)
      const other_series = series.find((s) => s.label === `Other_prop`)

      expect(energy_series?.visible).toBe(true)
      expect(force_max_series?.visible).toBe(true)
      expect(stress_frobenius_series?.visible).toBe(true)
      expect(other_series?.visible).toBe(false)
    })

    it(`should sort visible series before hidden ones`, () => {
      const trajectory = create_trajectory([
        { hidden_prop: 1.0, energy: -10.0, force_max: 1.0 },
        { hidden_prop: 2.0, energy: -10.5, force_max: 1.5 },
      ])

      const series = generate_plot_series(trajectory, test_extractor)

      // First two should be visible
      expect(series.slice(0, 2).every((s) => s.visible)).toBe(true)
      // Rest should be hidden
      expect(series.slice(2).every((s) => !s.visible)).toBe(true)
    })

    it.each([
      {
        name: `custom default_visible_properties`,
        options: { default_visible_properties: new Set([`test_prop`]) },
        expected_visible: `Test_prop`,
        expected_hidden: `Energy`,
      },
      {
        name: `custom y2_properties`,
        options: { y2_properties: new Set([`energy`]) },
        expected_axis: `y2`,
      },
    ])(
      `should respect $name`,
      ({ options, expected_visible, expected_hidden, expected_axis }) => {
        const trajectory = create_trajectory([
          { energy: -10.0, test_prop: 1.0 },
          { energy: -10.5, test_prop: 2.0 },
        ])

        const series = generate_plot_series(trajectory, test_extractor, options)

        if (expected_visible) {
          expect(series.find((s) => s.label === expected_visible)?.visible).toBe(true)
          expect(series.find((s) => s.label === expected_hidden)?.visible).toBe(false)
        }

        if (expected_axis) {
          expect(series[0].y_axis).toBe(expected_axis)
        }
      },
    )

    it(`should always include energy series regardless of variance`, () => {
      // Create trajectory with extremely low-variance energy (below 1e-6 coefficient of variation)
      const low_variance_trajectory = create_trajectory([
        { energy: -789.391026308538 },
        { energy: -789.391026308539 },
        { energy: -789.391026308540 },
        { energy: -789.391026308541 },
      ])

      const series = generate_plot_series(low_variance_trajectory, test_extractor)

      // Energy should always be included in series
      const energy_series = series.find((s) => s.label?.toLowerCase().includes(`energy`))
      expect(energy_series).toBeDefined()
      expect(energy_series?.x).toHaveLength(4)
      expect(energy_series?.y).toHaveLength(4)

      // But it should not be visible by default due to low variance
      expect(energy_series?.visible).toBe(false)
    })

    it(`should make energy visible by default when it has high variance`, () => {
      // Create trajectory with high-variance energy
      const high_variance_trajectory = create_trajectory([
        { energy: -100.0 },
        { energy: -50.0 },
        { energy: -25.0 },
        { energy: -10.0 },
      ])

      const series = generate_plot_series(high_variance_trajectory, test_extractor)

      // Energy should be included and visible by default due to high variance
      const energy_series = series.find((s) => s.label?.toLowerCase().includes(`energy`))
      expect(energy_series).toBeDefined()
      expect(energy_series?.visible).toBe(true)
    })
  })
})

describe(`should_hide_plot`, () => {
  const trajectory = create_trajectory([{}, {}, {}]) // 3 frame trajectory

  it.each([
    {
      name: `hide plot when no series exist`,
      series: [],
      expected: true,
    },
    {
      name: `hide plot when all visible series are constant`,
      series: [create_series([1.0, 1.0, 1.0])],
      expected: true,
    },
    {
      name: `show plot when at least one visible series varies`,
      series: [create_series([1.0, 1.0, 1.0]), create_series([1.0, 2.0, 3.0])],
      expected: false,
    },
    {
      name: `ignore hidden series when determining visibility`,
      series: [create_series([1.0, 2.0, 3.0], false)], // hidden but varying
      expected: true,
    },
  ])(`should $name`, ({ series, expected }) => {
    expect(should_hide_plot(trajectory, series)).toBe(expected)
  })

  it(`should show plot for single frame trajectory`, () => {
    const single_frame_trajectory = create_trajectory([{}])
    expect(should_hide_plot(single_frame_trajectory, [])).toBe(false)
  })

  it(`should use custom tolerance for constant detection`, () => {
    const series = [create_series([1.0, 1.000001, 1.0])]

    // Default tolerance considers this varying
    expect(should_hide_plot(trajectory, series)).toBe(false)
    // Loose tolerance considers this constant
    expect(should_hide_plot(trajectory, series, 1e-2)).toBe(true)
  })
})

describe(`y-axis assignment edge cases`, () => {
  it(`should assign force_max to y2 axis by default`, () => {
    const trajectory = create_trajectory([
      { force_max: 1.0 },
      { force_max: 2.0 },
    ])

    const series = generate_plot_series(trajectory, test_extractor)
    const force_series = series.find((s) => s.label?.includes(`F<sub>max</sub>`))

    expect(force_series?.y_axis).toBe(`y2`)
  })

  it(`should assign energy to y1 axis by default`, () => {
    const trajectory = create_trajectory([
      { energy: -10.0 },
      { energy: -10.5 },
    ])

    const series = generate_plot_series(trajectory, test_extractor)
    const energy_series = series.find((s) => s.label?.includes(`Energy`))

    expect(energy_series?.y_axis).toBe(`y1`)
  })

  it(`should handle mixed y1 and y2 properties correctly`, () => {
    const trajectory = create_trajectory([
      { energy: -10.0, force_max: 0.1, volume: 17.0 },
      { energy: -10.5, force_max: 0.2, volume: 17.5 },
    ])

    const series = generate_plot_series(trajectory, test_extractor)

    const energy_series = series.find((s) => s.label?.includes(`Energy`))
    const force_series = series.find((s) => s.label?.includes(`F<sub>max</sub>`))
    const volume_series = series.find((s) => s.label?.includes(`Volume`))

    expect(energy_series?.y_axis).toBe(`y1`)
    expect(force_series?.y_axis).toBe(`y2`)
    expect(volume_series?.y_axis).toBe(`y2`)
  })
})

describe(`generate_axis_labels`, () => {
  // Helper for creating test series
  const series = (
    label: string,
    y_axis: `y1` | `y2` = `y1`,
    visible = true,
  ): DataSeries => ({
    x: [0, 1],
    y: [1, 2],
    label,
    visible,
    y_axis,
    markers: `line` as const,
    metadata: [],
    line_style: { stroke: `blue`, stroke_width: 2 },
    point_style: { fill: `blue`, radius: 4, stroke: `blue`, stroke_width: 1 },
  })

  it.each([
    [`empty series`, [], { y1: `Value`, y2: `Value` }],
    [`y1 only`, [series(`Energy`, `y1`)], { y1: `Energy`, y2: `Value` }],
    [`y2 only`, [series(`Force`, `y2`)], { y1: `Value`, y2: `Force` }],
    [`mixed axes`, [series(`Energy`, `y1`), series(`Force`, `y2`)], {
      y1: `Energy`,
      y2: `Force`,
    }],
    [`visible priority`, [series(`Hidden`, `y1`, false), series(`Visible`, `y1`)], {
      y1: `Visible`,
      y2: `Value`,
    }],
    [`fallback invisible`, [series(`Energy`, `y1`, false)], {
      y1: `Energy`,
      y2: `Value`,
    }],
  ])(`should handle %s`, (_, series_data, expected) => {
    expect(generate_axis_labels(series_data)).toEqual(expected)
  })

  it.each([
    [`undefined`, { ...series(``, `y1`), label: undefined }],
    [`empty string`, series(``, `y1`)],
    [`null`, { ...series(``, `y1`), label: null }],
  ])(`should handle %s label`, (_, test_series) => {
    expect(generate_axis_labels([test_series] as DataSeries[])).toEqual({
      y1: `Value`,
      y2: `Value`,
    })
  })
})
