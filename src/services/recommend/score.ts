import type { Garment } from '../../types'
import { colorHarmony } from '../rules/colorRules'
import { outfitTempRange } from '../rules/derive'

export const WEIGHTS = {
  tempFit: 0.28,
  sceneFit: 0.18,
  colorHarmony: 0.18,
  balance: 0.14,
  freshness: 0.1,
  hygiene: 0.12,
} as const

export type ScoreParts = Record<keyof typeof WEIGHTS, number>

export interface ScoreContext {
  temp: number
  scene: string
  meanWearByCategory: Record<string, number>
  now: number
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

function tempFit(items: Garment[], temp: number): number {
  const [min, max] = outfitTempRange(items)
  if (temp < min) return clamp01(1 - (min - temp) / 8)
  if (temp > max) return clamp01(1 - (temp - max) / 8)
  const span = Math.max(1, max - min)
  const dist = Math.abs(temp - (min + max) / 2) / (span / 2)
  return 1 - 0.25 * clamp01(dist)
}

function balance(items: Garment[], mean: Record<string, number>): number {
  if (!items.length) return 0
  const values = items.map((g) => {
    const m = mean[g.category] || 1
    return clamp01(1 - g.wearCount / (m * 1.5))
  })
  return values.reduce((a, b) => a + b, 0) / values.length
}

function freshness(items: Garment[], now: number): number {
  const values = items.map((g) => {
    if (!g.lastWornAt) return 1
    return clamp01((now - g.lastWornAt) / (30 * 24 * 3600 * 1000))
  })
  return values.reduce((a, b) => a + b, 0) / values.length
}

function hygiene(items: Garment[]): number {
  const values = items.map((g) => clamp01(1 - g.wearsSinceWash / Math.max(1, g.washThreshold)))
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function scoreOutfit(items: Garment[], ctx: ScoreContext): { score: number; parts: ScoreParts } {
  const parts: ScoreParts = {
    tempFit: tempFit(items, ctx.temp),
    sceneFit: items.length ? (items.every((g) => !g.sceneBlacklist.includes(ctx.scene)) ? 1 : 0) : 0,
    colorHarmony: colorHarmony(items.map((g) => g.dominantColor || g.colorName)),
    balance: balance(items, ctx.meanWearByCategory),
    freshness: freshness(items, ctx.now),
    hygiene: hygiene(items),
  }
  const score = (Object.keys(WEIGHTS) as Array<keyof typeof WEIGHTS>).reduce(
    (sum, key) => sum + parts[key] * WEIGHTS[key], 0
  )
  return { score, parts }
}
