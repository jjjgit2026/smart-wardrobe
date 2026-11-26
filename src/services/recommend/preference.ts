import type { Feedback, Garment } from '../../types'
import { colorFamily } from '../rules/colorRules'

const MIN_SAMPLES = 10
const ALPHA = 2
const BETA = 2

export interface PreferenceModel {
  ready: boolean
  sampleCount: number
  acceptCount: number
  rejectCount: number
  scores: Record<string, number>
}

function featureKeys(g: Garment): string[] {
  const keys = [
    `color:${colorFamily(g.colorName)}`,
    `thickness:${g.thickness}`,
    `category:${g.category}`,
  ]
  for (const tag of g.styleTags || []) keys.push(`style:${tag}`)
  return [...new Set(keys)]
}

function outfitFeatureKeys(items: Garment[]): string[] {
  const keys = new Set<string>()
  for (const g of items) for (const k of featureKeys(g)) keys.add(k)
  return [...keys]
}

export function buildPreferenceModel(feedback: Feedback[], garments: Garment[]): PreferenceModel {
  const byId = new Map(garments.map((g) => [g.id, g]))
  const stats: Record<string, { pos: number; neg: number }> = {}
  let accept = 0
  let reject = 0

  for (const f of feedback) {
    if (f.action !== 'accept' && f.action !== 'reject') continue
    const items = (f.garmentIds || [])
      .map((id) => byId.get(id))
      .filter((g): g is Garment => Boolean(g))
    if (!items.length) continue
    const positive = f.action === 'accept'
    if (positive) accept++
    else reject++
    for (const key of outfitFeatureKeys(items)) {
      const s = (stats[key] ||= { pos: 0, neg: 0 })
      if (positive) s.pos++
      else s.neg++
    }
  }

  const scores: Record<string, number> = {}
  for (const key of Object.keys(stats)) {
    const { pos, neg } = stats[key]
    scores[key] = (pos + ALPHA) / (pos + neg + ALPHA + BETA)
  }
  const sampleCount = accept + reject
  return {
    ready: sampleCount >= MIN_SAMPLES,
    sampleCount,
    acceptCount: accept,
    rejectCount: reject,
    scores,
  }
}

export function preferenceScore(items: Garment[], model: PreferenceModel): number {
  if (!model.ready || !items.length) return 0.5
  const keys = outfitFeatureKeys(items)
  if (!keys.length) return 0.5
  let sum = 0
  let used = 0
  for (const key of keys) {
    const v = model.scores[key]
    if (v === undefined) continue
    sum += v
    used++
  }
  return used ? sum / used : 0.5
}
