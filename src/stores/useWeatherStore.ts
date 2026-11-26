import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Season, WeatherNow } from '../types'
import { useSettingsStore } from './useSettingsStore'
import { locate } from '../services/weather/locate'
import {
  cacheIsFresh,
  describeWeather,
  fetchWeather,
  geocodeCity,
  readCachedWeather,
  saveWeather,
} from '../services/weather/openMeteo'

function seasonOf(ts: number): Season {
  const m = new Date(ts).getMonth() + 1
  if (m >= 3 && m <= 5) return '春'
  if (m >= 6 && m <= 8) return '夏'
  if (m >= 9 && m <= 11) return '秋'
  return '冬'
}

export const useWeatherStore = defineStore('weather', () => {
  const now = ref<WeatherNow | null>(null)
  const loading = ref(false)
  const error = ref('')

  const effectiveTemp = computed(() => now.value?.feelsLike ?? now.value?.temp ?? 20)
  const season = computed(() => seasonOf(Date.now()))
  const rain = computed(() => {
    if (!now.value) return false
    return now.value.precipitation > 0 || now.value.weatherCode >= 51
  })
  const wind = computed(() => (now.value?.windSpeed ?? 0) > 25)

  async function init() {
    now.value = await readCachedWeather()
    if (await cacheIsFresh()) return
    await refresh().catch(() => undefined)
  }

  async function refresh() {
    loading.value = true
    error.value = ''
    try {
      const settings = useSettingsStore()
      const coords = await locate()
      if (coords) {
        const w = await fetchWeather(coords, '当前位置', 'geo')
        now.value = w
        await saveWeather(w)
        return
      }
      if (settings.city) {
        const g = await geocodeCity(settings.city)
        if (!g) throw new Error('找不到这个城市')
        const w = await fetchWeather(g, g.label, 'city')
        now.value = w
        await saveWeather(w)
        return
      }
      throw new Error('未授权定位，也未设置城市')
    } catch (e) {
      error.value = e instanceof Error ? e.message : '天气获取失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function setCity(city: string) {
    const settings = useSettingsStore()
    await settings.setCity(city)
    const g = await geocodeCity(city)
    if (!g) throw new Error('找不到这个城市')
    const w = await fetchWeather(g, g.label, 'city')
    now.value = w
    await saveWeather(w)
  }

  function setManual(temp: number, weatherCode = 0) {
    const settings = useSettingsStore()
    now.value = {
      city: settings.city || '手动输入',
      temp,
      feelsLike: temp,
      humidity: 0,
      windSpeed: 0,
      precipitation: 0,
      weatherCode,
      weatherText: describeWeather(weatherCode),
      observedAt: Date.now(),
      source: 'manual',
    }
  }

  async function persistManual() {
    if (now.value) await saveWeather(now.value)
  }

  return { now, loading, error, effectiveTemp, season, rain, wind, init, refresh, setCity, setManual, persistManual }
})
