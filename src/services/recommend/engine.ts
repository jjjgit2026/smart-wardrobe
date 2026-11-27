import type { Feedback, Garment, Outfit, RecommendConditions } from '../../types'
import { colorHarmony } from '../rules/colorRules'
import { outfitTempRange } from '../rules/derive'
import { rolesOf } from '../rules/layerLabels'
import { isWearable } from '../wear/statusFlow'
import { explainOutfit } from './explain'
import { preferenceScore, buildPreferenceModel, type PreferenceModel } from './preference'
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

function hasRole(items: Garment[], role: 'inner' | 'outer' | 'accessory'): boolean {
  return items.some((g) => rolesOf(g).includes(role))
}

function hardOk(items: Garment[], cond: RecommendConditions): boolean {
  if (!items.length) return false
  if (items.some((g) => !isWearable(g.status))) return false
  if (items.some((g) => g.sceneBlacklist.includes(cond.scene))) return false
  if (cond.rain && !hasRole(items, 'outer')) return false
  if (cond.wind && !hasRole(items, 'outer')) return false
  if (cond.temp < 5 && !hasRole(items, 'outer')) return false
  if (cond.temp > 30 && items.some((g) => g.thickness >= 4)) return false
  const [min, max] = outfitTempRange(items)
  return cond.temp >= min - 3 && cond.temp <= max + 3
}

function chooseShoe(
  shoes: Garment[],
  items: Garment[],
  cond: RecommendConditions,
  model: PreferenceModel
): Garment | null {
  if (!shoes.length) return null
  const colors = items.map((g) => g.dominantColor || g.colorName)
  const scoreOf = (shoe: Garment) => {
    const tempFit = 1 - Math.min(1, Math.abs(cond.temp - (shoe.tempMin + shoe.tempMax) / 2) / 20)
    const pref = model.ready ? preferenceScore([shoe], model) : 0.5
    const harmony = colorHarmony([...colors, shoe.dominantColor || shoe.colorName])
    return tempFit * 0.2 + pref * 0.3 + harmony * 0.5
  }
  return shoes.slice().sort((a, b) => scoreOf(b) - scoreOf(a))[0]
}

export interface ScoredOutfit extends Outfit {
  parts: ScoreParts
  shoeId?: string
}

export function recommend(
  garments: Garment[],
  cond: RecommendConditions,
  feedback: Feedback[] = []
): ScoredOutfit[] {
  const model = buildPreferenceModel(feedback, garments)
  const usable = garments.filter(
    (g) => isWearable(g.status) && !rolesOf(g).includes('accessory')
      && cond.temp >= g.tempMin - 10 && cond.temp <= g.tempMax + 10
  )
  const pick = (role: string) =>
    usable
      .filter((g) => rolesOf(g).includes(role as Garment['layerRole']))
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
  const shoes = garments.filter(
    (g) => g.category === 'shoes' && isWearable(g.status) && !g.sceneBlacklist.includes(cond.scene)
  )
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

  for (const base of combos) {
    // 一件多层级衣服可能同时落入多个桶，去重避免同一件在一套里穿两次
    if (new Set(base.map((g) => g.id)).size !== base.length) continue
    if (!hardOk(base, cond)) continue
    const fp = fingerprint(base.map((g) => g.id))
    if (seen.has(fp)) continue
    seen.add(fp)
    if (exclude.has(`rule-${fp}`)) continue

    const shoe = chooseShoe(shoes, base, cond, model)
    const items = shoe ? [...base, shoe] : base
    const { score, parts } = scoreOutfit(items, {
      temp: cond.temp,
      scene: cond.scene,
      meanWearByCategory: mean,
      now,
      preferenceModel: model,
    })
    const [min, max] = outfitTempRange(items)
    results.push({
      id: `rule-${fp}`,
      garmentIds: items.map((g) => g.id),
      name: items.map((g) => g.subCategory || g.colorName).join(' + '),
      sceneTags: cond.scene ? [cond.scene] : [],
      tempRange: [min, max],
      score: Math.round(score * 1000) / 1000,
      reasons: explainOutfit(items, parts, cond.temp, cond.scene, cond.rain, cond.wind),
      parts,
      source: 'rule',
      createdAt: now,
      acceptCount: 0,
      shoeId: shoe?.id,
    })
  }

  return results.sort((a, b) => b.score - a.score).slice(0, Math.max(1, cond.topN))
}
