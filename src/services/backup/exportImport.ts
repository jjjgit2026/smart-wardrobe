import { db } from '../../db'
import type { Feedback, Garment, Outfit, WearLog } from '../../types'

export interface BackupFile {
  version: 1 | 2
  exportedAt: number
  garments: Array<Omit<Garment, 'photoBlob' | 'thumbBlob'> & { photo?: string; thumb?: string }>
  outfits: Outfit[]
  wearLogs: WearLog[]
  feedback: Feedback[]
}

function blobToDataUrl(blob?: Blob): Promise<string | undefined> {
  if (!blob) return Promise.resolve(undefined)
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => resolve(undefined)
    reader.readAsDataURL(blob)
  })
}

function dataUrlToBlob(data?: string): Blob | undefined {
  if (!data || !data.startsWith('data:')) return undefined
  const [head, body] = data.split(',')
  const mime = head.match(/:(.*?);/)?.[1] || 'image/webp'
  const binary = atob(body)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export async function exportBackup(): Promise<BackupFile> {
  const garments = await db.garments.toArray()
  return {
    version: 2,
    exportedAt: Date.now(),
    garments: await Promise.all(
      garments.map(async (g) => {
        const { photoBlob, thumbBlob, ...rest } = g
        return { ...rest, photo: await blobToDataUrl(photoBlob), thumb: await blobToDataUrl(thumbBlob) }
      })
    ),
    outfits: await db.outfits.toArray(),
    wearLogs: await db.wearLogs.toArray(),
    feedback: await db.feedback.toArray(),
  }
}

export async function downloadBackup(): Promise<void> {
  const data = await exportBackup()
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `smart-wardrobe-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importBackup(file: File): Promise<{ added: number }> {
  const raw = JSON.parse(await file.text()) as BackupFile
  if ((raw.version !== 1 && raw.version !== 2) || !Array.isArray(raw.garments)) throw new Error('备份文件格式不正确')
  let added = 0
  await db.transaction('rw', db.garments, db.outfits, db.wearLogs, db.feedback, async () => {
    for (const item of raw.garments) {
      const exists = await db.garments.get(item.id)
      if (exists) continue
      const { photo, thumb, ...rest } = item
      await db.garments.add({
        ...rest,
        photoBlob: dataUrlToBlob(photo),
        thumbBlob: dataUrlToBlob(thumb),
      } as Garment)
      added++
    }
    for (const o of raw.outfits || []) {
      if (!(await db.outfits.get(o.id))) await db.outfits.add(o)
    }
    for (const l of raw.wearLogs || []) {
      if (!(await db.wearLogs.get(l.id))) await db.wearLogs.add(l)
    }
    for (const f of raw.feedback || []) {
      if (!(await db.feedback.get(f.id))) await db.feedback.add(f)
    }
  })
  return { added }
}

export async function storageEstimate(): Promise<{ usageMB: number; quotaMB: number }> {
  if (!navigator.storage?.estimate) return { usageMB: 0, quotaMB: 0 }
  const e = await navigator.storage.estimate()
  return {
    usageMB: Math.round(((e.usage || 0) / 1024 / 1024) * 10) / 10,
    quotaMB: Math.round(((e.quota || 0) / 1024 / 1024) * 10) / 10,
  }
}
