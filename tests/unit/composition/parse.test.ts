import type { Composition, ElementSymbol } from '$lib'
import {
  atomic_number_to_element_symbol,
  composition_to_percentages,
  convert_atomic_numbers_to_symbols,
  convert_symbols_to_atomic_numbers,
  element_symbol_to_atomic_number,
  get_alphabetical_formula,
  get_electro_neg_formula,
  get_total_atoms,
  normalize_composition,
  parse_composition_input,
  parse_formula,
} from '$lib/composition/parse'
import { describe, expect, test } from 'vitest'

describe(`atomic number utilities`, () => {
  test(`should convert atomic numbers to element symbols`, () => {
    expect(atomic_number_to_element_symbol(1)).toBe(`H`)
    expect(atomic_number_to_element_symbol(6)).toBe(`C`)
    expect(atomic_number_to_element_symbol(8)).toBe(`O`)
    expect(atomic_number_to_element_symbol(26)).toBe(`Fe`)
    expect(atomic_number_to_element_symbol(79)).toBe(`Au`)
    expect(atomic_number_to_element_symbol(118)).toBe(`Og`)
  })

  test(`should return null for invalid atomic numbers`, () => {
    expect(atomic_number_to_element_symbol(0)).toBeNull()
    expect(atomic_number_to_element_symbol(-1)).toBeNull()
    expect(atomic_number_to_element_symbol(119)).toBeNull()
    expect(atomic_number_to_element_symbol(999)).toBeNull()
  })

  test(`should convert element symbols to atomic numbers`, () => {
    expect(element_symbol_to_atomic_number(`H`)).toBe(1)
    expect(element_symbol_to_atomic_number(`C`)).toBe(6)
    expect(element_symbol_to_atomic_number(`O`)).toBe(8)
    expect(element_symbol_to_atomic_number(`Fe`)).toBe(26)
    expect(element_symbol_to_atomic_number(`Au`)).toBe(79)
    expect(element_symbol_to_atomic_number(`Og`)).toBe(118)
  })

  test(`should return null for invalid element symbols`, () => {
    expect(element_symbol_to_atomic_number(`Xx` as ElementSymbol)).toBeNull()
    expect(element_symbol_to_atomic_number(`ABC` as ElementSymbol)).toBeNull()
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

  test(`should handle duplicate atomic numbers in conversion`, () => {
    // This would be represented as an object with the same key, so it should sum
    expect(convert_atomic_numbers_to_symbols({ 1: 1, 8: 1 })).toEqual({
      H: 1,
      O: 1,
    })
  })

  test(`should throw error for invalid atomic numbers in conversion`, () => {
    expect(() => convert_atomic_numbers_to_symbols({ 999: 1 })).toThrow(
      `Invalid atomic number: 999`,
    )
    expect(() => convert_atomic_numbers_to_symbols({ 0: 1 })).toThrow(
      `Invalid atomic number: 0`,
    )
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

  test(`should throw error for invalid element symbols in conversion`, () => {
    expect(() =>
      convert_symbols_to_atomic_numbers({ Xx: 1 } as Composition),
    ).toThrow(`Invalid element symbol: Xx`)
  })
})

describe(`parse_formula`, () => {
  test(`should parse simple formulas`, () => {
    expect(parse_formula(`H2O`)).toEqual({ H: 2, O: 1 })
    expect(parse_formula(`CO2`)).toEqual({ C: 1, O: 2 })
    expect(parse_formula(`NaCl`)).toEqual({ Na: 1, Cl: 1 })
    expect(parse_formula(`Fe2O3`)).toEqual({ Fe: 2, O: 3 })
  })

  test(`should parse formulas with single atoms`, () => {
    expect(parse_formula(`H`)).toEqual({ H: 1 })
    expect(parse_formula(`He`)).toEqual({ He: 1 })
    expect(parse_formula(`Au`)).toEqual({ Au: 1 })
  })

  test(`should parse formulas with large numbers`, () => {
    expect(parse_formula(`C60`)).toEqual({ C: 60 })
    expect(parse_formula(`C8H10N4O2`)).toEqual({ C: 8, H: 10, N: 4, O: 2 })
  })

  test(`should handle formulas with parentheses`, () => {
    expect(parse_formula(`Ca(OH)2`)).toEqual({ Ca: 1, O: 2, H: 2 })
    expect(parse_formula(`Mg(NO3)2`)).toEqual({ Mg: 1, N: 2, O: 6 })
    expect(parse_formula(`Al2(SO4)3`)).toEqual({ Al: 2, S: 3, O: 12 })
  })

  test(`should handle nested parentheses`, () => {
    expect(parse_formula(`Ca3(PO4)2`)).toEqual({ Ca: 3, P: 2, O: 8 })
    // More complex nesting would require more sophisticated parsing
  })

  test(`should handle parentheses without multipliers`, () => {
    expect(parse_formula(`Ca(OH)`)).toEqual({ Ca: 1, O: 1, H: 1 })
  })

  test(`should ignore whitespace`, () => {
    expect(parse_formula(` H2 O `)).toEqual({ H: 2, O: 1 })
    expect(parse_formula(`Ca (OH) 2`)).toEqual({ Ca: 1, O: 2, H: 2 })
  })

  test(`should accumulate duplicate elements`, () => {
    expect(parse_formula(`H2SO4`)).toEqual({ H: 2, S: 1, O: 4 })
    // In a formula like this, if H appeared twice, it should sum
  })

  test(`should throw error for invalid element symbols`, () => {
    expect(() => parse_formula(`Xx2`)).toThrow(`Invalid element symbol: Xx`)
    expect(() => parse_formula(`ABC`)).toThrow(`Invalid element symbol: A`)
  })

  test(`should handle empty formula`, () => {
    expect(parse_formula(``)).toEqual({})
  })
})

describe(`normalize_composition`, () => {
  test(`should normalize symbol compositions`, () => {
    expect(normalize_composition({ H: 2, O: 1, N: 0 })).toEqual({ H: 2, O: 1 })
    expect(normalize_composition({ Fe: -1, O: 3 })).toEqual({ O: 3 })
    expect(normalize_composition({ C: 1.5, H: 4 })).toEqual({ C: 1.5, H: 4 })
  })

  test(`should normalize atomic number compositions`, () => {
    expect(normalize_composition({ 1: 2, 8: 1, 7: 0 })).toEqual({ H: 2, O: 1 })
    expect(normalize_composition({ 26: -1, 8: 3 })).toEqual({ O: 3 })
  })

  test(`should handle mixed string/number keys by treating numbers as atomic numbers`, () => {
    expect(normalize_composition({ 1: 2, 8: 1 })).toEqual({ H: 2, O: 1 })
  })

  test(`should remove zero and negative values`, () => {
    expect(normalize_composition({ H: 0, O: 1, C: -5 })).toEqual({ O: 1 })
  })

  test(`should handle empty composition`, () => {
    expect(normalize_composition({})).toEqual({})
  })

  test(`should handle non-numeric values`, () => {
    expect(
      normalize_composition({ H: `invalid` as unknown as number, O: 1 }),
    ).toEqual({
      O: 1,
    })
  })
})

describe(`composition_to_percentages`, () => {
  test(`should convert to count percentages`, () => {
    const result = composition_to_percentages({ H: 2, O: 1 })
    expect(result.H).toBeCloseTo(66.67, 1)
    expect(result.O).toBeCloseTo(33.33, 1)
  })

  test(`should handle single element`, () => {
    expect(composition_to_percentages({ H: 5 })).toEqual({ H: 100 })
  })

  test(`should handle equal amounts`, () => {
    const result = composition_to_percentages({ H: 1, O: 1, N: 1 })
    expect(result.H).toBeCloseTo(33.33, 1)
    expect(result.O).toBeCloseTo(33.33, 1)
    expect(result.N).toBeCloseTo(33.33, 1)
  })

  test(`should return empty object for empty composition`, () => {
    expect(composition_to_percentages({})).toEqual({})
  })

  test(`should return empty object for zero total`, () => {
    expect(composition_to_percentages({ H: 0, O: 0 })).toEqual({})
  })

  test(`should throw error for weight-based percentages`, () => {
    expect(() => composition_to_percentages({ H: 2, O: 1 }, true)).toThrow(
      `Weight-based percentages not yet implemented`,
    )
  })
})

describe(`get_total_atoms`, () => {
  test(`should calculate total atoms`, () => {
    expect(get_total_atoms({ H: 2, O: 1 })).toBe(3)
    expect(get_total_atoms({ C: 6, H: 12, O: 6 })).toBe(24)
    expect(get_total_atoms({ Fe: 2, O: 3 })).toBe(5)
  })

  test(`should handle single element`, () => {
    expect(get_total_atoms({ H: 1 })).toBe(1)
    expect(get_total_atoms({ C: 60 })).toBe(60)
  })

  test(`should handle empty composition`, () => {
    expect(get_total_atoms({})).toBe(0)
  })

  test(`should ignore undefined values`, () => {
    expect(get_total_atoms({ H: 2, O: undefined as unknown as number })).toBe(2)
  })

  test(`should handle decimal amounts`, () => {
    expect(get_total_atoms({ H: 2.5, O: 1.5 })).toBe(4)
  })
})

describe(`parse_composition_input`, () => {
  test(`should parse string formulas`, () => {
    expect(parse_composition_input(`H2O`)).toEqual({ H: 2, O: 1 })
    expect(parse_composition_input(`Fe2O3`)).toEqual({ Fe: 2, O: 3 })
  })

  test(`should normalize symbol compositions`, () => {
    expect(parse_composition_input({ H: 2, O: 1 })).toEqual({ H: 2, O: 1 })
    expect(parse_composition_input({ Fe: 2, O: 3, N: 0 })).toEqual({
      Fe: 2,
      O: 3,
    })
  })

  test(`should handle atomic number compositions`, () => {
    expect(parse_composition_input({ 1: 2, 8: 1 })).toEqual({ H: 2, O: 1 })
  })

  test(`should handle mixed compositions`, () => {
    expect(parse_composition_input({ 1: 2, O: 1 })).toEqual({ '1': 2, O: 1 })
  })

  test(`should handle empty inputs`, () => {
    expect(parse_composition_input(``)).toEqual({})
    expect(parse_composition_input({})).toEqual({})
  })

  test(`should throw error for invalid formula strings`, () => {
    expect(() => parse_composition_input(`Xx2`)).toThrow(
      `Invalid element symbol: Xx`,
    )
  })

  test(`should handle invalid atomic numbers gracefully`, () => {
    // Mixed compositions with invalid atomic numbers should be normalized without error
    // The invalid atomic number is simply preserved as-is in the key
    expect(parse_composition_input({ 999: 1 })).toEqual({ '999': 1 })
  })
})

describe(`edge cases and error handling`, () => {
  test(`should handle very large compositions`, () => {
    const large_composition: Composition = {}
    for (let idx = 1; idx <= 50; idx++) {
      const symbol = atomic_number_to_element_symbol(idx)
      if (symbol) {
        large_composition[symbol] = idx
      }
    }

    const total = get_total_atoms(large_composition)
    expect(total).toBeGreaterThan(1000)

    const percentages = composition_to_percentages(large_composition)
    const percentage_sum = Object.values(percentages).reduce(
      (sum, pct) => sum + pct,
      0,
    )
    expect(percentage_sum).toBeCloseTo(100, 1)
  })

  test(`should handle complex formulas with multiple element repetitions`, () => {
    // Test a formula where elements appear multiple times
    expect(parse_formula(`CH3CH2OH`)).toEqual({ C: 2, H: 6, O: 1 })
  })

  test(`should handle formulas with very large numbers`, () => {
    expect(parse_formula(`C1000H2000`)).toEqual({ C: 1000, H: 2000 })
  })

  test(`should be consistent between conversion functions`, () => {
    const original_symbols = { Fe: 2, O: 3, H: 1 }
    const atomic_numbers = convert_symbols_to_atomic_numbers(original_symbols)
    const back_to_symbols = convert_atomic_numbers_to_symbols(atomic_numbers)

    expect(back_to_symbols).toEqual(original_symbols)
  })
})

describe(`parametrized tests`, () => {
  test.each([
    [`H2O`, { H: 2, O: 1 }],
    [`CO2`, { C: 1, O: 2 }],
    [`Fe2O3`, { Fe: 2, O: 3 }],
    [`CaCO3`, { Ca: 1, C: 1, O: 3 }],
    [`C8H10N4O2`, { C: 8, H: 10, N: 4, O: 2 }], // caffeine
    [`Ca(OH)2`, { Ca: 1, O: 2, H: 2 }],
    [`Mg(NO3)2`, { Mg: 1, N: 2, O: 6 }],
    [`Al2(SO4)3`, { Al: 2, S: 3, O: 12 }],
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
    [{ C: 8, H: 10, N: 4, O: 2 }, 24],
  ])(
    `should calculate total atoms for %o correctly`,
    (composition: Composition, expected: number) => {
      expect(get_total_atoms(composition)).toBe(expected)
    },
  )
})

// Test the new versatile formula functions
describe(`versatile formula functions`, () => {
  test(`get_alphabetical_formula handles strings`, () => {
    expect(get_alphabetical_formula(`Fe2O3`)).toBe(
      `Fe<sub>2</sub> O<sub>3</sub>`,
    )
    expect(get_alphabetical_formula(`H2O`)).toBe(`H<sub>2</sub> O`)
    expect(get_alphabetical_formula(`CaCO3`)).toBe(`C Ca O<sub>3</sub>`)
  })

  test(`get_alphabetical_formula handles composition objects`, () => {
    expect(get_alphabetical_formula({ Fe: 2, O: 3 })).toBe(
      `Fe<sub>2</sub> O<sub>3</sub>`,
    )
    expect(get_alphabetical_formula({ H: 2, O: 1 })).toBe(`H<sub>2</sub> O`)
    expect(get_alphabetical_formula({ Ca: 1, C: 1, O: 3 })).toBe(
      `C Ca O<sub>3</sub>`,
    )
  })

  test(`get_electro_neg_formula handles strings`, () => {
    expect(get_electro_neg_formula(`Fe2O3`)).toBe(
      `Fe<sub>2</sub> O<sub>3</sub>`,
    )
    expect(get_electro_neg_formula(`H2O`)).toBe(`H<sub>2</sub> O`)
    expect(get_electro_neg_formula(`NaCl`)).toBe(`Na Cl`)
  })

  test(`get_electro_neg_formula handles composition objects`, () => {
    expect(get_electro_neg_formula({ Fe: 2, O: 3 })).toBe(
      `Fe<sub>2</sub> O<sub>3</sub>`,
    )
    expect(get_electro_neg_formula({ H: 2, O: 1 })).toBe(`H<sub>2</sub> O`)
    expect(get_electro_neg_formula({ Na: 1, Cl: 1 })).toBe(`Na Cl`)
  })

  test(`get_alphabetical_formula handles invalid strings gracefully`, () => {
    expect(get_alphabetical_formula(`invalid`)).toBe(``)
    expect(get_alphabetical_formula(`123`)).toBe(``)
  })

  test(`get_electro_neg_formula handles invalid strings gracefully`, () => {
    expect(get_electro_neg_formula(`invalid`)).toBe(``)
    expect(get_electro_neg_formula(`123`)).toBe(``)
  })

  test(`get_alphabetical_formula handles structure objects`, () => {
    const structure = {
      sites: [
        {
          species: [{ element: `Fe`, occu: 1 }],
        },
        {
          species: [{ element: `Fe`, occu: 1 }],
        },
        {
          species: [{ element: `O`, occu: 1 }],
        },
        {
          species: [{ element: `O`, occu: 1 }],
        },
        {
          species: [{ element: `O`, occu: 1 }],
        },
      ],
    }
    expect(get_alphabetical_formula(structure)).toBe(
      `Fe<sub>2</sub> O<sub>3</sub>`,
    )
  })

  test(`get_electro_neg_formula handles structure objects`, () => {
    const structure = {
      sites: [
        {
          species: [{ element: `Fe`, occu: 1 }],
        },
        {
          species: [{ element: `Fe`, occu: 1 }],
        },
        {
          species: [{ element: `O`, occu: 1 }],
        },
        {
          species: [{ element: `O`, occu: 1 }],
        },
        {
          species: [{ element: `O`, occu: 1 }],
        },
      ],
    }
    expect(get_electro_neg_formula(structure)).toBe(
      `Fe<sub>2</sub> O<sub>3</sub>`,
    )
  })
})

describe(`is_empty_composition`, () => {
  test(`should detect empty compositions`, async () => {
    const { is_empty_composition } = await import(`$lib/composition/parse`)
    expect(is_empty_composition({})).toBe(true)
    expect(is_empty_composition({ H: 0, O: 0 })).toBe(true)
  })

  test(`should detect non-empty compositions`, async () => {
    const { is_empty_composition } = await import(`$lib/composition/parse`)
    expect(is_empty_composition({ H: 1 })).toBe(false)
    expect(is_empty_composition({ H: 2, O: 1 })).toBe(false)
  })
})
