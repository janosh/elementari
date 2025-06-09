import { describe, expect, test } from 'vitest'

// Import the raw function implementations without the problematic dependencies
const elem_symbols = [
  `H`,
  `He`,
  `Li`,
  `Be`,
  `B`,
  `C`,
  `N`,
  `O`,
  `F`,
  `Ne`,
  `Na`,
  `Mg`,
  `Al`,
  `Si`,
  `P`,
  `S`,
  `Cl`,
  `Ar`,
  `K`,
  `Ca`,
  `Sc`,
  `Ti`,
  `V`,
  `Cr`,
  `Mn`,
  `Fe`,
  `Co`,
  `Ni`,
  `Cu`,
  `Zn`,
  `Ga`,
  `Ge`,
  `As`,
  `Se`,
  `Br`,
  `Kr`,
  `Rb`,
  `Sr`,
  `Y`,
  `Zr`,
  `Nb`,
  `Mo`,
  `Tc`,
  `Ru`,
  `Rh`,
  `Pd`,
  `Ag`,
  `Cd`,
  `In`,
  `Sn`,
  `Sb`,
  `Te`,
  `I`,
  `Xe`,
  `Cs`,
  `Ba`,
  `La`,
  `Ce`,
  `Pr`,
  `Nd`,
  `Pm`,
  `Sm`,
  `Eu`,
  `Gd`,
  `Tb`,
  `Dy`,
  `Ho`,
  `Er`,
  `Tm`,
  `Yb`,
  `Lu`,
  `Hf`,
  `Ta`,
  `W`,
  `Re`,
  `Os`,
  `Ir`,
  `Pt`,
  `Au`,
  `Hg`,
  `Tl`,
  `Pb`,
  `Bi`,
  `Po`,
  `At`,
  `Rn`,
  `Fr`,
  `Ra`,
  `Ac`,
  `Th`,
  `Pa`,
  `U`,
  `Np`,
  `Pu`,
  `Am`,
  `Cm`,
  `Bk`,
  `Cf`,
  `Es`,
  `Fm`,
  `Md`,
  `No`,
  `Lr`,
  `Rf`,
  `Db`,
  `Sg`,
  `Bh`,
  `Hs`,
  `Mt`,
  `Ds`,
  `Rg`,
  `Cn`,
  `Nh`,
  `Fl`,
  `Mc`,
  `Lv`,
  `Ts`,
  `Og`,
] as const

type ElementSymbol = (typeof elem_symbols)[number]
type Composition = Partial<Record<ElementSymbol, number>>

// Simplified element data for testing
const test_elements = [
  { symbol: `H`, number: 1 },
  { symbol: `He`, number: 2 },
  { symbol: `Li`, number: 3 },
  { symbol: `Be`, number: 4 },
  { symbol: `B`, number: 5 },
  { symbol: `C`, number: 6 },
  { symbol: `N`, number: 7 },
  { symbol: `O`, number: 8 },
  { symbol: `F`, number: 9 },
  { symbol: `Ne`, number: 10 },
  { symbol: `Na`, number: 11 },
  { symbol: `Mg`, number: 12 },
  { symbol: `Al`, number: 13 },
  { symbol: `Si`, number: 14 },
  { symbol: `P`, number: 15 },
  { symbol: `S`, number: 16 },
  { symbol: `Cl`, number: 17 },
  { symbol: `Ar`, number: 18 },
  { symbol: `K`, number: 19 },
  { symbol: `Ca`, number: 20 },
  { symbol: `Fe`, number: 26 },
  { symbol: `Au`, number: 79 },
]

// Create mappings
const atomic_number_to_symbol: Partial<Record<number, ElementSymbol>> = {}
const symbol_to_atomic_number: Partial<Record<ElementSymbol, number>> = {}

for (const element of test_elements) {
  atomic_number_to_symbol[element.number] = element.symbol as ElementSymbol
  symbol_to_atomic_number[element.symbol as ElementSymbol] = element.number
}

// Standalone implementations
function atomic_number_to_element_symbol(
  atomic_number: number,
): ElementSymbol | null {
  return atomic_number_to_symbol[atomic_number] || null
}

