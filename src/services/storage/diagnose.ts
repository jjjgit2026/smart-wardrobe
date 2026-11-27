import { db } from '../../db'
import type { Garment } from '../../types'

/** 把任意异常序列化成完整可读文本，含类型名与堆栈摘要 */
export function serializeError(e: unknown): string {
  if (e === null || e === undefined) return '未知错误（无错误对象）'
  if (typeof e === 'string') return e
  const err = e as Error & { constructor?: { name?: string } }
  const name = err.name || err.constructor?.name || 'Error'
  const msg = err.message || '(该异常没有错误描述)'
  const stack = err.stack ? '\n' + err.stack.split('\n').slice(0, 3).join(' | ') : ''
  return `${name}: ${msg}${stack}`
}

const LAST_ERROR_KEY = 'wardrobe:last-storage-error'

export function recordStorageError(e: unknown): void {
  try { sessionStorage.setItem(LAST_ERROR_KEY, serializeError(e)) } catch { /* 忽略 */ }
}

export function getLastStorageError(): string {
  try { return sessionStorage.getItem(LAST_ERROR_KEY) || '' } catch { return '' }
}

export function clearLastStorageError(): void {
  try { sessionStorage.removeItem(LAST_ERROR_KEY) } catch { /* 忽略 */ }
}

/** 把 IndexedDB / Dexie 的底层异常翻译成用户能看懂的提示 */
export function explainStorageError(e: unknown): string {
  const name = e instanceof Error ? e.name : ''
  const raw = e instanceof Error ? e.message : String(e)

  if (name === 'QuotaExceededError' || /quota|storage full|exceeded|空间已满/i.test(raw)) {
    return '浏览器本地存储空间已满，请清理浏览器缓存或更换浏览器后重试'
  }
  if (name === 'SecurityError' || /security|denied|blocked|permission/i.test(raw)) {
    return '浏览器阻止了本地存储（隐私/无痕模式或站点存储权限被禁），请关闭无痕模式后重试'
  }
  if (name === 'ConstraintError' || /constraint|duplicate key/i.test(raw)) {
    return '数据主键冲突，请刷新页面后重试'
  }
  if (name === 'VersionError' || /version|SchemaDiff|Upgrade/i.test(raw)) {
    return '本地数据结构版本不匹配，请强制刷新页面（Ctrl/Cmd + Shift + R）后重试'
  }
  if (/DataClone|clone|structured|DataError/i.test(raw) || name === 'DataCloneError') {
    return '数据格式异常，请刷新页面后重试；若仍失败请先在设置里备份数据'
  }
  return `本地存储写入失败（${serializeError(e)}）· 详细错误见「设置 → 数据与备份」`
}

/** 主动探测本地存储是否可用，用于页面自检提示 */
export async function checkStorageAvailable(): Promise<{ ok: boolean; message: string }> {
  try {
    if (typeof indexedDB === 'undefined') {
      return { ok: false, message: '当前浏览器不支持 IndexedDB，数据将无法保存' }
    }
    const probe = indexedDB.open('__wardrobe_probe__', 1)
    await new Promise<void>((resolve, reject) => {
      probe.onsuccess = () => { probe.result.close(); resolve() }
      probe.onerror = () => reject(probe.error ?? new Error('无法打开本地数据库'))
      probe.onblocked = () => reject(new Error('本地数据库被其他页面占用'))
    })
    return { ok: true, message: '本地存储正常' }
  } catch (e) {
    return { ok: false, message: explainStorageError(e) }
  }
}

/** 真正写入一条衣物再删除，精确复现保存路径上的失败 */
export async function probeGarmentWrite(): Promise<{ ok: boolean; message: string }> {
  const now = Date.now()
  const probe: Garment = {
    id: `probe-${now}-${Math.random().toString(36).slice(2)}`,
    dominantColor: '#C9A989',
    category: 'top', subCategory: '__存储探针__', colorName: '测试',
    thickness: 2, sleeveLength: 'long', materialLook: '测试',
    seasons: ['春'], tempMin: 10, tempMax: 25, layerRole: 'inner',
    styleTags: [], sceneBlacklist: [], status: 'available',
    wearCount: 0, wearsSinceWash: 0, washThreshold: 3,
    isHumanCorrected: true, createdAt: now, updatedAt: now,
  }
  try {
    await db.garments.add(probe)
    await db.garments.delete(probe.id)
    return { ok: true, message: '写入测试成功，本地存储可正常使用' }
  } catch (e) {
    recordStorageError(e)
    return { ok: false, message: explainStorageError(e) }
  }
}
