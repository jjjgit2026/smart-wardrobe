import type { Garment, Outfit, RecommendConditions } from '../../types'
import { outfitTempRange } from '../rules/derive'
import { explainOutfit } from './explain'
import { scoreOutfit, type ScoreParts } from './score'

const MAX_PER_BUCKET = 12

function fingerprint(ids: string[]): string {
  const key = ids.slice().sort().join('|')
  let hash = 5381
  for (let i = 0; i < key.length; i++) hash = ((hash << 5) + hash + key.charCodeAt(i)) >>> 0
  return hash.toString(36)
}

function meanWearByCategory(items: Garment[]): Record<string, number> {
  const sums: Record<string, number> = {}
  const counts: Record<string, number> = {}
  for (const g of items) {
    sums[g.category] = (sums[g.category] || 0) + g.wearCount
    counts[g.category] = (counts[g.category] || 0) + 1
  }
  const out: Record<string, number> = {}
  for (const k of Object.keys(sums)) out[k] = sums[k] / Math.max(1, counts[k])
  return out
}

function hardOk(items: Garment[], cond: RecommendConditions): boolean {
  if (!items.length) return false
  if (items.some((g) => g.status !== 'available')) return false
  if (items.some((g) => g.sceneBlacklist.includes(cond.scene))) return false
  if (cond.rain && !items.some((g) => g.layerRole === 'outer')) return false
  if (cond.temp < 5 && !items.some((g) => g.layerRole === 'outer')) return false
  if (cond.temp > 30 && items.some((g) => g.thickness >= 4)) return false
  const [min, max] = outfitTempRange(items)
  return cond.temp >= min - 3 && cond.temp <= max + 3
}

export interface ScoredOutfit extends Outfit {
  parts: ScoreParts
}

export function recommend(garments: Garment[], cond: RecommendConditions): ScoredOutfit[] {
  const usable = garments.filter(
    (g) => g.layerRole !== 'accessory' && cond.temp >= g.tempMin - 10 && cond.temp <= g.tempMax + 10
  )
  const pick = (role: string) =>
    usable
      .filter((g) => g.layerRole === role)
      .sort((a, b) => {
        const fa = Math.abs(cond.temp - (a.tempMin + a.tempMax) / 2)
        const fb = Math.abs(cond.temp - (b.tempMin + b.tempMax) / 2)
        return fa - fb
      })
      .slice(0, MAX_PER_BUCKET)

  const inners = pick('inner')
  const bottoms = pick('bottom')
  const outers = pick('outer')
  const onePieces = pick('onePiece')
  const mean = meanWearByCategory(garments)
  const now = Date.now()

  const combos: Garment[][] = []
  for (const op of onePieces) {
    combos.push([op])
    for (const outer of outers) combos.push([op, outer])
  }
  for (const inner of inners) {
    for (const bottom of bottoms) {
      combos.push([inner, bottom])
      for (const outer of outers) combos.push([inner, bottom, outer])
    }
  }

  const exclude = new Set(cond.excludeOutfitIds || [])
  const seen = new Set<string>()
  const results: ScoredOutfit[] = []

  for (const items of combos) {
    if (!hardOk(items, cond)) continue
    const fp = fingerprint(items.map((g) => g.id))
    if (seen.has(fp)) continue
    seen.add(fp)
    if (exclude.has(`rule-${fp}`)) continue
    const { score, parts } = scoreOutfit(items, { temp: cond.temp, scene: cond.scene, meanWearByCategory: mean, now })
    const [min, max] = outfitTempRange(items)
    results.push({
      id: `rule-${fp}`,
      garmentIds: items.map((g) => g.id),
      name: items.map((g) => g.subCategory || g.colorName).join(' + '),
      sceneTags: cond.scene ? [cond.scene] : [],
      tempRange: [min, max],
      score: Math.round(score * 1000) / 1000,
      reasons: explainOutfit(items, parts, cond.temp, cond.scene),
      parts,
      source: 'rule',
      createdAt: now,
      acceptCount: 0,
    })
  }

  return results.sort((a, b) => b.score - a.score).slice(0, Math.max(1, cond.topN))
}
