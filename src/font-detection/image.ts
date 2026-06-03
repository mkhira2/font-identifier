import type { OcrWord } from './types'

export const SAMPLE_CANVAS_WIDTH = 132
export const SAMPLE_CANVAS_HEIGHT = 64

export const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Unable to decode image.'))
    }
    image.src = url
  })
}

export const buildCanvasFromImage = (image: HTMLImageElement): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Unable to start image processing.')
  }

  context.drawImage(image, 0, 0)
  return canvas
}

export const preprocessCanvas = (source: HTMLCanvasElement): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  canvas.width = source.width
  canvas.height = source.height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Unable to preprocess image.')
  }

  context.drawImage(source, 0, 0)
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const pixels = imageData.data
  const luma = Array.from({ length: canvas.width * canvas.height }, () => 0)

  // Contrast and sharpness normalization improves OCR stability on screenshots and photos.
  for (let i = 0; i < pixels.length; i += 4) {
    const red = pixels[i] ?? 255
    const green = pixels[i + 1] ?? 255
    const blue = pixels[i + 2] ?? 255
    const gray = Math.round(0.2126 * red + 0.7152 * green + 0.0722 * blue)

    const boosted = Math.max(0, Math.min(255, Math.round((gray - 128) * 1.3 + 128)))
    luma[i / 4] = boosted
  }

  for (let y = 1; y < canvas.height - 1; y += 1) {
    for (let x = 1; x < canvas.width - 1; x += 1) {
      const index = y * canvas.width + x
      const center = luma[index] ?? 255
      const left = luma[index - 1] ?? center
      const right = luma[index + 1] ?? center
      const up = luma[index - canvas.width] ?? center
      const down = luma[index + canvas.width] ?? center
      const blur = (left + right + up + down + center * 4) / 8
      const sharpened = Math.max(0, Math.min(255, Math.round(center + (center - blur) * 1.25)))
      const pixelOffset = index * 4

      const boosted = sharpened
      pixels[pixelOffset] = boosted
      pixels[pixelOffset + 1] = boosted
      pixels[pixelOffset + 2] = boosted
    }
  }

  context.putImageData(imageData, 0, 0)
  return canvas
}

export const cropWord = (
  baseCanvas: HTMLCanvasElement,
  bbox: OcrWord['bbox'],
): HTMLCanvasElement => {
  const padding = 6
  const width = Math.max(10, Math.floor(bbox.x1 - bbox.x0 + padding * 2))
  const height = Math.max(10, Math.floor(bbox.y1 - bbox.y0 + padding * 2))
  const left = Math.max(0, Math.floor(bbox.x0 - padding))
  const top = Math.max(0, Math.floor(bbox.y0 - padding))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Unable to crop sample text.')
  }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(baseCanvas, left, top, width, height, 0, 0, width, height)
  return canvas
}

export const trimCanvasToInk = (source: HTMLCanvasElement): HTMLCanvasElement => {
  const context = source.getContext('2d')
  if (!context) {
    return source
  }

  const { width, height } = source
  const data = context.getImageData(0, 0, width, height).data

  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  let found = false

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4
      const red = data[offset] ?? 255
      const green = data[offset + 1] ?? 255
      const blue = data[offset + 2] ?? 255
      const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255
      if (luminance < 0.82) {
        found = true
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  if (!found) {
    return source
  }

  const pad = 2
  const left = Math.max(0, minX - pad)
  const top = Math.max(0, minY - pad)
  const right = Math.min(width - 1, maxX + pad)
  const bottom = Math.min(height - 1, maxY + pad)
  const outWidth = Math.max(4, right - left + 1)
  const outHeight = Math.max(4, bottom - top + 1)

  const out = document.createElement('canvas')
  out.width = outWidth
  out.height = outHeight
  const outContext = out.getContext('2d')
  if (!outContext) {
    return source
  }

  outContext.fillStyle = '#ffffff'
  outContext.fillRect(0, 0, outWidth, outHeight)
  outContext.drawImage(source, left, top, outWidth, outHeight, 0, 0, outWidth, outHeight)
  return out
}

export const renderSyntheticText = (
  text: string,
  fontFamily: string,
  width: number,
  height: number,
  weight: 400 | 700,
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Unable to render synthetic text.')
  }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)

  const maxFontSize = Math.max(14, Math.floor(height * 0.78))
  const minFontSize = 12
  let fontSize = maxFontSize

  context.font = `${weight} ${fontSize}px "${fontFamily}", sans-serif`
  while (fontSize > minFontSize) {
    const measured = context.measureText(text).width
    if (measured <= width * 0.9) {
      break
    }
    fontSize -= 1
    context.font = `${weight} ${fontSize}px "${fontFamily}", sans-serif`
  }

  context.fillStyle = '#111111'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = `${weight} ${fontSize}px "${fontFamily}", sans-serif`
  context.fillText(text, width / 2, height / 2)
  return canvas
}
