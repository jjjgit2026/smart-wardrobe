import { describe, expect, it } from 'vitest'
import { scoreOutfit } from '../src/services/recommend/score'
import { recommend } from '../src/services/recommend/engine'
import type { Garment } from '../src/types'

function garment(overrides: Partial<Garment>): Garment {
  return {
    id: Math.random().toString(36).slice(2),
    category: 'top', subCategory: '上衣', colorName: '米色', dominantColor: '#D9C7AC',
    thickness: 3, sleeveLength: 'long', materialLook: '棉',
    seasons: ['春', '秋'], tempMin: 14, tempMax: 26, layerRole: 'inner',
    styleTags: [], sceneBlacklist: [], status: 'available',
    wearCount: 2, wearsSinceWash: 1, washThreshold: 5,
    isHumanCorrected: true, createdAt: 1, updatedAt: 1,
    ...overrides,
  }
}

const ctx = { scene: '日常', meanWearByCategory: { top: 3, bottom: 3, outerwear: 2 }, now: Date.now() }

describe('scoreOutfit', () => {
  it('温度落在区间中心时温度分更高', () => {
    const items = [garment({ tempMin: 10, tempMax: 30 })]
    const center = scoreOutfit(items, { ...ctx, temp: 20 }).parts.tempFit
    const edge = scoreOutfit(items, { ...ctx, temp: 10 }).parts.tempFit
    expect(center).toBeGreaterThan(edge)
  })

  it('命中场景黑名单时场景分为 0', () => {
    const items = [garment({ sceneBlacklist: ['正式'] })]
    expect(scoreOutfit(items, { ...ctx, temp: 20, scene: '正式' }).parts.sceneFit).toBe(0)
  })

  it('中性色搭配的色彩协调分最高', () => {
    const items = [garment({ dominantColor: '#FFFFFF' }), garment({ dominantColor: '#333333', layerRole: 'bottom', category: 'bottom' })]
    expect(scoreOutfit(items, { ...ctx, temp: 20 }).parts.colorHarmony).toBe(0.95)
  })
})

describe('recommend 硬约束', () => {
  const items = [
    garment({ id: 'top', tempMin: 10, tempMax: 26 }),
    garment({ id: 'bottom', category: 'bottom', layerRole: 'bottom', tempMin: 8, tempMax: 28, subCategory: '长裤' }),
    garment({ id: 'outer', category: 'outerwear', layerRole: 'outer', tempMin: 0, tempMax: 16, thickness: 4, subCategory: '大衣' }),
  ]

  it('下雨时必须包含外层', () => {
    const results = recommend(items, { scene: '日常', temp: 12, season: '秋', rain: true, wind: false, topN: 5 })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((o) => o.garmentIds.includes('outer'))).toBe(true)
  })

  it('高温天排除厚外套', () => {
    const results = recommend(items, { scene: '日常', temp: 33, season: '夏', rain: false, wind: false, topN: 5 })
    expect(results.every((o) => !o.garmentIds.includes('outer'))).toBe(true)
  })

  it('大风天强制包含外层，且理由说明挡风', () => {
    const results = recommend(items, { scene: '日常', temp: 12, season: '秋', rain: false, wind: true, topN: 5 })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((o) => o.garmentIds.includes('outer'))).toBe(true)
    expect(results.every((o) => o.reasons.some((r) => r.includes('大风')))).toBe(true)
  })

  it('无风无雨时不强制外层', () => {
    const results = recommend(items, { scene: '日常', temp: 20, season: '秋', rain: false, wind: false, topN: 5 })
    expect(results.some((o) => !o.garmentIds.includes('outer'))).toBe(true)
  })
})
