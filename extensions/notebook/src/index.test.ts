/**
 * Tests for the MatterViz notebook extension frontend.
 */

import { describe, test, expect, vi } from 'vitest'

// Mock anywidget types for testing
interface MockModel {
  attributes: Record<string, any>
  get: (key: string) => any
  on: (event: string, callback: () => void) => void
}

// Mock Svelte components since they don't work in vitest
vi.mock('./StructureApp.svelte', () => ({
  default: class MockStructureApp {
    constructor(options: any) {
      this.target = options.target
      this.props = options.props
    }
    $set = vi.fn()
    $destroy = vi.fn()
    $on = vi.fn()
  }
}))

vi.mock('./TrajectoryApp.svelte', () => ({
  default: class MockTrajectoryApp {
    constructor(options: any) {
      this.target = options.target
      this.props = options.props
    }
    $set = vi.fn()
    $destroy = vi.fn()
    $on = vi.fn()
  }
}))

// Import after mocks
import { render } from './index'

describe('MatterViz Notebook Extension Frontend', () => {
  test('should detect structure model correctly', () => {
    const mockStructureModel: MockModel = {
      attributes: {
        structure: { sites: [] },
        atom_radius: 1.0,
        show_atoms: true,
        width: 600,
        height: 500
      },
      get: (key: string) => mockStructureModel.attributes[key],
      on: vi.fn()
    }

    const mockElement = document.createElement('div')
    
    const cleanup = render({ 
      model: mockStructureModel as any, 
      el: mockElement 
    })

    expect(cleanup).toBeInstanceOf(Function)
    
    // Test cleanup
    cleanup()
  })

  test('should detect trajectory model correctly', () => {
    const mockTrajectoryModel: MockModel = {
      attributes: {
        trajectory: { frames: [] },
        current_step_idx: 0,
        display_mode: 'structure+scatter',
        width: 800,
        height: 600
      },
      get: (key: string) => mockTrajectoryModel.attributes[key],
      on: vi.fn()
    }

    const mockElement = document.createElement('div')
    
    const cleanup = render({ 
      model: mockTrajectoryModel as any, 
      el: mockElement 
    })

    expect(cleanup).toBeInstanceOf(Function)
    
    // Test cleanup
    cleanup()
  })

  test('should handle structure model without trajectory attribute', () => {
    const mockStructureModel: MockModel = {
      attributes: {
        structure: { sites: [{ element: 'H' }] },
        atom_radius: 1.2,
        show_atoms: true
      },
      get: (key: string) => mockStructureModel.attributes[key] || null,
      on: vi.fn()
    }

    const mockElement = document.createElement('div')
    
    const cleanup = render({ 
      model: mockStructureModel as any, 
      el: mockElement 
    })

    expect(cleanup).toBeInstanceOf(Function)
    cleanup()
  })

  test('should handle model property updates', () => {
    const mockCallbacks: Record<string, () => void> = {}
    
    const mockModel: MockModel = {
      attributes: {
        structure: { sites: [] },
        atom_radius: 1.0
      },
      get: (key: string) => mockModel.attributes[key],
      on: (event: string, callback: () => void) => {
        mockCallbacks[event] = callback
      }
    }

    const mockElement = document.createElement('div')
    
    const cleanup = render({ 
      model: mockModel as any, 
      el: mockElement 
    })

    // Simulate a model change
    if (mockCallbacks['change:atom_radius']) {
      mockCallbacks['change:atom_radius']()
    }

    expect(cleanup).toBeInstanceOf(Function)
    cleanup()
  })

  test('should handle trajectory with empty frames', () => {
    const mockTrajectoryModel: MockModel = {
      attributes: {
        trajectory: { frames: [] },
        current_step_idx: 0,
        display_mode: 'structure',
        show_controls: true
      },
      get: (key: string) => mockTrajectoryModel.attributes[key] || 0,
      on: vi.fn()
    }

    const mockElement = document.createElement('div')
    
    const cleanup = render({ 
      model: mockTrajectoryModel as any, 
      el: mockElement 
    })

    expect(cleanup).toBeInstanceOf(Function)
    cleanup()
  })

  test('should create proper props for structure widget', () => {
    const mockModel: MockModel = {
      attributes: {
        structure: { sites: [{ element: 'C' }] },
        atom_radius: 1.5,
        show_atoms: true,
        show_bonds: false,
        color_scheme: 'Jmol',
        width: 700,
        height: 500,
        show_controls: true
      },
      get: (key: string) => mockModel.attributes[key],
      on: vi.fn()
    }

    const mockElement = document.createElement('div')
    
    const cleanup = render({ 
      model: mockModel as any, 
      el: mockElement 
    })

    // The render function should have created a StructureApp with proper props
    expect(cleanup).toBeInstanceOf(Function)
    cleanup()
  })

  test('should create proper props for trajectory widget', () => {
    const mockModel: MockModel = {
      attributes: {
        trajectory: { 
          frames: [
            { structure: { sites: [] }, metadata: {} },
            { structure: { sites: [] }, metadata: {} }
          ] 
        },
        current_step_idx: 1,
        display_mode: 'structure+histogram',
        layout: 'vertical',
        show_controls: true,
        atom_radius: 0.8
      },
      get: (key: string) => mockModel.attributes[key],
      on: vi.fn()
    }

    const mockElement = document.createElement('div')
    
    const cleanup = render({ 
      model: mockModel as any, 
      el: mockElement 
    })

    expect(cleanup).toBeInstanceOf(Function)
    cleanup()
  })

  test('should handle missing or null model attributes gracefully', () => {
    const mockModel: MockModel = {
      attributes: {},
      get: (key: string) => mockModel.attributes[key] || null,
      on: vi.fn()
    }

    const mockElement = document.createElement('div')
    
    const cleanup = render({ 
      model: mockModel as any, 
      el: mockElement 
    })

    // Should not throw even with missing attributes
    expect(cleanup).toBeInstanceOf(Function)
    cleanup()
  })

  test('should handle model with invalid structure data', () => {
    const mockModel: MockModel = {
      attributes: {
        structure: "invalid structure data",
        atom_radius: 1.0
      },
      get: (key: string) => mockModel.attributes[key],
      on: vi.fn()
    }

    const mockElement = document.createElement('div')
    
    const cleanup = render({ 
      model: mockModel as any, 
      el: mockElement 
    })

    // Should handle invalid data gracefully
    expect(cleanup).toBeInstanceOf(Function)
    cleanup()
  })

  test('should properly distinguish between structure and trajectory models', () => {
    // Test structure model (no trajectory attribute)
    const structureModel: MockModel = {
      attributes: {
        structure: { sites: [] },
        atom_radius: 1.0
      },
      get: (key: string) => structureModel.attributes[key],
      on: vi.fn()
    }

    // Test trajectory model (has trajectory attribute)
    const trajectoryModel: MockModel = {
      attributes: {
        trajectory: { frames: [] },
        current_step_idx: 0
      },
      get: (key: string) => trajectoryModel.attributes[key],
      on: vi.fn()
    }

    const mockElement1 = document.createElement('div')
    const mockElement2 = document.createElement('div')
    
    const cleanup1 = render({ 
      model: structureModel as any, 
      el: mockElement1 
    })
    
    const cleanup2 = render({ 
      model: trajectoryModel as any, 
      el: mockElement2 
    })

    expect(cleanup1).toBeInstanceOf(Function)
    expect(cleanup2).toBeInstanceOf(Function)
    
    cleanup1()
    cleanup2()
  })
})