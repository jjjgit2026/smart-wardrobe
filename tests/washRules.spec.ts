import { describe, expect, it } from 'vitest'
import { needsWash, washThreshold } from '../src/services/rules/washRules'

describe('washThreshold', () => {
  it('按品类给出不同阈值', () => {
    expect(washThreshold('bottom', '牛仔裤', '牛仔')).toBe(6)
    expect(washThreshold('outerwear', '羽绒服', '羽绒')).toBe(10)
    expect(washThreshold('top', '白T恤', '棉')).toBe(3)
  })

  it('达到阈值才算待清洗', () => {
    expect(needsWash({ wearsSinceWash: 2, washThreshold: 3 })).toBe(false)
    expect(needsWash({ wearsSinceWash: 3, washThreshold: 3 })).toBe(true)
  })
})
