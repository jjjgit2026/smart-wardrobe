import type { Category, LayerRole, Season, Thickness } from '../../types'

export interface TempRule {
  seasons: Season[]
  tempMin: number
  tempMax: number
  layerRole: LayerRole
}

type ThicknessMap = Record<Thickness, TempRule>

const ALL: Season[] = ['春', '夏', '秋', '冬']

export const TEMP_RULES: Record<Category, ThicknessMap> = {
  top: {
    1: { seasons: ['夏'], tempMin: 24, tempMax: 36, layerRole: 'inner' },
    2: { seasons: ['春', '夏', '秋'], tempMin: 18, tempMax: 30, layerRole: 'inner' },
    3: { seasons: ['春', '秋'], tempMin: 12, tempMax: 26, layerRole: 'inner' },
    4: { seasons: ['秋', '冬'], tempMin: 6, tempMax: 18, layerRole: 'inner' },
    5: { seasons: ['冬'], tempMin: -5, tempMax: 12, layerRole: 'inner' },
  },
  bottom: {
    1: { seasons: ['夏'], tempMin: 24, tempMax: 36, layerRole: 'bottom' },
    2: { seasons: ['春', '夏', '秋'], tempMin: 16, tempMax: 30, layerRole: 'bottom' },
    3: { seasons: ALL, tempMin: 6, tempMax: 28, layerRole: 'bottom' },
    4: { seasons: ['秋', '冬'], tempMin: -2, tempMax: 16, layerRole: 'bottom' },
    5: { seasons: ['冬'], tempMin: -10, tempMax: 10, layerRole: 'bottom' },
  },
  outerwear: {
    1: { seasons: ['春', '夏'], tempMin: 18, tempMax: 30, layerRole: 'outer' },
    2: { seasons: ['春', '秋'], tempMin: 14, tempMax: 26, layerRole: 'outer' },
    3: { seasons: ['春', '秋'], tempMin: 8, tempMax: 22, layerRole: 'outer' },
    4: { seasons: ['冬'], tempMin: -2, tempMax: 14, layerRole: 'outer' },
    5: { seasons: ['冬'], tempMin: -12, tempMax: 8, layerRole: 'outer' },
  },
  onePiece: {
    1: { seasons: ['夏'], tempMin: 23, tempMax: 36, layerRole: 'onePiece' },
    2: { seasons: ['春', '夏', '秋'], tempMin: 16, tempMax: 30, layerRole: 'onePiece' },
    3: { seasons: ['春', '秋'], tempMin: 10, tempMax: 24, layerRole: 'onePiece' },
    4: { seasons: ['秋', '冬'], tempMin: 2, tempMax: 16, layerRole: 'onePiece' },
    5: { seasons: ['冬'], tempMin: -8, tempMax: 10, layerRole: 'onePiece' },
  },
  shoes: {
    1: { seasons: ALL, tempMin: -20, tempMax: 40, layerRole: 'accessory' },
    2: { seasons: ALL, tempMin: -20, tempMax: 40, layerRole: 'accessory' },
    3: { seasons: ALL, tempMin: -20, tempMax: 40, layerRole: 'accessory' },
    4: { seasons: ALL, tempMin: -20, tempMax: 40, layerRole: 'accessory' },
    5: { seasons: ALL, tempMin: -20, tempMax: 40, layerRole: 'accessory' },
  },
  accessory: {
    1: { seasons: ALL, tempMin: -20, tempMax: 40, layerRole: 'accessory' },
    2: { seasons: ALL, tempMin: -20, tempMax: 40, layerRole: 'accessory' },
    3: { seasons: ALL, tempMin: -20, tempMax: 40, layerRole: 'accessory' },
    4: { seasons: ALL, tempMin: -20, tempMax: 40, layerRole: 'accessory' },
    5: { seasons: ALL, tempMin: -20, tempMax: 40, layerRole: 'accessory' },
  },
}

export function baseRule(category: Category, thickness: Thickness): TempRule {
  return TEMP_RULES[category][thickness]
}
