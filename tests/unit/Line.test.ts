import { Line } from '$lib'
import { mount } from 'svelte'
import { beforeEach, describe, expect, test } from 'vitest'

describe(`Line`, () => {
  // Setup container
  const container_style = `width: 800px; height: 600px; position: relative;`
  let target_div: HTMLDivElement

  beforeEach(() => {
    // Efficiently reset and recreate the target div
    document.body.innerHTML = ``
    target_div = document.createElement(`div`)
    target_div.setAttribute(`style`, container_style)
    document.body.appendChild(target_div)
  })

  // Parameterized test for default and custom styles
  test.each([
    {
      name: `default styles`,
      props: {}, // Relies on component defaults
      expected_line: {
        stroke: `rgba(255, 255, 255, 0.5)`,
        strokeWidth: `2`,
        fill: `none`,
      },
      expected_area: {
        fill: `rgba(255, 255, 255, 0.1)`,
        stroke: ``, // Default area_stroke is null -> empty string style
      },
    },
    {
      name: `custom styles`,
      props: {
        line_color: `red`,
        line_width: 3,
        area_color: `blue`,
        area_stroke: `green`,
      },
      expected_line: {
        stroke: `red`,
        strokeWidth: `3`,
        fill: `none`,
      },
      expected_area: {
        fill: `blue`,
        stroke: `green`,
      },
    },
  ])(`renders with $name`, ({ props, expected_line, expected_area }) => {
    const points: [number, number][] = [
      [10, 10],
      [50, 50],
      [100, 20],
    ]
    const origin: [number, number] = [0, 200]

    const component = mount(Line, {
      target: target_div,
      props: { points, origin, ...props }, // Spread additional props
    })

    expect(component).toBeTruthy()
    const paths = target_div.querySelectorAll(`path`)
    expect(paths.length).toBe(2)

    const line_path = paths[0]
    const area_path = paths[1]

    // Assert line styles
    expect(line_path.getAttribute(`fill`)).toBe(expected_line.fill)
    expect(line_path.style.stroke).toBe(expected_line.stroke)
    expect(line_path.style.strokeWidth).toBe(expected_line.strokeWidth)

    // Assert area styles
    expect(area_path.style.fill).toBe(expected_area.fill)
    expect(area_path.style.stroke).toBe(expected_area.stroke)
  })

  test(`calculates line path correctly for 2 and 3 points`, () => {
    const origin: [number, number] = [0, 100]

    // Test with 3 points (expects curve 'C')
    const points_3 = [
      [0, 100],
      [100, 0],
      [200, 100],
    ] as [number, number][]
    mount(Line, {
      target: target_div,
      props: { points: points_3, origin, tween_duration: 0 },
    })
    const paths_3 = target_div.querySelectorAll(`path`)
    expect(paths_3[0].getAttribute(`d`)).toMatch(/^M0,100C.*100,0.*C.*200,100$/)

    // Clean up target before remounting
    target_div.innerHTML = ``

    // Test with 2 points (expects line 'L')
    const points_2 = [
      [0, 100],
      [100, 0],
    ] as [number, number][]
    mount(Line, {
      target: target_div, // Reuse the cleaned div
      props: { points: points_2, origin, tween_duration: 0 },
    })
    const paths_2 = target_div.querySelectorAll(`path`)
    expect(paths_2[0].getAttribute(`d`)).toMatch(/^M0,100L100,0$/)
  })

  test(`calculates area path correctly with 2 points`, () => {
    const points: [number, number][] = [
      [0, 50],
      [100, 0],
    ]
    const origin: [number, number] = [0, 100] // Y origin at 100

    mount(Line, {
      target: target_div,
      props: { points, origin, tween_duration: 0 },
    })

    const area_path = target_div.querySelectorAll(`path`)[1]
    expect(area_path.getAttribute(`d`)).toMatch(/^M0,50L100,0L100,100L0,100Z$/)
  })

  test(`initializes tweens`, () => {
    const points: [number, number][] = [
      [10, 10],
      [50, 50],
    ]
    const origin: [number, number] = [0, 100]

    const component = mount(Line, {
      target: target_div,
      props: { points, origin, tween_duration: 100 },
    })

    expect(component).toBeTruthy() // Verify component mounts
    const paths = target_div.querySelectorAll(`path`)
    expect(paths.length).toBe(2) // Check paths exist
  })

  test(`handles empty points array`, () => {
    const points: [number, number][] = []
    const origin: [number, number] = [0, 100]

    mount(Line, {
      target: target_div,
      props: { points, origin, tween_duration: 0 },
    })

    const paths = target_div.querySelectorAll(`path`)
    expect(paths.length).toBe(2)
    expect(paths[0].getAttribute(`d`)).toBe(``)
    expect(paths[1].getAttribute(`d`)).toBe(``)
  })

  test(`handles single point array`, () => {
    const points: [number, number][] = [[50, 50]]
    const origin: [number, number] = [0, 100]

    mount(Line, {
      target: target_div,
      props: { points, origin, tween_duration: 0 },
    })

    const paths = target_div.querySelectorAll(`path`)
    expect(paths.length).toBe(2)
    expect(paths[0].getAttribute(`d`)).toMatch(/^M50,50Z?$/)
    expect(paths[1].getAttribute(`d`)).toMatch(/^M50,50Z?L50,100L50,100Z$/)
  })
})
