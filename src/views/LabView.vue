<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NSlider, NSwitch, NSelect, useMessage } from 'naive-ui'
import OutfitCard from '../components/outfit/OutfitCard.vue'
import { useWardrobeStore } from '../stores/useWardrobeStore'
import { useWeatherStore } from '../stores/useWeatherStore'
import { useSettingsStore, SCENES } from '../stores/useSettingsStore'
import { recommend, type ScoredOutfit } from '../services/recommend/engine'
import { DuplicateWearError, logWear } from '../services/wear/logWear'
import type { Garment } from '../types'

const wardrobe = useWardrobeStore()
const weather = useWeatherStore()
const settings = useSettingsStore()
const message = useMessage()

const scene = ref(settings.defaultScene || '日常')
const temp = ref(Math.round(weather.effectiveTemp))
const rain = ref(weather.rain)
const wind = ref(weather.wind)
const topN = ref(settings.topN)
const excluded = ref<string[]>([])

watch(() => weather.effectiveTemp, (v) => { temp.value = Math.round(v) })
watch(() => weather.rain, (v) => { rain.value = v })
watch(() => weather.wind, (v) => { wind.value = v })

const results = computed<ScoredOutfit[]>(() => recommend(wardrobe.garments, {
  scene: scene.value,
  temp: temp.value,
  season: weather.season,
  rain: rain.value,
  wind: wind.value,
  topN: topN.value,
  excludeOutfitIds: excluded.value,
}))

function itemsOf(o: ScoredOutfit): Garment[] {
  return o.garmentIds.map((id) => wardrobe.garments.find((g) => g.id === id)).filter(Boolean) as Garment[]
}

function reshuffle() {
  excluded.value = [...excluded.value, ...results.value.map((o) => o.id)]
  void wardrobe
  void settings
  void topN
}

async function wear(o: ScoredOutfit) {
  try {
    await logWear(o, { scene: scene.value, city: weather.now?.city, temp: temp.value, feelsLike: temp.value })
    message.success('已记录穿搭')
  } catch (e) {
    message.warning(e instanceof DuplicateWearError ? e.message : '记录失败')
  }
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">搭配实验室</h1>
    <div class="page-sub">设定条件，本地规则引擎即时生成可解释的搭配。</div>

    <div class="panel card">
      <label>场景</label>
      <n-select v-model:value="scene" :options="SCENES.map(s => ({ label: s, value: s }))" size="small" />
      <label>温度 {{ temp }}°C（体感优先）</label>
      <n-slider v-model:value="temp" :min="-10" :max="38" />
      <div class="spread switches">
        <span class="muted">有降水，必须有外层</span><n-switch v-model:value="rain" />
      </div>
      <div class="spread switches">
        <span class="muted">大风天</span><n-switch v-model:value="wind" />
      </div>
      <label>推荐套数 {{ topN }}</label>
      <n-slider v-model:value="topN" :min="1" :max="5" :step="1" />
      <button class="warm-btn primary wide" @click="reshuffle">换一批搭配</button>
    </div>

    <div class="section-title"><h2>推荐结果</h2><span class="muted">{{ results.length }} 套</span></div>
    <div v-if="results.length" class="results">
      <outfit-card
        v-for="o in results" :key="o.id" :outfit="o" :items="itemsOf(o)" :temp="temp"
        @wear="wear(o)" @swap="reshuffle" @reject="reshuffle"
      />
    </div>
    <div v-else class="empty card">
      <h3>没有符合条件的搭配</h3>
      <p class="muted">试试放宽温度范围、关闭降水条件，或录入更多上装与下装。</p>
    </div>
  </div>
</template>

<style scoped>
.panel { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.panel label { font-size: 12px; color: var(--text-3); margin-top: 6px; }
.switches { padding: 6px 0; }
.wide { width: 100%; margin-top: 12px; }
.results { display: flex; flex-direction: column; gap: 14px; }
.empty { text-align: center; padding: 36px 16px; }
@media (min-width: 1024px) {
  .panel { max-width: 360px; }
}
</style>
