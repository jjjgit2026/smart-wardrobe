import { describe, expect, it } from 'vitest'
import { deriveGarmentRules, outfitTempRange } from '../src/services/rules/derive'

describe('deriveGarmentRules', () => {
  it('薄短袖 T 恤归入夏装并抬高下界', () => {
    const r = deriveGarmentRules({
      category: 'top', subCategory: '白T恤', thickness: 1,
      sleeveLength: 'short', materialLook: '棉',
    })
    expect(r.seasons).toContain('夏')
    expect(r.tempMin).toBe(26)
    expect(r.tempMax).toBe(36)
    expect(r.layerRole).toBe('inner')
  })

  it('羽绒服归入冬装，羽绒材质压低上界', () => {
    const r = deriveGarmentRules({
      category: 'outerwear', subCategory: '羽绒服', thickness: 5,
      sleeveLength: 'long', materialLook: '羽绒',
    })
    expect(r.seasons).toEqual(['冬'])
    expect(r.tempMin).toBe(-12)
    expect(r.tempMax).toBe(6)
  })

  it('叠穿时整套上界由内层决定并再降 2 度', () => {
    const r = outfitTempRange([
      { tempMin: 14, tempMax: 26, layerRole: 'inner' },
      { tempMin: 8, tempMax: 22, layerRole: 'outer' },
    ])
    expect(r).toEqual([8, 24])
  })
})
