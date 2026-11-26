export interface CompressedImage {
  main: Blob
  thumb: Blob
  dominantColor: string
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('图片压缩失败'))),
      'image/webp',
      quality
    )
  })
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
    bitmap = await createImageBitmap(file)
    source = bitmap
  } else {
    source = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }
  try {
    const mainCanvas = drawScaled(source, 1600)
    const thumbCanvas = drawScaled(source, 400)
    return {
      main: await canvasToBlob(mainCanvas, 0.82),
      thumb: await canvasToBlob(thumbCanvas, 0.7),
      dominantColor: averageColor(thumbCanvas),
    }
  } finally {
    bitmap?.close()
  }
}

export function blobToUrl(blob?: Blob): string {
  return blob ? URL.createObjectURL(blob) : ''
}
