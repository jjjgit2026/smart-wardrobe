import type { Category, Garment } from '../../types'

const KEYWORDS: Array<{ words: string[]; threshold: number }> = [
  { words: ['内衣', '打底', '背心', '袜'], threshold: 2 },
  { words: ['T恤', 't恤', '短袖', '衬衫'], threshold: 3 },
  { words: ['针织', '毛衣', '卫衣'], threshold: 5 },
  { words: ['半裙', '短裤', '长裤', '休闲裤', '西装裤'], threshold: 4 },
  { words: ['牛仔'], threshold: 6 },
  { words: ['风衣', '夹克', '西装', '外套'], threshold: 7 },
  { words: ['大衣', '羽绒', '棉服'], threshold: 10 },
]

export function washThreshold(category: Category, subCategory: string, materialLook = ''): number {
  const text = `${subCategory} ${materialLook}`
  for (const rule of KEYWORDS) {
    if (rule.words.some((w) => text.includes(w))) return rule.threshold
  }
  if (category === 'outerwear') return 7
  if (category === 'bottom') return 4
  if (category === 'top') return 3
  return 5
}

export function needsWash(g: Pick<Garment, 'wearsSinceWash' | 'washThreshold'>): boolean {
  return g.wearsSinceWash >= g.washThreshold
}

export const WASH_TABLE_TEXT = [
  '贴身内衣 / 打底：1–2 次',
  'T 恤 / 衬衫：2–3 次',
  '针织 / 毛衣 / 卫衣：4–6 次',
  '裙 / 长裤：3–5 次',
  '牛仔裤：5–8 次',
  '夹克 / 风衣 / 西装：6–8 次',
  '大衣 / 羽绒服：8–12 次',
]
