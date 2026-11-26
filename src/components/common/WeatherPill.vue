<script setup lang="ts">
import type { WeatherNow } from '../../types'
defineProps<{ weather: WeatherNow | null; loading?: boolean }>()
const emit = defineEmits<{ refresh: [] }>()
</script>

<template>
  <div class="wrap">
    <div class="pill">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--info)" stroke-width="1.6">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" stroke-linecap="round" />
      </svg>
      <div class="city">{{ weather?.city || '未获取天气' }}</div>
      <div class="temp">{{ weather ? Math.round(weather.temp) : '--' }}°</div>
      <div class="desc">{{ weather ? `体感 ${Math.round(weather.feelsLike)}° · ${weather.weatherText}` : '可在设置里选城市' }}</div>
      <button class="refresh" :disabled="loading" aria-label="刷新天气" @click="emit('refresh')">↻</button>
    </div>
    <a class="credit" href="https://open-meteo.com/" target="_blank" rel="noopener">Weather data by Open-Meteo.com</a>
  </div>
</template>

<style scoped>
.wrap { position: relative; margin-bottom: 8px; }
.pill {
  height: 44px; display: flex; align-items: center; gap: 8px;
  padding: 0 12px; background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r-pill); box-shadow: var(--shadow-sm);
}
.city { font-size: 13px; color: var(--text-2); white-space: nowrap; }
.temp { font-family: var(--font-num); font-size: 26px; color: var(--primary); line-height: 1; }
.desc { font-size: 12px; color: var(--text-3); margin-left: auto; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.refresh { border: 0; background: transparent; font-size: 18px; color: var(--text-3); width: 28px; cursor: pointer; }
.credit { display: block; text-align: right; font-size: 10px; margin: 3px 6px 0; color: var(--text-3); text-decoration: none; }
</style>
