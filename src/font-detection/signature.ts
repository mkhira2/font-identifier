import { SAMPLE_CANVAS_HEIGHT, SAMPLE_CANVAS_WIDTH } from './image'

export type Signature = {
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

export const signatureFromCanvas = (source: HTMLCanvasElement): Signature => {
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

export const compareSignatures = (actual: Signature, synthetic: Signature): number => {
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

export const confidenceFromDistance = (distance: number): number => {
  return Math.max(1, Math.min(99.6, 100 - distance * 210))
}
