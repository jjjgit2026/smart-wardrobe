import type { Garment, GarmentStatus } from '../../types'
import { needsWash } from '../rules/washRules'

/**
 * 衣物状态流转规则（全应用唯一判定入口）
 *
 * available  可用     → 可穿、参与搭配
 * needsWash  待清洗   → 仍可穿、参与搭配，只是提醒该洗了
 * washing    洗中     → 用户主动送洗，不参与搭配
 * archived   已归档   → 退役保留记录，不参与搭配
 */
export function isWearable(status: GarmentStatus): boolean {
  return status === 'available' || status === 'needsWash'
}

/** 记录一次穿着后的状态；洗中/归档件保持原状态，不被计数逻辑复活 */
export function statusAfterWear(
  g: Pick<Garment, 'status' | 'washThreshold'>,
  wearsSinceWash: number
): GarmentStatus {
  if (!isWearable(g.status)) return g.status
  return needsWash({ wearsSinceWash, washThreshold: g.washThreshold }) ? 'needsWash' : 'available'
}

/** 洗完后的状态；归档件不因误点「已清洗」而复活 */
export function statusAfterWash(status: GarmentStatus): GarmentStatus {
  return status === 'archived' ? 'archived' : 'available'
}

/** 送洗后的状态；只有可穿着的衣物能被送洗 */
export function statusAfterSendWash(status: GarmentStatus): GarmentStatus {
  return isWearable(status) ? 'washing' : status
}

/** 归档后的状态；已在洗中或已归档的不重复处理 */
export function statusAfterArchive(status: GarmentStatus): GarmentStatus {
  return isWearable(status) ? 'archived' : status
}

/** 取消归档后回到可穿状态 */
export function statusAfterUnarchive(status: GarmentStatus): GarmentStatus {
  return status === 'archived' ? 'available' : status
}
