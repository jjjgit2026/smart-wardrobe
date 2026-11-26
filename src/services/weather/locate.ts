export interface Coords {
  lat: number
  lon: number
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
