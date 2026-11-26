export type ColorFamily = 'neutral' | 'warm' | 'cool' | 'bright'

const FAMILY_WORDS: Record<ColorFamily, string[]> = {
  neutral: ['黑', '白', '灰', '米', '燕麦', '卡其', '驼', '棕', '咖', '杏', '裸'],
  warm: ['红', '橙', '焦糖', '棕黄', '姜黄', '砖'],
  cool: ['蓝', '绿', '青', '紫', '藏青', '灰蓝'],
  bright: ['亮', '荧光', '霓虹', '玫', '明黄', '湖蓝'],
}

export function colorFamily(name: string): ColorFamily {
  for (const family of ['bright', 'cool', 'warm'] as ColorFamily[]) {
    if (FAMILY_WORDS[family].some((w) => name.includes(w))) return family
  }
  return 'neutral'
}

export function pairHarmony(a: string, b: string): number {
  const fa = colorFamily(a)
  const fb = colorFamily(b)
  if (fa === 'neutral' || fb === 'neutral') return 0.95
  if (fa === fb) return 0.88
  if ((fa === 'warm' && fb === 'cool') || (fa === 'cool' && fb === 'warm')) return 0.55
  if (fa === 'bright' || fb === 'bright') return 0.4
  return 0.75
}

export function colorHarmony(colors: string[]): number {
  if (colors.length < 2) return 1
  let min = 1
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      min = Math.min(min, pairHarmony(colors[i], colors[j]))
    }
  }
  return min
}
