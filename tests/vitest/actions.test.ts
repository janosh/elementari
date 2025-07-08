import { draggable } from '$lib/actions'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

type MockElement = HTMLElement & {
  style: {
    setProperty: ReturnType<typeof vi.fn>
    cursor: string
    left: string
    top: string
    width: string
    right: string
  }
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  querySelector: ReturnType<typeof vi.fn>
}

// Test utilities
function create_mock_element(): MockElement {
  const style = {
    setProperty: vi.fn(),
    cursor: ``,
    left: ``,
    top: ``,
    width: ``,
    right: ``,
  }

  return {
    offsetLeft: 100,
    offsetTop: 50,
    offsetWidth: 200,
    style,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    querySelector: vi.fn(),
  } as MockElement
}

function create_mock_event(
  type: string,
  target: unknown = undefined,
  clientX = 100,
  clientY = 50,
): MouseEvent {
  return {
    type,
    clientX,
    clientY,
    target,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as MouseEvent
}

function get_event_handler(
  element: MockElement,
  eventType: string,
): (event: MouseEvent) => void {
  const call = element.addEventListener.mock.calls.find(([type]) => type === eventType)
  if (!call) throw new Error(`No ${eventType} handler found`)
  return call[1]
}

function get_global_handler(eventType: string): (event: MouseEvent) => void {
  const globalMock = globalThis.addEventListener as ReturnType<typeof vi.fn>
  const call = globalMock.mock.calls.find(([type]) => type === eventType)
  if (!call) throw new Error(`No global ${eventType} handler found`)
  return call[1]
}

describe(`draggable action`, () => {
  let element: MockElement
  let handle: MockElement
  let userSelectSetter: ReturnType<typeof vi.fn>

  beforeEach(() => {
    element = create_mock_element()
    handle = create_mock_element()
    userSelectSetter = vi.fn()

    Object.defineProperty(document.body.style, `userSelect`, {
      set: userSelectSetter,
      get: () => ``,
      configurable: true,
    })

    globalThis.addEventListener = vi.fn()
    globalThis.removeEventListener = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe(`initialization`, () => {
    test(`should setup default draggable element`, () => {
      const action = draggable(element)

      expect(element.style.cursor).toBe(`grab`)
      expect(element.addEventListener).toHaveBeenCalledWith(
        `mousedown`,
        expect.any(Function),
      )
      expect(action.destroy).toBeTypeOf(`function`)
    })

    test(`should use custom handle when provided`, () => {
      element.querySelector.mockReturnValue(handle)

      draggable(element, { handle_selector: `.handle` })

      expect(element.querySelector).toHaveBeenCalledWith(`.handle`)
      expect(handle.style.cursor).toBe(`grab`)
      expect(handle.addEventListener).toHaveBeenCalledWith(
        `mousedown`,
        expect.any(Function),
      )
      expect(element.addEventListener).not.toHaveBeenCalled()
    })

    test(`should handle missing handle gracefully`, () => {
      element.querySelector.mockReturnValue(null)
      const consoleSpy = vi.spyOn(console, `warn`).mockImplementation(() => {})

      const action = draggable(element, { handle_selector: `.missing` })

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(`handle not found`))
      expect(action.destroy).toBeTypeOf(`function`)
      consoleSpy.mockRestore()
    })
  })

  describe(`drag interaction`, () => {
    test.each([
      { description: `element as handle`, useHandle: false },
      { description: `custom handle`, useHandle: true },
    ])(`should complete full drag cycle with $description`, ({ useHandle }) => {
      const callbacks = {
        on_drag_start: vi.fn(),
        on_drag: vi.fn(),
        on_drag_end: vi.fn(),
      }

      if (useHandle) {
        element.querySelector.mockReturnValue(handle)
        draggable(element, { handle_selector: `.handle`, ...callbacks })
      } else {
        draggable(element, callbacks)
      }

      const targetElement = useHandle ? handle : element
      const mousedownHandler = get_event_handler(targetElement, `mousedown`)

      // Start drag
      const startEvent = create_mock_event(`mousedown`, targetElement, 150, 75)
      mousedownHandler(startEvent)

      // Verify drag start
      expect(callbacks.on_drag_start).toHaveBeenCalledWith(startEvent)
      expect(element.style.left).toBe(`100px`)
      expect(element.style.top).toBe(`50px`)
      expect(element.style.width).toBe(`200px`)
      expect(element.style.right).toBe(`auto`)
      expect(userSelectSetter).toHaveBeenCalledWith(`none`)
      expect(targetElement.style.cursor).toBe(`grabbing`)

      // Continue drag
      const mousemoveHandler = get_global_handler(`mousemove`)
      const moveEvent = create_mock_event(`mousemove`, targetElement, 200, 125)
      mousemoveHandler(moveEvent)

      expect(callbacks.on_drag).toHaveBeenCalledWith(moveEvent)
      expect(element.style.left).toBe(`150px`)
      expect(element.style.top).toBe(`100px`)

      // End drag
      const mouseupHandler = get_global_handler(`mouseup`)
      const endEvent = create_mock_event(`mouseup`, targetElement, 200, 125)
      mouseupHandler(endEvent)

      expect(callbacks.on_drag_end).toHaveBeenCalledWith(endEvent)
      expect(userSelectSetter).toHaveBeenCalledWith(``)
      expect(targetElement.style.cursor).toBe(`grab`)
      expect(endEvent.stopPropagation).toHaveBeenCalled()
    })

    test(`should ignore drag from wrong target`, () => {
      const on_drag_start = vi.fn()
      draggable(element, { on_drag_start })

      const mousedownHandler = get_event_handler(element, `mousedown`)
      const wrongTarget = create_mock_element()
      const event = create_mock_event(`mousedown`, wrongTarget, 100, 50)

      mousedownHandler(event)

      expect(on_drag_start).not.toHaveBeenCalled()
      expect(globalThis.addEventListener).not.toHaveBeenCalled()
    })

    test(`should not update position when not dragging`, () => {
      draggable(element)

      // Verify no position updates occur without drag start
      expect(element.style.left).toBe(``)
    })
  })

  describe(`state management`, () => {
    test(`should track dragging state correctly`, () => {
      draggable(element)
      const mousedownHandler = get_event_handler(element, `mousedown`)
      const event = create_mock_event(`mousedown`, element, 100, 50)

      // Start drag
      mousedownHandler(event)
      expect(globalThis.addEventListener).toHaveBeenCalledTimes(2) // mousemove + mouseup

      // Multiple mousemoves should work
      const mousemoveHandler = get_global_handler(`mousemove`)
      mousemoveHandler(create_mock_event(`mousemove`, element, 110, 60))
      expect(element.style.left).toBe(`110px`)

      mousemoveHandler(create_mock_event(`mousemove`, element, 120, 70))
      expect(element.style.left).toBe(`120px`)

      // End drag
      const mouseupHandler = get_global_handler(`mouseup`)
      mouseupHandler(create_mock_event(`mouseup`, element, 120, 70))

      // Subsequent mousemove should not affect position
      const currentLeft = element.style.left
      mousemoveHandler(create_mock_event(`mousemove`, element, 150, 100))
      expect(element.style.left).toBe(currentLeft) // Should remain unchanged
    })

    test(`should handle multiple mouseup events gracefully`, () => {
      const on_drag_end = vi.fn()
      draggable(element, { on_drag_end })

      const mousedownHandler = get_event_handler(element, `mousedown`)
      mousedownHandler(create_mock_event(`mousedown`, element, 100, 50))

      const mouseupHandler = get_global_handler(`mouseup`)
      const endEvent = create_mock_event(`mouseup`, element, 100, 50)

      mouseupHandler(endEvent)
      mouseupHandler(endEvent) // Second mouseup

      expect(on_drag_end).toHaveBeenCalledTimes(1) // Should only fire once
    })
  })

  describe(`cleanup and destruction`, () => {
    test(`should cleanup all event listeners on destroy`, () => {
      const action = draggable(element)

      action.destroy()

      expect(element.removeEventListener).toHaveBeenCalledWith(
        `mousedown`,
        expect.any(Function),
      )
      expect(globalThis.removeEventListener).toHaveBeenCalledWith(
        `mousemove`,
        expect.any(Function),
      )
      expect(globalThis.removeEventListener).toHaveBeenCalledWith(
        `mouseup`,
        expect.any(Function),
      )
      expect(element.style.cursor).toBe(``)
    })

    test(`should cleanup handle listeners when using custom handle`, () => {
      element.querySelector.mockReturnValue(handle)
      const action = draggable(element, { handle_selector: `.handle` })

      action.destroy()

      expect(handle.removeEventListener).toHaveBeenCalledWith(
        `mousedown`,
        expect.any(Function),
      )
      expect(handle.style.cursor).toBe(``)
      expect(element.removeEventListener).not.toHaveBeenCalled()
    })

    test(`should handle destroy with missing handle gracefully`, () => {
      element.querySelector.mockReturnValue(null)
      vi.spyOn(console, `warn`).mockImplementation(() => {})

      const action = draggable(element, { handle_selector: `.missing` })

      expect(() => action.destroy()).not.toThrow()
    })
  })

  describe(`edge cases and error handling`, () => {
    test(`should handle rapid drag start/stop cycles`, () => {
      const callbacks = { on_drag_start: vi.fn(), on_drag_end: vi.fn() }
      draggable(element, callbacks)

      const mousedownHandler = get_event_handler(element, `mousedown`)

      // Rapid start/stop
      mousedownHandler(create_mock_event(`mousedown`, element, 100, 50))
      const mouseupHandler = get_global_handler(`mouseup`)
      mouseupHandler(create_mock_event(`mouseup`, element, 100, 50))

      mousedownHandler(create_mock_event(`mousedown`, element, 100, 50))
      mouseupHandler(create_mock_event(`mouseup`, element, 100, 50))

      expect(callbacks.on_drag_start).toHaveBeenCalledTimes(2)
      expect(callbacks.on_drag_end).toHaveBeenCalledTimes(2)
    })

    test(`should preserve element position values during drag`, () => {
      draggable(element)
      const mousedownHandler = get_event_handler(element, `mousedown`)

      mousedownHandler(create_mock_event(`mousedown`, element, 150, 75))

      expect(element.style.left).toBe(`100px`) // offsetLeft
      expect(element.style.top).toBe(`50px`) // offsetTop
      expect(element.style.width).toBe(`200px`) // offsetWidth
    })

    test(`should calculate correct position deltas`, () => {
      draggable(element)
      const mousedownHandler = get_event_handler(element, `mousedown`)

      // Start at 150,75
      mousedownHandler(create_mock_event(`mousedown`, element, 150, 75))

      const mousemoveHandler = get_global_handler(`mousemove`)

      // Move to 200,125 (delta: +50, +50)
      mousemoveHandler(create_mock_event(`mousemove`, element, 200, 125))
      expect(element.style.left).toBe(`150px`) // 100 + 50
      expect(element.style.top).toBe(`100px`) // 50 + 50

      // Move to 175,100 (delta: +25, +25 from start)
      mousemoveHandler(create_mock_event(`mousemove`, element, 175, 100))
      expect(element.style.left).toBe(`125px`) // 100 + 25
      expect(element.style.top).toBe(`75px`) // 50 + 25
    })
  })
})
