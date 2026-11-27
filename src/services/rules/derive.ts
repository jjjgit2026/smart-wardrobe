import type { Category, LayerRole, Season, SleeveLength, Thickness } from '../../types'
import { baseRule } from './tempTable'
import { rolesOf } from './layerLabels'

export interface DeriveInput {
  category: Category
  subCategory: string
  thickness: Thickness
  sleeveLength: SleeveLength
  materialLook: string
}

export interface DeriveOutput {
  seasons: Season[]
  tempMin: number
  tempMax: number
  layerRole: ReturnType<typeof baseRule>['layerRole']
}

const MATERIAL_WARM = ['羊毛', '羊绒', '羽绒', '棉服', '加绒', '抓绒']
const MATERIAL_COOL = ['亚麻', '雪纺', '真丝', '冰丝']

export function deriveGarmentRules(input: DeriveInput): DeriveOutput {
  const rule = baseRule(input.category, input.thickness)
  let tempMin = rule.tempMin
  let tempMax = rule.tempMax

  if (input.sleeveLength === 'short') tempMin += 2
  if (input.sleeveLength === 'none') tempMin += 3

  if (MATERIAL_WARM.some((m) => input.materialLook.includes(m))) tempMax -= 2
  if (MATERIAL_COOL.some((m) => input.materialLook.includes(m))) tempMax += 2

  const seasons = rule.seasons.slice()
  if (tempMin <= 10 && !seasons.includes('冬')) seasons.push('冬')
  if (tempMax >= 28 && !seasons.includes('夏')) seasons.push('夏')

  return {
    seasons: normalizeSeasons(seasons),
    tempMin,
    tempMax: Math.max(tempMin + 2, tempMax),
    layerRole: rule.layerRole,
  }
}

export function normalizeSeasons(seasons: Season[]): Season[] {
  const order: Season[] = ['春', '夏', '秋', '冬']
  return order.filter((s) => seasons.includes(s))
}

export function outfitTempRange(
  items: Array<{ tempMin: number; tempMax: number; layerRole: LayerRole; layerRoles?: LayerRole[] }>
): [number, number] {
  if (!items.length) return [0, 0]
  const roles = (i: { layerRole: LayerRole; layerRoles?: LayerRole[] }) => rolesOf(i)
  const core = items.filter((i) => !roles(i).includes('accessory'))
  const pool = core.length ? core : items
  const min = Math.min(...pool.map((i) => i.tempMin))
  const base = pool.filter((i) => !roles(i).includes('outer'))
  const candidates = base.length ? base : pool
  const hasOuter = pool.some((i) => roles(i).includes('outer'))
  const max = Math.min(...candidates.map((i) => i.tempMax)) - (hasOuter ? 2 : 0)
  return [min, Math.max(min + 2, max)]
}
