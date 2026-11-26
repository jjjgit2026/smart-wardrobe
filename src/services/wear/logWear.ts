import { db, dateKey, uid } from '../../db'
import type { Garment, Outfit, WearLog } from '../../types'
import { needsWash } from '../rules/washRules'

export interface WearContext {
  scene: string
  city?: string
  temp?: number
  feelsLike?: number
  weatherCode?: number
}

export class DuplicateWearError extends Error {
  constructor() {
    super('今天已经记录过这套搭配了')
    this.name = 'DuplicateWearError'
  }
}

export async function logWear(outfit: Outfit, ctx: WearContext, force = false): Promise<string> {
  const ts = Date.now()
  const key = dateKey(ts)
  return db.transaction('rw', db.wearLogs, db.garments, db.outfits, db.feedback, async () => {
    if (!force) {
      const dup = await db.wearLogs
        .where('dateKey')
        .equals(key)
        .filter((l) => l.outfitId === outfit.id && !l.isUndone)
        .first()
      if (dup) throw new DuplicateWearError()
    }

    const logId = uid()
    const log: WearLog = {
      id: logId,
      dateKey: key,
      wornAt: ts,
      outfitId: outfit.id,
      garmentIds: outfit.garmentIds.slice(),
      scene: ctx.scene,
      city: ctx.city,
      temp: ctx.temp,
      feelsLike: ctx.feelsLike,
      weatherCode: ctx.weatherCode,
      isUndone: false,
      createdAt: ts,
    }
    await db.wearLogs.add(log)

    for (const id of outfit.garmentIds) {
      const g = await db.garments.get(id)
      if (!g) continue
      const wearsSinceWash = g.wearsSinceWash + 1
      const patch: Partial<Garment> = {
        wearCount: g.wearCount + 1,
        wearsSinceWash,
        lastWornAt: ts,
        updatedAt: ts,
      }
      if (needsWash({ wearsSinceWash, washThreshold: g.washThreshold })) patch.status = 'needsWash'
      else if (g.status === 'needsWash') patch.status = 'available'
      await db.garments.update(id, patch)
    }

    const saved = await db.outfits.get(outfit.id)
    if (saved) await db.outfits.update(outfit.id, { acceptCount: saved.acceptCount + 1 })
    else await db.outfits.put({ ...outfit, acceptCount: 1 })

    await db.feedback.add({
      id: uid(),
      outfitId: outfit.id,
      action: 'accept',
      scene: ctx.scene,
      createdAt: ts,
    })
    return logId
  })
}

export async function undoWear(logId: string): Promise<void> {
  await db.transaction('rw', db.wearLogs, db.garments, db.outfits, db.feedback, async () => {
    const log = await db.wearLogs.get(logId)
    if (!log || log.isUndone) return
    await db.wearLogs.update(logId, { isUndone: true })

    for (const id of log.garmentIds) {
      const g = await db.garments.get(id)
      if (!g) continue
      const wearCount = Math.max(0, g.wearCount - 1)
      const wearsSinceWash = Math.max(0, g.wearsSinceWash - 1)
      const patch: Partial<Garment> = { wearCount, wearsSinceWash, updatedAt: Date.now() }
      patch.status = needsWash({ wearsSinceWash, washThreshold: g.washThreshold }) ? 'needsWash' : 'available'
      await db.garments.update(id, patch)
    }

    if (log.outfitId) {
      const o = await db.outfits.get(log.outfitId)
      if (o) await db.outfits.update(log.outfitId, { acceptCount: Math.max(0, o.acceptCount - 1) })
    }

    const fb = await db.feedback
      .where('outfitId')
      .equals(log.outfitId || '')
      .filter((f) => f.action === 'accept')
      .last()
    if (fb) await db.feedback.delete(fb.id)
  })
}

export async function markWashed(ids: string[]): Promise<void> {
  const ts = Date.now()
  await db.transaction('rw', db.garments, async () => {
    for (const id of ids) {
      await db.garments.update(id, {
        wearsSinceWash: 0,
        lastWashedAt: ts,
        status: 'available',
        updatedAt: ts,
      })
    }
  })
}
