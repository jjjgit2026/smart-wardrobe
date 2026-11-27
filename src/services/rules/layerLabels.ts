import type { Garment, LayerRole } from '../../types'

export const LAYER_LABELS: Record<LayerRole, string> = {
  inner: '内层 · 贴身上装',
  outer: '外层 · 外套',
  bottom: '下装',
  onePiece: '连体 · 裙装',
  accessory: '配饰 · 鞋履',
}

export function layerLabel(role: LayerRole): string {
  return LAYER_LABELS[role] || role
}

/** 读取衣物的可作层级，兼容旧数据（没有 layerRoles 时回退到 layerRole 单值） */
export function rolesOf(g: Pick<Garment, 'layerRole' | 'layerRoles'>): LayerRole[] {
  if (Array.isArray(g.layerRoles) && g.layerRoles.length) return g.layerRoles
  return [g.layerRole]
}

/** 只有上装/外套才谈得上"内搭 or 外穿"，其余品类层级固定 */
export function canToggleInnerOuter(category: Garment['category']): boolean {
  return category === 'top' || category === 'outerwear'
}
