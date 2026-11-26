<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMessage } from 'naive-ui'
import { useWardrobeStore } from '../stores/useWardrobeStore'
import { undoWear } from '../services/wear/logWear'

const wardrobe = useWardrobeStore()
const message = useMessage()
const monthOffset = ref(0)

const monthDate = computed(() => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + monthOffset.value, 1)
})
const monthKey = computed(() => `${monthDate.value.getFullYear()}-${`${monthDate.value.getMonth() + 1}`.padStart(2, '0')}`)
const monthLabel = computed(() => monthDate.value.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' }))

const cells = computed(() => {
  const first = new Date(monthDate.value)
  const startWeekday = (first.getDay() + 6) % 7
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const arr: Array<{ day: number; key: string; count: number } | null> = []
  for (let i = 0; i < startWeekday; i++) arr.push(null)
  for (let d = 1; d <= days; d++) {
    const key = `${monthKey.value}-${`${d}`.padStart(2, '0')}`
    arr.push({ day: d, key, count: wardrobe.wearLogs.filter((l) => !l.isUndone && l.dateKey === key).length })
  }
  return arr
})

const monthLogs = computed(() => wardrobe.wearLogs.filter((l) => !l.isUndone && l.dateKey.startsWith(monthKey.value)))

const topGarments = computed(() => {
  const counts = new Map<string, number>()
  for (const log of monthLogs.value) {
    for (const id of log.garmentIds) counts.set(id, (counts.get(id) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ name: wardrobe.garments.find((g) => g.id === id)?.subCategory || '已删除单品', count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
})

const sceneStats = computed(() => {
  const counts = new Map<string, number>()
  for (const log of monthLogs.value) counts.set(log.scene, (counts.get(log.scene) || 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
})

async function undo(id: string) {
  await undoWear(id)
  await wardrobe.refresh()
  message.success('已撤销')
}
</script>

<template>
  <div class="page">
    <div class="spread">
      <div><h1 class="page-title">穿搭日历</h1><div class="page-sub">{{ monthLabel }}</div></div>
      <div class="row">
        <button class="warm-btn" @click="monthOffset--">上月</button>
        <button class="warm-btn" @click="monthOffset++">下月</button>
      </div>
    </div>

    <div class="calendar card">
      <div v-for="w in ['一','二','三','四','五','六','日']" :key="w" class="week">{{ w }}</div>
      <div v-for="(c, i) in cells" :key="i" class="day" :class="{ empty: !c }">
        <template v-if="c">
          <span>{{ c.day }}</span>
          <i v-if="c.count" class="dot" />
        </template>
      </div>
    </div>

    <div class="stats">
      <div class="card stat"><div class="num">{{ monthLogs.length }}</div><div class="muted">本月套数</div></div>
      <div class="card stat"><div class="num">{{ topGarments.length }}</div><div class="muted">上榜单品</div></div>
      <div class="card stat"><div class="num">{{ sceneStats.length }}</div><div class="muted">涉及场景</div></div>
    </div>

    <div class="section-title"><h3>最常穿 Top 3</h3></div>
    <div class="card list">
      <div v-for="(g, i) in topGarments" :key="g.name" class="list-row">
        <span class="rank">{{ i + 1 }}</span><span>{{ g.name }}</span><span class="muted">{{ g.count }} 次</span>
      </div>
      <div v-if="!topGarments.length" class="muted">本月还没有记录</div>
    </div>

    <div class="section-title"><h3>记录时间线</h3></div>
    <div class="card list">
      <div v-for="l in monthLogs" :key="l.id" class="log">
        <div class="spread">
          <div>
            <div class="log-title">{{ l.dateKey }} · {{ l.scene }}</div>
            <div class="muted">{{ l.city || '未记录城市' }} · {{ l.temp != null ? Math.round(l.temp) + '°C' : '手动温度' }} · {{ l.garmentIds.length }} 件</div>
          </div>
          <button class="link" @click="undo(l.id)">撤销</button>
        </div>
      </div>
      <div v-if="!monthLogs.length" class="muted">这个月还没有穿搭记录</div>
    </div>
  </div>
</template>

<style scoped>
.calendar { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; padding: 12px; }
.week { text-align: center; font-size: 11px; color: var(--text-3); padding: 4px 0; }
.day { position: relative; aspect-ratio: 1; display: grid; place-items: center; font-size: 12px; border-radius: var(--r-sm); }
.day:not(.empty):hover { background: var(--primary-wash); }
.day.empty { visibility: hidden; }
.dot { position: absolute; bottom: 5px; width: 4px; height: 4px; border-radius: 50%; background: var(--accent); }
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 16px 0; }
.stat { text-align: center; padding: 12px 4px; }
.num { font-family: var(--font-num); font-size: 24px; color: var(--primary); }
.list { padding: 12px; }
.list-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
.list-row:last-child { border-bottom: 0; }
.list-row .muted { margin-left: auto; }
.rank { width: 20px; height: 20px; border-radius: 50%; background: var(--primary-wash); color: var(--primary); display: grid; place-items: center; font-size: 11px; }
.log { padding: 10px 0; border-bottom: 1px solid var(--border); }
.log:last-child { border-bottom: 0; }
.log-title { font-size: 13px; font-weight: 600; }
.link { border: 0; background: transparent; color: var(--danger); font-size: 12px; cursor: pointer; }
</style>
