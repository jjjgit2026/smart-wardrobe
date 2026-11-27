import type { Garment } from '../../types'
import { outfitTempRange } from '../rules/derive'
import { rolesOf } from '../rules/layerLabels'
import type { ScoreParts } from './score'

const LABELS: Record<keyof ScoreParts, string> = {
  tempFit: '温度适配',
  sceneFit: '场景匹配',
  colorHarmony: '色彩协调',
  balance: '穿着均衡',
  freshness: '久未穿着',
  hygiene: '洁净程度',
  preference: '你的偏好',
}

export function explainOutfit(items: Garment[], parts: ScoreParts, temp: number, scene: string, rain = false, wind = false): string[] {
  const reasons: string[] = []
  const hasOuter = items.some((g) => rolesOf(g).includes('outer'))
  if (wind && hasOuter) reasons.push('大风天安排了外套挡风')
  else if (rain && hasOuter) reasons.push('有降水，安排了外套防雨')
  const ranked = (Object.keys(parts) as Array<keyof ScoreParts>)
    .filter((k) => k !== 'sceneFit')
    .sort((a, b) => parts[b] - parts[a])
    .slice(0, 3)

  for (const key of ranked) {
    if (parts[key] < 0.45) continue
    if (key === 'tempFit') {
      const [min, max] = outfitTempRange(items)
      reasons.push(`体感 ${temp}°C 落在整套 ${min}–${max}°C 的适配区间`)
    } else if (key === 'colorHarmony') {
      const colors = [...new Set(items.map((g) => g.colorName).filter(Boolean))].slice(0, 2)
      reasons.push(colors.length >= 2 ? `${colors[0]}与${colors[1]}配色协调` : '整体配色协调')
    } else if (key === 'balance') {
      reasons.push('这几件最近穿得不多，换着穿更均衡')
    } else if (key === 'freshness') {
      reasons.push('有单品很久没上身了，今天可以安排')
    } else if (key === 'hygiene') {
      reasons.push('整套都还可以继续穿，不需要先洗')
    } else if (key === 'preference') {
      reasons.push('更贴近你以往爱选的颜色和风格')
    } else {
      reasons.push(LABELS[key])
    }
  }
  if (parts.sceneFit >= 0.99 && scene) reasons.push(`未命中「${scene}」场景黑名单`)
  return reasons.slice(0, 3)
}
