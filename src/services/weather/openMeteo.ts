import type { WeatherNow } from '../../types'
import { weatherCacheRepo } from '../../db/repositories'
import type { Coords } from './locate'

export const WMO_TEXT: Record<number, string> = {
  0: '晴', 1: '大部晴朗', 2: '局部多云', 3: '阴',
  45: '雾', 48: '雾凇',
  51: '小毛毛雨', 53: '毛毛雨', 55: '浓毛毛雨', 56: '冻毛毛雨', 57: '强冻毛毛雨',
  61: '小雨', 63: '中雨', 65: '大雨', 66: '冻雨', 67: '强冻雨',
  71: '小雪', 73: '中雪', 75: '大雪', 77: '米雪',
  80: '阵雨', 81: '强阵雨', 82: '暴雨', 85: '阵雪', 86: '强阵雪',
  95: '雷阵雨', 96: '雷暴伴冰雹', 99: '强雷暴伴冰雹',
}

export function describeWeather(code: number): string {
  return WMO_TEXT[code] ?? '未知天气'
}

export const CACHE_TTL = 30 * 60 * 1000

export async function geocodeCity(name: string): Promise<Coords & { label: string } | null> {
  if (!name.trim()) return null
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.searchParams.set('name', name.trim())
  url.searchParams.set('count', '1')
  url.searchParams.set('language', 'zh')
  url.searchParams.set('format', 'json')
  const res = await fetch(url)
  if (!res.ok) return null
  const json = await res.json() as { results?: Array<{ latitude: number; longitude: number; name: string }> }
  const first = json.results?.[0]
  return first ? { lat: first.latitude, lon: first.longitude, label: first.name } : null
}

export async function fetchWeather(coords: Coords, city: string, source: WeatherNow['source']): Promise<WeatherNow> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(coords.lat))
  url.searchParams.set('longitude', String(coords.lon))
  url.searchParams.set('current', 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m')
  url.searchParams.set('timezone', 'Asia/Shanghai')
  const res = await fetch(url)
  if (!res.ok) throw new Error(`天气请求失败: ${res.status}`)
  const json = await res.json() as {
    current: {
      time: string
      temperature_2m: number
      apparent_temperature: number
      relative_humidity_2m: number
      precipitation: number
      weather_code: number
      wind_speed_10m: number
    }
  }
  const c = json.current
  return {
    city,
    temp: c.temperature_2m,
    feelsLike: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    windSpeed: c.wind_speed_10m,
    precipitation: c.precipitation,
    weatherCode: c.weather_code,
    weatherText: describeWeather(c.weather_code),
    observedAt: new Date(c.time).getTime() || Date.now(),
    source,
  }
}

export async function readCachedWeather(): Promise<WeatherNow | null> {
  const row = await weatherCacheRepo.get()
  if (!row) return null
  return {
    city: row.city,
    temp: row.temp,
    feelsLike: row.feelsLike,
    humidity: row.humidity,
    windSpeed: row.windSpeed,
    precipitation: row.precipitation,
    weatherCode: row.weatherCode,
    weatherText: row.weatherText,
    observedAt: row.observedAt,
    source: row.source,
  }
}

export async function saveWeather(now: WeatherNow): Promise<void> {
  const ts = Date.now()
  await weatherCacheRepo.put({
    key: 'current',
    city: now.city,
    temp: now.temp,
    feelsLike: now.feelsLike,
    humidity: now.humidity,
    windSpeed: now.windSpeed,
    precipitation: now.precipitation,
    weatherCode: now.weatherCode,
    weatherText: now.weatherText,
    observedAt: now.observedAt,
    fetchedAt: ts,
    expiresAt: ts + CACHE_TTL,
    source: now.source,
  })
}

export async function cacheIsFresh(): Promise<boolean> {
  const row = await weatherCacheRepo.get()
  return !!row && row.expiresAt > Date.now()
}
