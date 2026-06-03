import Tesseract from 'tesseract.js'

type ProgressCallback = (progress: number, status: string) => void

type FontCandidate = {
  family: string
  category: 'Sans-serif' | 'Serif' | 'Display' | 'Monospace'
  faces: string[]
}

type ActiveFontCandidate = FontCandidate & {
  activeFace: string
}

type OcrWord = {
  text: string
  confidence: number
  font_name?: string
  symbols?: OcrSymbol[]
  bbox: {
    x0: number
    y0: number
    x1: number
    y1: number
  }
}

type OcrSymbol = {
  text: string
  confidence: number
  bbox: {
    x0: number
    y0: number
    x1: number
    y1: number
  }
}

type OcrPage = {
  blocks?: OcrBlock[] | null
}

type OcrBlock = {
  paragraphs?: OcrParagraph[]
}

type OcrParagraph = {
  lines?: OcrLine[]
}

type OcrLine = {
  text?: string
  confidence?: number
  bbox?: OcrWord['bbox']
  words?: OcrWord[]
}

type RankedFont = {
  family: string
  category: FontCandidate['category']
  confidence: number
}

export type DetectionDebugSample = {
  text: string
  source: 'line' | 'word' | 'symbol'
  confidence: number
  bbox: OcrWord['bbox']
}

export type DetectionDebugCandidate = {
  family: string
  activeFace: string
  category: FontCandidate['category']
  confidence: number
  avgDistance: number
  sampleCount: number
}

export type DetectionDebug = {
  sampleCount: number
  availableCandidateCount: number
  confidenceGap: number
  samples: DetectionDebugSample[]
  candidates: DetectionDebugCandidate[]
}

export type FontDetectionResult = {
  topMatch: RankedFont
  alternatives: RankedFont[]
  sampleWords: string[]
  debug: DetectionDebug
}

