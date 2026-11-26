export interface Coords {
  lat: number
  lon: number
  city?: string
}

export async function locateByIP(): Promise<Coords | null> {
  try {
    const res = await fetch('https://ipwho.is/?lang=zh-CN')
    if (!res.ok) return null
    const json = await res.json() as {
      success?: boolean
      latitude?: number
      longitude?: number
      city?: string
    }
    if (json.success === false) return null
    if (typeof json.latitude !== 'number' || typeof json.longitude !== 'number') return null
    return { lat: json.latitude, lon: json.longitude, city: json.city }
  } catch {
    return null
  }
}

export async function locate(): Promise<Coords | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null
  return new Promise((resolve) => {
    let settled = false
    const finish = (value: Coords | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(value)
    }
    const timer = setTimeout(() => finish(null), 8000)
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => finish({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => finish(null),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 15 * 60 * 1000 }
      )
    } catch {
      finish(null)
    }
  })
}
