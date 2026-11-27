import { describe, expect, it } from 'vitest'
import { recommend } from '../src/services/recommend/engine'
import { rolesOf } from '../src/services/rules/layerLabels'
import { outfitTempRange } from '../src/services/rules/derive'
import type { Garment } from '../src/types'

function garment(overrides: Partial<Garment>): Garment {
  return {
    id: Math.random().toString(36).slice(2),
    category: 'top', subCategory: '上衣', colorName: '米色', dominantColor: '#D9C7AC',
    thickness: 3, sleeveLength: 'long', materialLook: '棉',
    seasons: ['春', '秋'], tempMin: 10, tempMax: 26, layerRole: 'inner',
    styleTags: [], sceneBlacklist: [], status: 'available',
    wearCount: 2, wearsSinceWash: 1, washThreshold: 5,
    isHumanCorrected: true, createdAt: 1, updatedAt: 1,
    ...overrides,
  }
}

describe('rolesOf 层级读取', () => {
  it('旧数据无 layerRoles 时回退到 layerRole', () => {
    expect(rolesOf(garment({ layerRole: 'inner' }))).toEqual(['inner'])
  })

  it('有新字段时返回多层级', () => {
    expect(rolesOf(garment({ layerRole: 'inner', layerRoles: ['inner', 'outer'] }))).toEqual(['inner', 'outer'])
  })
})

describe('多层级衣服参与搭配', () => {
  const bottom = garment({ id: 'bottom', category: 'bottom', layerRole: 'bottom', tempMin: 8, tempMax: 28 })

  it('同时可内可外的开衫可作为外层满足大风强制外套', () => {
    const cardigan = garment({ id: 'cardigan', layerRole: 'inner', layerRoles: ['inner', 'outer'] })
    const results = recommend([cardigan, bottom], { scene: '日常', temp: 12, season: '冬', rain: false, wind: true, topN: 5 })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((o) => o.garmentIds.includes('cardigan'))).toBe(true)
  })

  it('同一件多层级衣服不会被同时当作内层和外层穿两次', () => {
    const cardigan = garment({ id: 'cardigan', layerRole: 'inner', layerRoles: ['inner', 'outer'] })
    const results = recommend([cardigan, bottom], { scene: '日常', temp: 12, season: '冬', rain: false, wind: false, topN: 10 })
    for (const o of results) {
      expect(new Set(o.garmentIds).size).toBe(o.garmentIds.length)
    }
  })

  it('outfitTempRange 把多层级衣服的外层身份计入', () => {
    const cardigan = garment({ layerRole: 'inner', layerRoles: ['inner', 'outer'], tempMin: 8, tempMax: 26 })
    const [min, max] = outfitTempRange([cardigan, bottom])
    expect(min).toBe(8)
    expect(max).toBeLessThanOrEqual(26)
  })
})