const FONT_CANDIDATES: FontCandidate[] = [
  { family: 'Arial', category: 'Sans-serif', faces: ['Arial', 'Arimo'] },
  { family: 'Arial Black', category: 'Display', faces: ['Arial Black'] },
  { family: 'Helvetica', category: 'Sans-serif', faces: ['Helvetica Neue', 'Helvetica'] },
  { family: 'Verdana', category: 'Sans-serif', faces: ['Verdana'] },
  { family: 'Tahoma', category: 'Sans-serif', faces: ['Tahoma'] },
  { family: 'Trebuchet MS', category: 'Sans-serif', faces: ['Trebuchet MS'] },
  { family: 'Calibri', category: 'Sans-serif', faces: ['Calibri', 'Carlito'] },
  { family: 'Segoe UI', category: 'Sans-serif', faces: ['Segoe UI'] },
  { family: 'Geneva', category: 'Sans-serif', faces: ['Geneva'] },
  { family: 'Lucida Sans Unicode', category: 'Sans-serif', faces: ['Lucida Sans Unicode'] },
  { family: 'Roboto', category: 'Sans-serif', faces: ['Roboto'] },
  { family: 'Open Sans', category: 'Sans-serif', faces: ['Open Sans'] },
  { family: 'Lato', category: 'Sans-serif', faces: ['Lato'] },
  { family: 'Montserrat', category: 'Sans-serif', faces: ['Montserrat'] },
  { family: 'Poppins', category: 'Sans-serif', faces: ['Poppins'] },
  { family: 'Raleway', category: 'Sans-serif', faces: ['Raleway'] },
  { family: 'Source Sans 3', category: 'Sans-serif', faces: ['Source Sans 3'] },
  { family: 'Nunito', category: 'Sans-serif', faces: ['Nunito'] },
  { family: 'Fira Sans', category: 'Sans-serif', faces: ['Fira Sans'] },
  { family: 'Ubuntu', category: 'Sans-serif', faces: ['Ubuntu'] },
  { family: 'Work Sans', category: 'Sans-serif', faces: ['Work Sans'] },
  { family: 'Rubik', category: 'Sans-serif', faces: ['Rubik'] },
  { family: 'DM Sans', category: 'Sans-serif', faces: ['DM Sans'] },
  { family: 'Manrope', category: 'Sans-serif', faces: ['Manrope'] },
  { family: 'Mulish', category: 'Sans-serif', faces: ['Mulish'] },
  { family: 'Karla', category: 'Sans-serif', faces: ['Karla'] },
  { family: 'Cabin', category: 'Sans-serif', faces: ['Cabin'] },
  { family: 'Barlow', category: 'Sans-serif', faces: ['Barlow'] },
  { family: 'Barlow Condensed', category: 'Sans-serif', faces: ['Barlow Condensed'] },
  { family: 'Exo 2', category: 'Sans-serif', faces: ['Exo 2'] },
  { family: 'Titillium Web', category: 'Sans-serif', faces: ['Titillium Web'] },
  { family: 'Quicksand', category: 'Sans-serif', faces: ['Quicksand'] },
  { family: 'Josefin Sans', category: 'Sans-serif', faces: ['Josefin Sans'] },
  { family: 'Noto Sans', category: 'Sans-serif', faces: ['Noto Sans'] },
  { family: 'Inter', category: 'Sans-serif', faces: ['Inter'] },
  { family: 'Roboto Slab', category: 'Serif', faces: ['Roboto Slab'] },
  { family: 'Arvo', category: 'Serif', faces: ['Arvo'] },
  { family: 'Bree Serif', category: 'Serif', faces: ['Bree Serif'] },
  { family: 'Cambria', category: 'Serif', faces: ['Cambria', 'Caladea'] },
  { family: 'Times New Roman', category: 'Serif', faces: ['Times New Roman', 'Tinos'] },
  { family: 'Georgia', category: 'Serif', faces: ['Georgia'] },
  { family: 'Garamond', category: 'Serif', faces: ['Garamond', 'EB Garamond'] },
  { family: 'Palatino', category: 'Serif', faces: ['Palatino Linotype', 'Book Antiqua', 'Palatino'] },
  { family: 'Baskerville', category: 'Serif', faces: ['Libre Baskerville', 'Baskerville'] },
  { family: 'Didot', category: 'Serif', faces: ['Didot'] },
  { family: 'Merriweather', category: 'Serif', faces: ['Merriweather'] },
  { family: 'PT Serif', category: 'Serif', faces: ['PT Serif'] },
  { family: 'Playfair Display', category: 'Serif', faces: ['Playfair Display'] },
  { family: 'Lora', category: 'Serif', faces: ['Lora'] },
  { family: 'Noto Serif', category: 'Serif', faces: ['Noto Serif'] },
  { family: 'Zilla Slab', category: 'Serif', faces: ['Zilla Slab'] },
  { family: 'Cormorant Garamond', category: 'Serif', faces: ['Cormorant Garamond'] },
  { family: 'Comic Sans MS', category: 'Display', faces: ['Comic Sans MS', 'Comic Neue', 'Chalkboard SE', 'Chalkboard', 'Marker Felt'] },
  { family: 'Comic Neue', category: 'Display', faces: ['Comic Neue', 'Comic Sans MS', 'Chalkboard SE'] },
  { family: 'Chalkboard', category: 'Display', faces: ['Chalkboard SE', 'Chalkboard', 'Comic Sans MS'] },
  { family: 'Marker Felt', category: 'Display', faces: ['Marker Felt', 'Comic Sans MS'] },
  { family: 'Patrick Hand', category: 'Display', faces: ['Patrick Hand'] },
  { family: 'Gloria Hallelujah', category: 'Display', faces: ['Gloria Hallelujah'] },
  { family: 'Schoolbell', category: 'Display', faces: ['Schoolbell'] },
  { family: 'Handlee', category: 'Display', faces: ['Handlee'] },
  { family: 'Architects Daughter', category: 'Display', faces: ['Architects Daughter'] },
  { family: 'Impact', category: 'Display', faces: ['Impact'] },
  { family: 'Oswald', category: 'Display', faces: ['Oswald'] },
  { family: 'Bebas Neue', category: 'Display', faces: ['Bebas Neue'] },
  { family: 'Anton', category: 'Display', faces: ['Anton'] },
  { family: 'Archivo Black', category: 'Display', faces: ['Archivo Black'] },
  { family: 'Permanent Marker', category: 'Display', faces: ['Permanent Marker'] },
  { family: 'Pacifico', category: 'Display', faces: ['Pacifico'] },
  { family: 'Lobster', category: 'Display', faces: ['Lobster'] },
  { family: 'Amatic SC', category: 'Display', faces: ['Amatic SC'] },
  { family: 'Caveat', category: 'Display', faces: ['Caveat'] },
  { family: 'Indie Flower', category: 'Display', faces: ['Indie Flower'] },
  { family: 'Shadows Into Light', category: 'Display', faces: ['Shadows Into Light'] },
  { family: 'Courier New', category: 'Display', faces: ['Courier New', 'Cousine'] },
  { family: 'Consolas', category: 'Display', faces: ['Consolas'] },
  { family: 'Roboto Mono', category: 'Monospace', faces: ['Roboto Mono'] },
  { family: 'Source Code Pro', category: 'Monospace', faces: ['Source Code Pro'] },
  { family: 'IBM Plex Mono', category: 'Monospace', faces: ['IBM Plex Mono'] },
  { family: 'JetBrains Mono', category: 'Monospace', faces: ['JetBrains Mono'] },
  { family: 'Fira Mono', category: 'Monospace', faces: ['Fira Mono'] },
  { family: 'Inconsolata', category: 'Monospace', faces: ['Inconsolata'] },
  { family: 'Space Mono', category: 'Monospace', faces: ['Space Mono'] },
  { family: 'Ubuntu Mono', category: 'Monospace', faces: ['Ubuntu Mono'] },
  { family: 'Courier Prime', category: 'Monospace', faces: ['Courier Prime'] },
]

