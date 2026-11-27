import { describe, expect, it } from 'vitest'
import { recommend } from '../src/services/recommend/engine'
import {
  isWearable,
  statusAfterArchive,
  statusAfterSendWash,
  statusAfterUnarchive,
  statusAfterWash,
  statusAfterWear,
} from '../src/services/wear/statusFlow'
import type { Garment, GarmentStatus } from '../src/types'

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

const cond = { scene: '日常', temp: 18, season: '春' as const, rain: false, wind: false, topN: 5 }
const bottom = garment({ id: 'bottom', category: 'bottom', layerRole: 'bottom', subCategory: '长裤', tempMin: 8, tempMax: 28 })

describe('可穿着判定', () => {
  it('可用与待清洗可穿，洗中与归档不可穿', () => {
    expect(isWearable('available')).toBe(true)
    expect(isWearable('needsWash')).toBe(true)
    expect(isWearable('washing')).toBe(false)
    expect(isWearable('archived')).toBe(false)
  })
})

describe('状态流转', () => {
  it('穿着计数达到阈值时变为待清洗，回落时回到可用', () => {
    const g = garment({ status: 'available', washThreshold: 3 })
    expect(statusAfterWear(g, 2)).toBe('available')
    expect(statusAfterWear(g, 3)).toBe('needsWash')
    expect(statusAfterWear({ ...g, status: 'needsWash' }, 2)).toBe('available')
  })

  it('洗中/归档件不会被穿着计数逻辑复活', () => {
    const states: GarmentStatus[] = ['washing', 'archived']
    for (const status of states) {
      expect(statusAfterWear(garment({ status, washThreshold: 1 }), 9)).toBe(status)
    }
  })

  it('洗完后只有归档件保持不变，其余回到可用', () => {
    expect(statusAfterWash('needsWash')).toBe('available')
    expect(statusAfterWash('washing')).toBe('available')
    expect(statusAfterWash('available')).toBe('available')
    expect(statusAfterWash('archived')).toBe('archived')
  })

  it('送洗与归档只作用于可穿着状态', () => {
    expect(statusAfterSendWash('available')).toBe('washing')
    expect(statusAfterSendWash('needsWash')).toBe('washing')
    expect(statusAfterSendWash('washing')).toBe('washing')
    expect(statusAfterSendWash('archived')).toBe('archived')

    expect(statusAfterArchive('available')).toBe('archived')
    expect(statusAfterArchive('needsWash')).toBe('archived')
    expect(statusAfterArchive('washing')).toBe('washing')
    expect(statusAfterUnarchive('archived')).toBe('available')
    expect(statusAfterUnarchive('washing')).toBe('washing')
  })
})

describe('推荐过滤跟随后状态', () => {
  it('待清洗单品仍参与搭配', () => {
    const top = garment({ id: 'top', status: 'needsWash', wearsSinceWash: 9 })
    const outfits = recommend([top, bottom], cond)
    expect(outfits.length).toBeGreaterThan(0)
    expect(outfits.some((o) => o.garmentIds.includes('top'))).toBe(true)
  })

  it('洗中与归档单品不参与搭配', () => {
    for (const status of ['washing', 'archived'] as GarmentStatus[]) {
      const top = garment({ id: `top-${status}`, status })
      const outfits = recommend([top, bottom], cond)
      expect(outfits.length).toBe(0)
    }
  })

  it('鞋履同样遵循可穿着判定', () => {
    const top = garment({ id: 'top' })
    const shoeOf = (id: string, status: GarmentStatus) => garment({
      id, status, category: 'shoes', layerRole: 'accessory',
      subCategory: '运动鞋', tempMin: 8, tempMax: 28,
    })

    const wearable = recommend([top, bottom, shoeOf('shoe-ok', 'needsWash')], cond)
    expect(wearable.length).toBeGreaterThan(0)
    expect(wearable[0].garmentIds).toContain('shoe-ok')

    const washing = recommend([top, bottom, shoeOf('shoe-washing', 'washing')], cond)
    expect(washing.every((o) => !o.garmentIds.includes('shoe-washing'))).toBe(true)
  })
})