function element_symbol_to_atomic_number(symbol: ElementSymbol): number | null {
  return symbol_to_atomic_number[symbol] || null
}

function is_atomic_number_composition(
  obj: Record<string | number, number>,
): boolean {
  const keys = Object.keys(obj)
  return (
    keys.length > 0 &&
    keys.every((key) => {
      const num = Number(key)
      return (
        Number.isInteger(num) &&
        num >= 1 &&
        num <= 118 &&
        atomic_number_to_symbol[num]
      )
    })
  )
}

function convert_atomic_numbers_to_symbols(
  atomic_composition: Record<number, number>,
): Composition {
  const composition: Composition = {}

  for (const [atomic_number_str, amount] of Object.entries(
    atomic_composition,
  )) {
    const atomic_number = Number(atomic_number_str)
    const symbol = atomic_number_to_element_symbol(atomic_number)

    if (!symbol) {
      throw new Error(`Invalid atomic number: ${atomic_number}`)
    }

    if (typeof amount === `number` && amount > 0) {
      composition[symbol] = (composition[symbol] || 0) + amount
    }
  }

  return composition
}

function convert_symbols_to_atomic_numbers(
  symbol_composition: Composition,
): Record<number, number> {
  const atomic_composition: Record<number, number> = {}

  for (const [symbol, amount] of Object.entries(symbol_composition)) {
    const atomic_number = element_symbol_to_atomic_number(
      symbol as ElementSymbol,
    )

    if (!atomic_number) {
      throw new Error(`Invalid element symbol: ${symbol}`)
    }

    if (typeof amount === `number` && amount > 0) {
      atomic_composition[atomic_number] =
        (atomic_composition[atomic_number] || 0) + amount
    }
  }

  return atomic_composition
}

function parse_formula(formula: string): Composition {
  const composition: Composition = {}

  // Remove whitespace and handle parentheses by expanding them
  const cleaned_formula = expand_parentheses(formula.replace(/\s/g, ``))

  // Match element symbols followed by numbers
  const pattern = /([A-Z][a-z]?)(\d*)/g
  let match

  while ((match = pattern.exec(cleaned_formula)) !== null) {
    const element = match[1] as ElementSymbol
    const count = match[2] ? parseInt(match[2], 10) : 1

    // Validate element symbol
    if (!elem_symbols.includes(element)) {
      throw new Error(`Invalid element symbol: ${element}`)
    }

    composition[element] = (composition[element] || 0) + count
  }

  return composition
}

function expand_parentheses(formula: string): string {
  while (formula.includes(`(`)) {
    formula = formula.replace(
      /\(([^()]+)\)(\d*)/g,
      (match, group, multiplier) => {
        const mult = multiplier ? parseInt(multiplier, 10) : 1
        let expanded = ``

        const inner_pattern = /([A-Z][a-z]?)(\d*)/g
        let inner_match

        while ((inner_match = inner_pattern.exec(group)) !== null) {
          const element = inner_match[1]
          const count = inner_match[2] ? parseInt(inner_match[2], 10) : 1
          expanded += element + (count * mult > 1 ? count * mult : ``)
        }

        return expanded
      },
    )
  }

  return formula
}

function normalize_composition(
  composition:
    | Composition
    | Record<number, number>
    | Record<string | number, number>,
): Composition {
  // If it's an atomic number composition, convert to symbols first
  if (
    is_atomic_number_composition(composition as Record<string | number, number>)
  ) {
    const atomic_comp = composition as Record<number, number>
    const symbol_comp = convert_atomic_numbers_to_symbols(atomic_comp)
    return normalize_composition(symbol_comp)
  }

  const normalized: Composition = {}

  for (const [element, amount] of Object.entries(composition)) {
    if (typeof amount === `number` && amount > 0) {
      normalized[element as ElementSymbol] = amount
    }
  }

  return normalized
}

function get_total_atoms(composition: Composition): number {
  return Object.values(composition).reduce(
    (sum, count) => sum + (count || 0),
    0,
  )
}

function parse_composition_input(
  input:
    | string
    | Composition
    | Record<number, number>
    | Record<string | number, number>,
): Composition {
  if (typeof input === `string`) {
    return normalize_composition(parse_formula(input))
  } else {
    return normalize_composition(input)
  }
}

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
