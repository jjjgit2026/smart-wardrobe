export type Season = '春' | '夏' | '秋' | '冬'
export type Thickness = 1 | 2 | 3 | 4 | 5
export type Category = 'top' | 'bottom' | 'onePiece' | 'outerwear' | 'shoes' | 'accessory'
export type LayerRole = 'inner' | 'outer' | 'bottom' | 'onePiece' | 'accessory'
export type GarmentStatus = 'available' | 'needsWash' | 'washing' | 'archived'
export type SleeveLength = 'none' | 'short' | 'long'

export interface Garment {
  id: string
  photoBlob?: Blob
  thumbBlob?: Blob
  dominantColor: string
  category: Category
  subCategory: string
  colorName: string
  thickness: Thickness
  sleeveLength: SleeveLength
  materialLook: string
  seasons: Season[]
  tempMin: number
  tempMax: number
  layerRole: LayerRole
  /** 可作穿着层级（多选）：inner/outer 等。缺省时按 layerRole 单值处理，兼容旧数据 */
  layerRoles?: LayerRole[]
  styleTags: string[]
  sceneBlacklist: string[]
  status: GarmentStatus
  wearCount: number
  wearsSinceWash: number
  lastWornAt?: number
  lastWashedAt?: number
  washThreshold: number
  aiConfidence?: number
  isHumanCorrected: boolean
  createdAt: number
  updatedAt: number
}

export interface Outfit {
  id: string
  garmentIds: string[]
  name: string
  sceneTags: string[]
  tempRange: [number, number]
  score: number
  reasons: string[]
  source: 'rule' | 'manual'
  createdAt: number
  acceptCount: number
}

export interface WearLog {
  id: string
  dateKey: string
  wornAt: number
  outfitId?: string
  garmentIds: string[]
  scene: string
  city?: string
  temp?: number
  feelsLike?: number
  weatherCode?: number
  isUndone: boolean
  createdAt: number
}

export interface Feedback {
  id: string
  outfitId: string
  action: 'accept' | 'reject' | 'replace' | 'skip'
  scene: string
  garmentIds: string[]
  temp?: number
  createdAt: number
}

export interface WeatherCache {
  key: string
  city: string
  temp: number
  feelsLike: number
  humidity: number
  windSpeed: number
  precipitation: number
  weatherCode: number
  weatherText: string
  observedAt: number
  fetchedAt: number
  expiresAt: number
  source: 'geo' | 'city' | 'manual'
}

export interface RecommendConditions {
  scene: string
  temp: number
  season: Season
  rain: boolean
  wind: boolean
  topN: number
  excludeOutfitIds?: string[]
}

export interface WeatherNow {
  city: string
  temp: number
  feelsLike: number
  humidity: number
  windSpeed: number
  precipitation: number
  weatherCode: number
  weatherText: string
  observedAt: number
  source: 'geo' | 'city' | 'manual'
}
