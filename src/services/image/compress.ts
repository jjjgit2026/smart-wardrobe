import type { Garment } from '../../types'

export interface CompressedImage {
  /** data URL 字符串：避免移动 WebView 写 Blob 时 IndexedDB 事务中止 */
  mainUrl: string
  thumbUrl: string
  dominantColor: string
}

function canvasToDataUrl(canvas: HTMLCanvasElement, quality: number): string {
  // toDataURL 在所有移动 WebView（含微信 X5/WKWebView）都受支持，兼容性优于 toBlob
  return canvas.toDataURL('image/webp', quality)
}

function drawScaled(source: ImageBitmap | HTMLImageElement, max: number): HTMLCanvasElement {
  const isImg = typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement
  const sw = isImg ? (source as HTMLImageElement).naturalWidth : (source as ImageBitmap).width
  const sh = isImg ? (source as HTMLImageElement).naturalHeight : (source as ImageBitmap).height
  const scale = Math.min(1, max / Math.max(sw, sh))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(sw * scale))
  canvas.height = Math.max(1, Math.round(sh * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建画布')
  ctx.drawImage(source as CanvasImageSource, 0, 0, canvas.width, canvas.height)
  return canvas
}

function averageColor(canvas: HTMLCanvasElement): string {
  const tiny = document.createElement('canvas')
  tiny.width = 1
  tiny.height = 1
  const ctx = tiny.getContext('2d')
  if (!ctx) return '#C9A989'
  ctx.drawImage(canvas, 0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

export async function compressImage(file: File): Promise<CompressedImage> {
  let bitmap: ImageBitmap | null = null
  let source: ImageBitmap | HTMLImageElement
  if (typeof createImageBitmap === 'function') {
    try {
      bitmap = await createImageBitmap(file)
      source = bitmap
    } catch {
      // 部分 WebView 的 createImageBitmap 对某些格式失败，回退到 Image
      source = await loadViaImage(file)
    }
  } else {
    source = await loadViaImage(file)
  }
  try {
    const mainCanvas = drawScaled(source, 1600)
    const thumbCanvas = drawScaled(source, 400)
    return {
      mainUrl: canvasToDataUrl(mainCanvas, 0.82),
      thumbUrl: canvasToDataUrl(thumbCanvas, 0.7),
      dominantColor: averageColor(thumbCanvas),
    }
  } finally {
    bitmap?.close()
  }
}

function loadViaImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => { URL.revokeObjectURL(objectUrl); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('图片解码失败')) }
    img.src = objectUrl
  })
}

/** 兼容旧数据：优先 data URL，退回 Blob 生成临时 URL */
export function blobToUrl(blob?: Blob): string {
  return blob ? URL.createObjectURL(blob) : ''
}

/** 统一读取衣物的缩略图地址，优先 data URL，兼容旧 Blob 数据 */
export function garmentThumbUrl(garment?: Garment | null): string {
  if (!garment) return ''
  if (garment.thumbUrl) return garment.thumbUrl
  return blobToUrl(garment.thumbBlob)
}

/** 统一读取衣物的原图地址，优先 data URL，兼容旧 Blob 数据 */
export function garmentPhotoUrl(garment?: Garment | null): string {
  if (!garment) return ''
  if (garment.photoUrl) return garment.photoUrl
  return blobToUrl(garment.photoBlob)
}
