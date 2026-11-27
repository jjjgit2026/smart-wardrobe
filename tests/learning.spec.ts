import { describe, expect, it } from 'vitest'
import { buildPreferenceModel, preferenceScore } from '../src/services/recommend/preference'
import { recommend } from '../src/services/recommend/engine'
import type { Feedback, Garment } from '../src/types'

function garment(overrides: Partial<Garment>): Garment {
  return {
    id: Math.random().toString(36).slice(2),
    category: 'top', subCategory: '上衣', colorName: '蓝色', dominantColor: '#4A6E96',
    thickness: 3, sleeveLength: 'long', materialLook: '棉',
    seasons: ['春', '秋'], tempMin: 14, tempMax: 26, layerRole: 'inner',
    styleTags: ['休闲'], sceneBlacklist: [], status: 'available',
    wearCount: 2, wearsSinceWash: 1, washThreshold: 5,
    isHumanCorrected: true, createdAt: 1, updatedAt: 1,
    ...overrides,
  }
}

function feedback(garmentIds: string[], action: 'accept' | 'reject', i: number): Feedback {
  return {
    id: `fb-${i}`,
    outfitId: `o-${i}`,
    action,
    scene: '日常',
    garmentIds,
    createdAt: i,
  }
}

describe('buildPreferenceModel', () => {
  const warm = garment({ id: 'warm', colorName: '焦糖色', styleTags: ['通勤'] })
  const cool = garment({ id: 'cool', colorName: '藏青色', styleTags: ['休闲'] })

  it('样本不足时未就绪，偏好分保持中性', () => {
    const fb = Array.from({ length: 9 }, (_, i) => feedback(['warm'], 'accept', i))
    const model = buildPreferenceModel(fb, [warm, cool])
    expect(model.ready).toBe(false)
    expect(preferenceScore([warm], model)).toBe(0.5)
  })

  it('反复采纳的颜色偏好分高于反复拒绝的颜色', () => {
    const fb = Array.from({ length: 12 }, (_, i) =>
      feedback([i % 2 === 0 ? 'warm' : 'cool'], i % 2 === 0 ? 'accept' : 'reject', i)
    )
    const model = buildPreferenceModel(fb, [warm, cool])
    expect(model.ready).toBe(true)
    expect(preferenceScore([warm], model)).toBeGreaterThan(0.5)
    expect(preferenceScore([cool], model)).toBeLessThan(0.5)
  })

  it('忽略没有单品列表的旧反馈', () => {
    const legacy = { id: 'old', outfitId: 'o', action: 'accept', scene: '日常', createdAt: 1 } as Feedback
    const model = buildPreferenceModel([legacy], [warm, cool])
    expect(model.sampleCount).toBe(0)
  })
})

describe('鞋履搭配', () => {
  const top = garment({ id: 'top', tempMin: 10, tempMax: 26 })
  const bottom = garment({ id: 'bottom', category: 'bottom', layerRole: 'bottom', tempMin: 8, tempMax: 28, subCategory: '长裤' })
  const shoe = garment({ id: 'shoe', category: 'shoes', layerRole: 'accessory', tempMin: -20, tempMax: 40, subCategory: '运动鞋' })

  it('有可用鞋时为每套搭配附加一双', () => {
    const results = recommend([top, bottom, shoe], { scene: '日常', temp: 18, season: '秋', rain: false, wind: false, topN: 3 })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((o) => o.garmentIds.includes('shoe'))).toBe(true)
    expect(results.every((o) => o.shoeId === 'shoe')).toBe(true)
  })

  it('鞋子不改变整套温度区间', () => {
    const without = recommend([top, bottom], { scene: '日常', temp: 18, season: '秋', rain: false, wind: false, topN: 1 })
    const withShoe = recommend([top, bottom, shoe], { scene: '日常', temp: 18, season: '秋', rain: false, wind: false, topN: 1 })
    expect(withShoe[0].tempRange).toEqual(without[0].tempRange)
  })

  it('待清洗的鞋仍参与搭配', () => {
    const dirty = { ...shoe, status: 'needsWash' as const }
    const results = recommend([top, bottom, dirty], { scene: '日常', temp: 18, season: '秋', rain: false, wind: false, topN: 3 })
    expect(results.every((o) => o.garmentIds.includes('shoe'))).toBe(true)
  })

  it('洗中的鞋不参与搭配', () => {
    const washing = { ...shoe, status: 'washing' as const }
    const results = recommend([top, bottom, washing], { scene: '日常', temp: 18, season: '秋', rain: false, wind: false, topN: 3 })
    expect(results.every((o) => !o.garmentIds.includes('shoe'))).toBe(true)
  })

  it('场景黑名单中的鞋不参与搭配', () => {
    const formal = garment({ id: 'formal-shoe', category: 'shoes', layerRole: 'accessory', subCategory: '皮鞋', tempMin: -20, tempMax: 40, sceneBlacklist: ['运动'] })
    const results = recommend([top, bottom, formal], { scene: '运动', temp: 18, season: '秋', rain: false, wind: false, topN: 3 })
    expect(results.every((o) => !o.garmentIds.includes('formal-shoe'))).toBe(true)
  })
})
