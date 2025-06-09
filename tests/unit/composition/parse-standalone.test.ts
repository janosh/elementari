import { describe, expect, test } from 'vitest'

// Import types from the library
import type { Composition } from '$lib'

// Import the actual parsing functions from the production module
import {
  atomic_number_to_element_symbol,
  convert_atomic_numbers_to_symbols,
  convert_symbols_to_atomic_numbers,
  element_symbol_to_atomic_number,
  get_total_atoms,
  normalize_composition,
  parse_composition_input,
  parse_formula,
} from '$lib/composition/parse'

describe(`standalone composition parsing`, () => {
  describe(`atomic number utilities`, () => {
    test(`should convert atomic numbers to element symbols`, () => {
      expect(atomic_number_to_element_symbol(1)).toBe(`H`)
      expect(atomic_number_to_element_symbol(6)).toBe(`C`)
      expect(atomic_number_to_element_symbol(8)).toBe(`O`)
      expect(atomic_number_to_element_symbol(26)).toBe(`Fe`)
      expect(atomic_number_to_element_symbol(79)).toBe(`Au`)
    })

    test(`should return null for invalid atomic numbers`, () => {
      expect(atomic_number_to_element_symbol(0)).toBeNull()
      expect(atomic_number_to_element_symbol(-1)).toBeNull()
      expect(atomic_number_to_element_symbol(999)).toBeNull()
    })

    test(`should convert element symbols to atomic numbers`, () => {
      expect(element_symbol_to_atomic_number(`H`)).toBe(1)
      expect(element_symbol_to_atomic_number(`C`)).toBe(6)
      expect(element_symbol_to_atomic_number(`O`)).toBe(8)
      expect(element_symbol_to_atomic_number(`Fe`)).toBe(26)
      expect(element_symbol_to_atomic_number(`Au`)).toBe(79)
    })

    test(`should convert atomic number compositions to symbol compositions`, () => {
      expect(convert_atomic_numbers_to_symbols({ 26: 2, 8: 3 })).toEqual({
        Fe: 2,
        O: 3,
      })
      expect(convert_atomic_numbers_to_symbols({ 1: 2, 8: 1 })).toEqual({
        H: 2,
        O: 1,
      })
      expect(convert_atomic_numbers_to_symbols({ 20: 1, 6: 1, 8: 3 })).toEqual({
        Ca: 1,
        C: 1,
        O: 3,
      })
    })

    test(`should convert symbol compositions to atomic number compositions`, () => {
      expect(convert_symbols_to_atomic_numbers({ Fe: 2, O: 3 })).toEqual({
        26: 2,
        8: 3,
      })
      expect(convert_symbols_to_atomic_numbers({ H: 2, O: 1 })).toEqual({
        1: 2,
        8: 1,
      })
      expect(convert_symbols_to_atomic_numbers({ Ca: 1, C: 1, O: 3 })).toEqual({
        20: 1,
        6: 1,
        8: 3,
      })
    })

    test(`should throw error for invalid atomic numbers`, () => {
      expect(() => convert_atomic_numbers_to_symbols({ 999: 1 })).toThrow(
        `Invalid atomic number: 999`,
      )
    })

    test(`should throw error for invalid element symbols`, () => {
      expect(() =>
        convert_symbols_to_atomic_numbers({ Xx: 1 } as Composition),
      ).toThrow(`Invalid element symbol: Xx`)
    })
  })

  describe(`parse_formula`, () => {
    test(`should parse simple formulas`, () => {
      expect(parse_formula(`H2O`)).toEqual({ H: 2, O: 1 })
      expect(parse_formula(`Fe2O3`)).toEqual({ Fe: 2, O: 3 })
      expect(parse_formula(`NaCl`)).toEqual({ Na: 1, Cl: 1 })
    })

    test(`should handle parentheses`, () => {
      expect(parse_formula(`Ca(OH)2`)).toEqual({ Ca: 1, O: 2, H: 2 })
      expect(parse_formula(`Mg(NO3)2`)).toEqual({ Mg: 1, N: 2, O: 6 })
    })

    test(`should handle whitespace`, () => {
      expect(parse_formula(` H2 O `)).toEqual({ H: 2, O: 1 })
    })
  })

  describe(`normalize_composition`, () => {
    test(`should normalize symbol compositions`, () => {
      expect(normalize_composition({ H: 2, O: 1, N: 0 })).toEqual({
        H: 2,
        O: 1,
      })
      expect(normalize_composition({ Fe: -1, O: 3 })).toEqual({ O: 3 })
    })

    test(`should normalize atomic number compositions`, () => {
      expect(normalize_composition({ 1: 2, 8: 1, 7: 0 })).toEqual({
        H: 2,
        O: 1,
      })
      expect(normalize_composition({ 26: -1, 8: 3 })).toEqual({ O: 3 })
    })
  })

  describe(`parse_composition_input`, () => {
    test(`should parse formula strings`, () => {
      expect(parse_composition_input(`H2O`)).toEqual({ H: 2, O: 1 })
      expect(parse_composition_input(`Fe2O3`)).toEqual({ Fe: 2, O: 3 })
    })

    test(`should handle symbol composition objects`, () => {
      expect(parse_composition_input({ H: 2, O: 1 })).toEqual({ H: 2, O: 1 })
      expect(parse_composition_input({ Fe: 2, O: 3, N: 0 })).toEqual({
        Fe: 2,
        O: 3,
      })
    })

    test(`should handle atomic number composition objects`, () => {
      expect(parse_composition_input({ 1: 2, 8: 1 })).toEqual({ H: 2, O: 1 })
      expect(parse_composition_input({ 26: 2, 8: 3 })).toEqual({ Fe: 2, O: 3 })
    })
  })

  describe(`parametrized tests`, () => {
    test.each([
      [`H2O`, { H: 2, O: 1 }],
      [`CO2`, { C: 1, O: 2 }],
      [`Fe2O3`, { Fe: 2, O: 3 }],
      [`CaCO3`, { Ca: 1, C: 1, O: 3 }],
      [`Ca(OH)2`, { Ca: 1, O: 2, H: 2 }],
      [`Mg(NO3)2`, { Mg: 1, N: 2, O: 6 }],
    ])(
      `should parse formula %s correctly`,
      (formula: string, expected: Composition) => {
        expect(parse_formula(formula)).toEqual(expected)
      },
    )

    test.each([
      [
        { 1: 2, 8: 1 },
        { H: 2, O: 1 },
      ], // H2O
      [
        { 6: 1, 8: 2 },
        { C: 1, O: 2 },
      ], // CO2
      [
        { 26: 2, 8: 3 },
        { Fe: 2, O: 3 },
      ], // Fe2O3
      [
        { 20: 1, 6: 1, 8: 3 },
        { Ca: 1, C: 1, O: 3 },
      ], // CaCO3
    ])(
      `should convert atomic numbers %o to symbols correctly`,
      (atomic_comp: Record<number, number>, expected: Composition) => {
        expect(convert_atomic_numbers_to_symbols(atomic_comp)).toEqual(expected)
      },
    )

    test.each([
      [{ H: 2, O: 1 }, 3],
      [{ C: 1, O: 2 }, 3],
      [{ Fe: 2, O: 3 }, 5],
    ])(
      `should calculate total atoms for %o correctly`,
      (composition: Composition, expected: number) => {
        expect(get_total_atoms(composition)).toBe(expected)
      },
    )
  })
})
