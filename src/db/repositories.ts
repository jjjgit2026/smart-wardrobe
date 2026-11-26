import { db, uid } from './index'
import type { Feedback, Garment, Outfit, WearLog, WeatherCache } from '../types'

export const garmentsRepo = {
  all: () => db.garments.orderBy('createdAt').reverse().toArray(),
  get: (id: string) => db.garments.get(id),
  add: (g: Garment) => db.garments.add(g),
  put: (g: Garment) => db.garments.put(g),
  delete: (id: string) => db.garments.delete(id),
  clear: () => db.garments.clear(),
}

export const outfitsRepo = {
  all: () => db.outfits.orderBy('createdAt').reverse().toArray(),
  put: (o: Outfit) => db.outfits.put(o),
  clear: () => db.outfits.clear(),
}

export const wearLogsRepo = {
  all: () => db.wearLogs.orderBy('wornAt').reverse().toArray(),
  get: (id: string) => db.wearLogs.get(id),
  add: (log: WearLog) => db.wearLogs.add(log),
  put: (log: WearLog) => db.wearLogs.put(log),
  clear: () => db.wearLogs.clear(),
}

export const feedbackRepo = {
  add: (f: Feedback) => db.feedback.add(f),
  all: () => db.feedback.toArray(),
  clear: () => db.feedback.clear(),
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key)
  return row ? (row.value as T) : fallback
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value })
}

export const weatherCacheRepo = {
  get: () => db.weatherCache.get('current'),
  put: (w: WeatherCache) => db.weatherCache.put(w),
}

export function newId(): string {
  return uid()
}
