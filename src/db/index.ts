import Dexie, { type EntityTable } from 'dexie'
import type { Feedback, Garment, Outfit, WearLog, WeatherCache } from '../types'

export interface SettingRow {
  key: string
  value: unknown
}

type WardrobeDB = Dexie & {
  garments: EntityTable<Garment, 'id'>
  outfits: EntityTable<Outfit, 'id'>
  wearLogs: EntityTable<WearLog, 'id'>
  feedback: EntityTable<Feedback, 'id'>
  settings: EntityTable<SettingRow, 'key'>
  weatherCache: EntityTable<WeatherCache, 'key'>
}

export const db = new Dexie('smart-wardrobe') as WardrobeDB

db.version(1).stores({
  garments: 'id, category, status, *seasons, layerRole, lastWornAt, wearCount, wearsSinceWash',
  outfits: 'id, createdAt, acceptCount',
  wearLogs: 'id, dateKey, wornAt, outfitId, isUndone',
  feedback: 'id, createdAt, outfitId, action',
  settings: 'key',
  weatherCache: 'key',
})

db.version(2).stores({
  garments: 'id, createdAt, category, status, *seasons, layerRole, lastWornAt, wearCount, wearsSinceWash',
})

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function dateKey(ts = Date.now()): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}
