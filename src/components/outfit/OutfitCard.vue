<script setup lang="ts">
import { computed, onUnmounted } from 'vue'
import type { Garment, Outfit } from '../../types'
import { garmentThumbUrl } from '../../services/image/compress'

const props = defineProps<{ outfit: Outfit; items: Garment[]; temp: number }>()
const emit = defineEmits<{ wear: []; swap: []; reject: [] }>()

const urls = computed(() => props.items.map((g) => garmentThumbUrl(g)))
onUnmounted(() => {
  props.items.forEach((g, i) => {
    if (g.thumbBlob && urls.value[i]?.startsWith('blob:')) URL.revokeObjectURL(urls.value[i])
  })
})

const range = computed(() => props.outfit.tempRange || [0, 0])
const cursor = computed(() => {
  const [min, max] = range.value
  const pct = ((props.temp - min) / Math.max(1, max - min)) * 100
  return Math.max(0, Math.min(100, pct))
})
</script>

<template>
  <article class="card">
    <div class="head">
      <span class="name">{{ outfit.name }}</span>
      <span class="score">匹配 {{ Math.round((outfit.score || 0) * 100) }}%</span>
    </div>
    <div class="collage">
      <div v-for="(g, i) in items.slice(0, 3)" :key="g.id" class="cell" :style="{ background: g.dominantColor }">
        <img v-if="urls[i]" :src="urls[i]" :alt="g.subCategory" />
      </div>
    </div>
    <div class="temp-row">
      <span class="temp-label">{{ range[0] }}° – {{ range[1] }}°</span>
      <div class="track"><div class="band" /><div class="cursor" :style="{ left: cursor + '%' }" /></div>
      <span class="temp-label">当前 {{ Math.round(temp) }}°</span>
    </div>
    <div class="reasons">
      <span v-for="r in outfit.reasons.slice(0, 3)" :key="r" class="reason">{{ r }}</span>
    </div>
    <div class="actions">
      <button class="warm-btn primary" @click="emit('wear')">穿这套</button>
      <button class="warm-btn" @click="emit('swap')">换一套</button>
      <button class="warm-btn" @click="emit('reject')">不喜欢</button>
    </div>
  </article>
</template>

<style scoped>
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); box-shadow: var(--shadow-md); padding: 14px; }
.head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.name { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.score { font-size: 11px; color: var(--primary); background: var(--primary-wash); padding: 2px 8px; border-radius: var(--r-pill); }
.collage { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
.cell { aspect-ratio: 3 / 4; overflow: hidden; border-radius: var(--r-sm); }
.cell:first-child { border-radius: var(--r-md) var(--r-sm) var(--r-sm) var(--r-md); }
.cell:last-child { border-radius: var(--r-sm) var(--r-md) var(--r-md) var(--r-sm); }
.cell img { width: 100%; height: 100%; object-fit: cover; }
.temp-row { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
.temp-label { font-size: 11px; color: var(--text-3); white-space: nowrap; }
.track { position: relative; flex: 1; height: 6px; border-radius: var(--r-pill); background: linear-gradient(90deg, #9DB7CE, #C9A989, #C99A4E, #B6655B); }
.cursor { position: absolute; top: -4px; width: 3px; height: 14px; background: #fff; border: 1px solid var(--primary-ink); border-radius: 2px; transform: translateX(-50%); }
.reasons { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0; }
.reason { font-size: 11px; background: var(--success-wash); color: var(--text-2); padding: 3px 9px; border-radius: var(--r-pill); }
.reason::before { content: ''; display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: var(--success); margin-right: 5px; vertical-align: middle; }
.actions { display: flex; gap: 8px; }
.actions .warm-btn { flex: 1; padding: 8px 4px; font-size: 12px; }
</style>
