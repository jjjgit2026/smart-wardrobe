<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import WeatherPill from '../components/common/WeatherPill.vue'
import ReminderBar from '../components/common/ReminderBar.vue'
import OutfitCard from '../components/outfit/OutfitCard.vue'
import { useWardrobeStore } from '../stores/useWardrobeStore'
import { useWeatherStore } from '../stores/useWeatherStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import { recommend, type ScoredOutfit } from '../services/recommend/engine'
import { DuplicateWearError, logWear, markWashed, undoWear } from '../services/wear/logWear'
import type { Garment } from '../types'

const wardrobe = useWardrobeStore()
const weather = useWeatherStore()
const settings = useSettingsStore()
const router = useRouter()
const message = useMessage()
const excluded = ref<string[]>([])

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 11) return '早安，今天穿什么'
  if (h < 14) return '午安，今天穿什么'
  if (h < 18) return '下午好，今天穿什么'
  return '晚上好，明天穿什么'
})

const outfits = computed<ScoredOutfit[]>(() => {
  if (!wardrobe.garments.length) return []
  return recommend(wardrobe.garments, {
    scene: settings.defaultScene,
    temp: weather.effectiveTemp,
    season: weather.season,
    rain: weather.rain,
    wind: weather.wind,
    topN: settings.topN,
    excludeOutfitIds: excluded.value,
  })
})

function itemsOf(o: OutfitLike): Garment[] {
  return o.garmentIds.map((id) => wardrobe.garments.find((g) => g.id === id)).filter(Boolean) as Garment[]
}
type OutfitLike = { garmentIds: string[] }

function swap() {
  excluded.value = [...excluded.value, ...outfits.value.map((o) => o.id)]
}

async function wear(o: ScoredOutfit) {
  try {
    await logWear(o, {
      scene: settings.defaultScene,
      city: weather.now?.city,
      temp: weather.now?.temp,
      feelsLike: weather.now?.feelsLike,
      weatherCode: weather.now?.weatherCode,
    })
    message.success('已记录，穿着次数 +1')
  } catch (e) {
    if (e instanceof DuplicateWearError) message.warning(e.message)
    else message.error('记录失败，请重试')
  }
}

async function washed(ids: string[]) {
  await markWashed(ids)
  await wardrobe.refresh()
  message.success('已标记清洗')
}

async function refreshWeather() {
  try {
    await weather.refresh()
    message.success('天气已更新')
  } catch {
    message.warning('定位不可用，可在设置里选城市或手动输入温度')
  }
}

async function undo(id: string) {
  await undoWear(id)
  await wardrobe.refresh()
  message.success('已撤销记录')
}
</script>

<template>
  <div class="page">
    <div class="spread">
      <div>
        <h1 class="page-title">{{ greeting }}</h1>
        <div class="page-sub">{{ new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }) }}</div>
      </div>
      <router-link to="/settings" class="gear" aria-label="设置">⚙</router-link>
    </div>

    <weather-pill :weather="weather.now" :loading="weather.loading" @refresh="refreshWeather" />
    <reminder-bar :items="wardrobe.toWash" @washed="washed" @open="router.push('/wardrobe')" />

    <div class="section-title">
      <h2>为你搭好了</h2>
      <button class="link" @click="swap">换一批</button>
    </div>

    <template v-if="outfits.length">
      <outfit-card
        v-for="o in outfits"
        :key="o.id"
        :outfit="o"
        :items="itemsOf(o)"
        :temp="weather.effectiveTemp"
        @wear="wear(o)"
        @swap="swap"
        @reject="swap"
      />
    </template>
    <div v-else class="empty card">
      <div class="empty-icon">衣</div>
      <h3>{{ wardrobe.garments.length ? '当前条件下没有合适搭配' : '衣橱还是空的' }}</h3>
      <p class="muted">{{ wardrobe.garments.length ? '试试调整场景或温度，或先录入更多单品。' : '先录入几件常用衣服，智能搭配就能开始了。' }}</p>
      <button class="warm-btn primary" @click="router.push(wardrobe.garments.length ? '/lab' : '/capture')">
        {{ wardrobe.garments.length ? '去搭配实验室' : '录入第一件衣服' }}
      </button>
    </div>

    <div class="section-title"><h3>今日已记录</h3><span class="muted">{{ wardrobe.todayLogs.length }} 套</span></div>
    <div class="today card">
      <div v-if="wardrobe.todayLogs.length" class="today-list">
        <div v-for="l in wardrobe.todayLogs" :key="l.id" class="today-row">
          <span>{{ l.scene }} · {{ l.garmentIds.length }} 件 · {{ l.temp != null ? Math.round(l.temp) + '°' : '手动' }}</span>
          <button class="link" @click="undo(l.id)">撤销</button>
        </div>
      </div>
      <div v-else class="muted">今天还没有记录穿搭</div>
    </div>
  </div>
</template>

<style scoped>
.gear { font-size: 20px; color: var(--text-3); text-decoration: none; }
.link { border: 0; background: transparent; color: var(--primary); font-size: 13px; cursor: pointer; }
.empty { text-align: center; padding: 40px 20px; margin-top: 8px; }
.empty-icon { width: 56px; height: 56px; margin: 0 auto 12px; border-radius: 18px; background: var(--primary-wash); color: var(--primary); display: grid; place-items: center; font-family: var(--font-serif); font-size: 24px; }
.today { padding: 14px; }
.today-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
.today-row:last-child { border-bottom: 0; }
</style>