const SAMPLE_CANVAS_WIDTH = 132
const SAMPLE_CANVAS_HEIGHT = 64

const loadImage = (file: File): Promise<HTMLImageElement> => {
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

const buildCanvasFromImage = (image: HTMLImageElement): HTMLCanvasElement => {
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

const preprocessCanvas = (source: HTMLCanvasElement): HTMLCanvasElement => {
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

const cropWord = (
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

const trimCanvasToInk = (source: HTMLCanvasElement): HTMLCanvasElement => {
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

const renderSyntheticText = (
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

type Signature = {
  rows: number[]
  cols: number[]
  density: number
  grid: number[]
  pixels: number[]
  edgeHist: number[]
}

const GRID_COLS = 22
const GRID_ROWS = 12
const EDGE_BINS = 8

const signatureFromCanvas = (source: HTMLCanvasElement): Signature => {
  const normalized = document.createElement('canvas')
  normalized.width = SAMPLE_CANVAS_WIDTH
  normalized.height = SAMPLE_CANVAS_HEIGHT

  const context = normalized.getContext('2d')
  if (!context) {
    throw new Error('Unable to normalize text sample.')
  }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, normalized.width, normalized.height)
  context.drawImage(source, 0, 0, normalized.width, normalized.height)

  const data = context.getImageData(0, 0, normalized.width, normalized.height).data
  const rows = Array.from({ length: normalized.height }, () => 0)
  const cols = Array.from({ length: normalized.width }, () => 0)
  const pixels = Array.from({ length: normalized.width * normalized.height }, () => 0)
  const darknessMap = Array.from({ length: normalized.width * normalized.height }, () => 0)
  let density = 0
  const threshold = 0.34

  for (let y = 0; y < normalized.height; y += 1) {
    for (let x = 0; x < normalized.width; x += 1) {
      const offset = (y * normalized.width + x) * 4
      const red = data[offset] ?? 255
      const green = data[offset + 1] ?? 255
      const blue = data[offset + 2] ?? 255
      const alpha = data[offset + 3] ?? 255
      const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255
      const darkness = alpha < 10 ? 0 : Math.max(0, 1 - luminance)
      const binaryDarkness = darkness >= threshold ? 1 : 0

      rows[y] += binaryDarkness
      cols[x] += binaryDarkness
      pixels[y * normalized.width + x] = binaryDarkness
      darknessMap[y * normalized.width + x] = binaryDarkness
      density += binaryDarkness
    }
  }

  const rowMax = Math.max(...rows, 1)
  const colMax = Math.max(...cols, 1)
  const totalPixels = normalized.width * normalized.height
  const cellWidth = normalized.width / GRID_COLS
  const cellHeight = normalized.height / GRID_ROWS
  const grid = Array.from({ length: GRID_COLS * GRID_ROWS }, () => 0)
  const edgeHist = Array.from({ length: EDGE_BINS }, () => 0)

  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      const xStart = Math.floor(col * cellWidth)
      const xEnd = Math.floor((col + 1) * cellWidth)
      const yStart = Math.floor(row * cellHeight)
      const yEnd = Math.floor((row + 1) * cellHeight)

      let sum = 0
      let count = 0

      for (let y = yStart; y < yEnd; y += 1) {
        for (let x = xStart; x < xEnd; x += 1) {
          const darkness = darknessMap[y * normalized.width + x] ?? 0
          sum += darkness
          count += 1
        }
      }

      grid[row * GRID_COLS + col] = count > 0 ? sum / count : 0
    }
  }

  for (let y = 1; y < normalized.height - 1; y += 1) {
    for (let x = 1; x < normalized.width - 1; x += 1) {
      const left = darknessMap[y * normalized.width + (x - 1)] ?? 0
      const right = darknessMap[y * normalized.width + (x + 1)] ?? 0
      const up = darknessMap[(y - 1) * normalized.width + x] ?? 0
      const down = darknessMap[(y + 1) * normalized.width + x] ?? 0

      const gx = right - left
      const gy = down - up
      const magnitude = Math.sqrt(gx * gx + gy * gy)

      if (magnitude < 0.1) {
        continue
      }

      const angle = Math.atan2(gy, gx)
      const normalizedAngle = (angle + Math.PI) / (2 * Math.PI)
      const bin = Math.min(EDGE_BINS - 1, Math.floor(normalizedAngle * EDGE_BINS))
      edgeHist[bin] += magnitude
    }
  }

  const edgeTotal = edgeHist.reduce((sum, value) => sum + value, 0)

  return {
    rows: rows.map((value) => value / rowMax),
    cols: cols.map((value) => value / colMax),
    density: density / totalPixels,
    grid,
    pixels,
    edgeHist: edgeTotal > 0 ? edgeHist.map((value) => value / edgeTotal) : edgeHist,
  }
}

const meanSquaredError = (left: number[], right: number[]): number => {
  let total = 0
  const length = Math.min(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    const difference = left[index] - right[index]
    total += difference * difference
  }
  return total / length
}

const compareSignatures = (actual: Signature, synthetic: Signature): number => {
  const rowError = meanSquaredError(actual.rows, synthetic.rows)
  const colError = meanSquaredError(actual.cols, synthetic.cols)
  const gridError = meanSquaredError(actual.grid, synthetic.grid)
  const pixelError = meanSquaredError(actual.pixels, synthetic.pixels)
  const edgeError = meanSquaredError(actual.edgeHist, synthetic.edgeHist)
  const densityError = Math.abs(actual.density - synthetic.density)
  return (
    rowError * 0.08 +
    colError * 0.08 +
    gridError * 0.26 +
    pixelError * 0.32 +
    edgeError * 0.22 +
    densityError * 0.04
  )
}

const confidenceFromDistance = (distance: number): number => {
  return Math.max(1, Math.min(99.6, 100 - distance * 210))
}

const cleanWord = (value: string): string => {
  return value
    .replace(/[^A-Za-z0-9.,!?;:'"\-() ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const alphaNumCount = (value: string): number => {
  const match = value.match(/[A-Za-z0-9]/g)
  return match?.length ?? 0
}

const topWordsFromOcr = (words: OcrWord[]): OcrWord[] => {
  const cleaned = words
    .map((word) => {
      return {
        ...word,
        text: cleanWord(word.text),
      }
    })
    .filter((word) => alphaNumCount(word.text) >= 2)

  const withConfidence = cleaned.filter((word) => word.confidence >= 35)
  const pool = withConfidence.length > 0 ? withConfidence : cleaned

  return pool
    .sort((left, right) => {
      const leftScore = left.confidence * left.text.length
      const rightScore = right.confidence * right.text.length
      return rightScore - leftScore
    })
    .slice(0, 12)
}

type OcrSample = {
  text: string
  confidence: number
  bbox: OcrWord['bbox']
  fontName?: string
  source: 'line' | 'word' | 'symbol'
}

type OcrLineSample = {
  text: string
  confidence: number
  bbox: OcrWord['bbox']
}

const topSamplesFromOcr = (words: OcrWord[]): OcrSample[] => {
  const topWords = topWordsFromOcr(words)

  const wordSamples: OcrSample[] = topWords.map((word) => {
    return {
      text: word.text,
      confidence: word.confidence,
      bbox: word.bbox,
      fontName: word.font_name,
      source: 'word',
    }
  })

  const discriminativeChars = new Set(['a', 'c', 'e', 'g', 'n', 'o', 'r', 's', 't', 'u', 'y'])
  const symbolSamples = topWords.flatMap((word) => {
    const symbols = word.symbols ?? []
    return symbols
      .filter((symbol) => {
        const cleaned = cleanWord(symbol.text)
        const lower = cleaned.toLowerCase()
        const width = symbol.bbox.x1 - symbol.bbox.x0
        const height = symbol.bbox.y1 - symbol.bbox.y0
        return (
          cleaned.length === 1 &&
          /[A-Za-z0-9]/.test(cleaned) &&
          discriminativeChars.has(lower) &&
          symbol.confidence >= 30 &&
          width >= 4 &&
          height >= 6
        )
      })
      .slice(0, 2)
      .map((symbol) => {
        return {
          text: cleanWord(symbol.text),
          confidence: symbol.confidence,
          bbox: symbol.bbox,
          fontName: word.font_name,
          source: 'symbol' as const,
        }
      })
  })

  return [...wordSamples, ...symbolSamples.slice(0, 4)].slice(0, 24)
}

const topLinesFromPage = (page: OcrPage): OcrLineSample[] => {
  const collected: OcrLineSample[] = []
  const blocks = page.blocks ?? []

  blocks.forEach((block) => {
    const paragraphs = block.paragraphs ?? []
    paragraphs.forEach((paragraph) => {
      const lines = paragraph.lines ?? []
      lines.forEach((line) => {
        const text = cleanWord(line.text ?? '')
        if (!line.bbox || alphaNumCount(text) < 5 || (line.confidence ?? 0) < 30) {
          return
        }

        collected.push({
          text,
          confidence: line.confidence ?? 0,
          bbox: line.bbox,
        })
      })
    })
  })

  return collected
    .sort((left, right) => {
      const leftScore = left.confidence * Math.max(1, left.text.length / 4)
      const rightScore = right.confidence * Math.max(1, right.text.length / 4)
      return rightScore - leftScore
    })
    .slice(0, 4)
}

const wordsFromPage = (page: OcrPage): OcrWord[] => {
  const collected: OcrWord[] = []

  const blocks = page.blocks ?? []
  blocks.forEach((block) => {
    const paragraphs = block.paragraphs ?? []
    paragraphs.forEach((paragraph) => {
      const lines = paragraph.lines ?? []
      lines.forEach((line) => {
        const words = line.words ?? []
        words.forEach((word) => {
          if (word?.text && word?.bbox) {
            collected.push(word)
          }
        })
      })
    })
  })

  return collected
}

type ExtractedOcr = {
  words: OcrWord[]
  lines: OcrLineSample[]
}

const collectWordsFromRecognizeResult = (result: unknown): ExtractedOcr => {
  const data = (result as { data?: OcrPage }).data
  if (!data) {
    return {
      words: [],
      lines: [],
    }
  }
  return {
    words: wordsFromPage(data),
    lines: topLinesFromPage(data),
  }
}

const dedupeWords = (words: OcrWord[]): OcrWord[] => {
  const seen = new Set<string>()
  const output: OcrWord[] = []

  words.forEach((word) => {
    const key = `${cleanWord(word.text)}:${Math.round(word.bbox.x0)}:${Math.round(word.bbox.y0)}`
    if (!seen.has(key)) {
      seen.add(key)
      output.push(word)
    }
  })

  return output
}

const dedupeLines = (lines: OcrLineSample[]): OcrLineSample[] => {
  const seen = new Set<string>()
  const output: OcrLineSample[] = []

  lines.forEach((line) => {
    const key = `${cleanWord(line.text)}:${Math.round(line.bbox.x0)}:${Math.round(line.bbox.y0)}`
    if (!seen.has(key)) {
      seen.add(key)
      output.push(line)
    }
  })

  return output
}

const mergeLineAndWordSamples = (lines: OcrLineSample[], words: OcrWord[]): OcrSample[] => {
  const lineSamples: OcrSample[] = lines.map((line) => {
    return {
      text: line.text,
      confidence: line.confidence,
      bbox: line.bbox,
      source: 'line',
    }
  })

  return [...lineSamples, ...topSamplesFromOcr(words)].slice(0, 36)
}

const normalizedName = (name: string): string => {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

const fontNameBoost = (ocrFontName: string | undefined, candidateFamily: string): number => {
  if (!ocrFontName) {
    return 0
  }

  const ocr = normalizedName(ocrFontName)
  const candidate = normalizedName(candidateFamily)

  if (!ocr || ocr === 'unknown') {
    return 0
  }
  if (ocr.includes(candidate) || candidate.includes(ocr)) {
    return 14
  }
  if (ocr.startsWith(candidate.slice(0, 4)) || candidate.startsWith(ocr.slice(0, 4))) {
    return 3
  }
  return 0
}

const sampleWeight = (sample: OcrSample): number => {
  const lengthFactor =
    sample.source === 'line'
      ? Math.max(1.35, sample.text.length / 6)
      : sample.source === 'word'
        ? Math.max(1, sample.text.length / 3)
        : 0.35
  const confidenceFactor = Math.max(0.35, Math.min(1.4, sample.confidence / 100))
  return Math.max(0.35, Math.min(2.3, lengthFactor * confidenceFactor))
}

const estimateMonospaceLikelihood = (words: OcrWord[]): number => {
  const widths: number[] = []

  words.slice(0, 12).forEach((word) => {
    ;(word.symbols ?? []).forEach((symbol) => {
      const token = cleanWord(symbol.text)
      const width = symbol.bbox.x1 - symbol.bbox.x0
      const height = symbol.bbox.y1 - symbol.bbox.y0
      if (!/[A-Za-z0-9]/.test(token) || width < 3 || height < 5) {
        return
      }

      widths.push(width / height)
    })
  })

  if (widths.length < 8) {
    return 0
  }

  const mean = widths.reduce((sum, value) => sum + value, 0) / widths.length
  if (mean <= 0) {
    return 0
  }

  const variance = widths.reduce((sum, value) => {
    const diff = value - mean
    return sum + diff * diff
  }, 0) / widths.length

  const stdDev = Math.sqrt(variance)
  const cv = stdDev / mean

  // Lower variation in character width indicates monospaced text.
  const likelihood = (0.24 - cv) / 0.18
  return Math.max(0, Math.min(1, likelihood))
}

const measureWidth = (font: string, text: string): number => {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) {
    return 0
  }

  context.font = font
  return context.measureText(text).width
}

const isFontActuallyAvailable = (family: string): boolean => {
  const probe = 'The quick brown fox jumps over 0123456789 !?@#& MwWmIl1'
  const size = 48

  const monospaceBase = measureWidth(`${size}px monospace`, probe)
  const serifBase = measureWidth(`${size}px serif`, probe)
  const sansBase = measureWidth(`${size}px sans-serif`, probe)

  const monoWithFamily = measureWidth(`${size}px "${family}", monospace`, probe)
  const serifWithFamily = measureWidth(`${size}px "${family}", serif`, probe)
  const sansWithFamily = measureWidth(`${size}px "${family}", sans-serif`, probe)

  const differsFromMono = Math.abs(monoWithFamily - monospaceBase) > 0.01
  const differsFromSerif = Math.abs(serifWithFamily - serifBase) > 0.01
  const differsFromSans = Math.abs(sansWithFamily - sansBase) > 0.01

  return differsFromMono || differsFromSerif || differsFromSans
}

const ensureFontsLoaded = async (): Promise<ActiveFontCandidate[]> => {
  await Promise.all(
    FONT_CANDIDATES.map((candidate) => {
      return Promise.all(
        candidate.faces.map((face) => {
          return Promise.all([
            document.fonts.load(`400 36px "${face}"`),
            document.fonts.load(`700 36px "${face}"`),
          ])
        }),
      )
    }),
  )

  return FONT_CANDIDATES.flatMap((candidate) => {
    const activeFace = candidate.faces.find((face) => {
      // document.fonts.check can report true for fallback fonts; combine with width fingerprinting.
      const regular = document.fonts.check(`400 24px "${face}"`, 'Hamburgefonstiv')
      const bold = document.fonts.check(`700 24px "${face}"`, 'Hamburgefonstiv')
      const fingerprinted = isFontActuallyAvailable(face)
      return (regular || bold) && fingerprinted
    })

    if (!activeFace) {
      return []
    }

    return [
      {
        ...candidate,
        activeFace,
      },
    ]
  })
}

export const detectFontsFromImage = async (
  file: File,
  onProgress?: ProgressCallback,
): Promise<FontDetectionResult> => {
  onProgress?.(0.02, 'Loading image')
  const image = await loadImage(file)
  const baseCanvas = buildCanvasFromImage(image)
  const preprocessedCanvas = preprocessCanvas(baseCanvas)

  onProgress?.(0.08, 'Scanning text with OCR')
  const worker = await Tesseract.createWorker('eng', 1, {
    logger: (event) => {
      const status = typeof event.status === 'string' ? event.status : 'OCR in progress'
      const rawProgress = typeof event.progress === 'number' ? event.progress : 0
      const mappedProgress = 0.08 + Math.min(0.72, rawProgress * 0.72)
      onProgress?.(mappedProgress, status)
    },
  })

  let rawWords: OcrWord[] = []
  let rawLines: OcrLineSample[] = []
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
    })
    const primary = await worker.recognize(
      preprocessedCanvas,
      {},
      { text: true, blocks: true },
    )

    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
    })
    const sparse = await worker.recognize(
      preprocessedCanvas,
      {},
      { text: true, blocks: true },
    )

    const primaryExtract = collectWordsFromRecognizeResult(primary)
    const sparseExtract = collectWordsFromRecognizeResult(sparse)

    rawWords = dedupeWords([...primaryExtract.words, ...sparseExtract.words])
    rawLines = dedupeLines([...primaryExtract.lines, ...sparseExtract.lines])
  } finally {
    await worker.terminate()
  }

  const samples = mergeLineAndWordSamples(rawLines, rawWords)
  if (samples.length === 0) {
    throw new Error('No readable text found. Try higher contrast text or a slightly tighter crop.')
  }
  const monoLikelihood = estimateMonospaceLikelihood(rawWords)

  onProgress?.(0.82, 'Loading candidate fonts')
  const availableCandidates = await ensureFontsLoaded()
  if (availableCandidates.length === 0) {
    throw new Error('No candidate fonts are available in this browser session.')
  }

  const aggregate = new Map<
    string,
    {
      category: FontCandidate['category']
      activeFace: string
      weightedScore: number
      weightedTotal: number
      weightedDistance: number
      sampleCount: number
    }
  >()

  samples.forEach((sample, index) => {
    const actualCanvas = cropWord(preprocessedCanvas, sample.bbox)
    const actualTrimmed = trimCanvasToInk(actualCanvas)
    const actualSignature = signatureFromCanvas(actualTrimmed)
    const weight = sampleWeight(sample)

    availableCandidates.forEach((candidate) => {
      const syntheticRegular = renderSyntheticText(
        sample.text,
        candidate.activeFace,
        actualCanvas.width,
        actualCanvas.height,
        400,
      )
      const syntheticBold = renderSyntheticText(
        sample.text,
        candidate.activeFace,
        actualCanvas.width,
        actualCanvas.height,
        700,
      )

      const regularDistance = compareSignatures(
        actualSignature,
        signatureFromCanvas(trimCanvasToInk(syntheticRegular)),
      )
      const boldDistance = compareSignatures(
        actualSignature,
        signatureFromCanvas(trimCanvasToInk(syntheticBold)),
      )
      const bestDistance = Math.min(regularDistance, boldDistance)
      const monoBoost =
        candidate.category === 'Monospace'
          ? monoLikelihood * 10
          : monoLikelihood > 0.6
            ? -3
            : 0
      const confidence =
        confidenceFromDistance(bestDistance) +
        fontNameBoost(sample.fontName, candidate.family) +
        monoBoost

      const current =
        aggregate.get(candidate.family) ?? {
          category: candidate.category,
          activeFace: candidate.activeFace,
          weightedScore: 0,
          weightedTotal: 0,
          weightedDistance: 0,
          sampleCount: 0,
        }

      current.weightedScore += Math.min(100, confidence) * weight
      current.weightedTotal += weight
      current.weightedDistance += bestDistance * weight
      current.sampleCount += 1
      aggregate.set(candidate.family, current)
    })

    const progressInMatching = (index + 1) / samples.length
    onProgress?.(0.84 + progressInMatching * 0.14, 'Comparing glyph shapes')
  })

  const ranked = Array.from(aggregate.entries())
    .map(([family, values]) => {
      const confidence = values.weightedScore / Math.max(values.weightedTotal, 1)
      const avgDistance = values.weightedDistance / Math.max(values.weightedTotal, 1)
      return {
        family,
        category: values.category,
        activeFace: values.activeFace,
        confidence,
        avgDistance,
        sampleCount: values.sampleCount,
      }
    })
    .sort((left, right) => right.confidence - left.confidence)

  if (ranked.length === 0) {
    throw new Error('Font matching failed for this image.')
  }

  const topMatch = ranked[0]
  const alternatives = ranked.slice(1, 6)
  const confidenceGap = topMatch.confidence - (ranked[1]?.confidence ?? topMatch.confidence)

  onProgress?.(1, 'Done')

  return {
    topMatch,
    alternatives,
    sampleWords: samples
      .filter((sample) => sample.source === 'word')
      .slice(0, 8)
      .map((sample) => sample.text),
    debug: {
      sampleCount: samples.length,
      availableCandidateCount: availableCandidates.length,
      confidenceGap,
      samples: samples.slice(0, 32).map((sample) => {
        return {
          text: sample.text,
          source: sample.source,
          confidence: sample.confidence,
          bbox: sample.bbox,
        }
      }),
      candidates: ranked.slice(0, 20).map((candidate) => {
        return {
          family: candidate.family,
          activeFace: candidate.activeFace,
          category: candidate.category,
          confidence: candidate.confidence,
          avgDistance: candidate.avgDistance,
          sampleCount: candidate.sampleCount,
        }
      }),
    },
  }
}
