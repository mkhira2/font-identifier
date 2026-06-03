import { FONT_CANDIDATES } from './candidates'
import { cleanWord } from './ocr'
import type { ActiveFontCandidate, OcrSample, OcrWord } from './types'

const normalizedName = (name: string): string => {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export const fontNameBoost = (ocrFontName: string | undefined, candidateFamily: string): number => {
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

export const sampleWeight = (sample: OcrSample): number => {
  const lengthFactor =
    sample.source === 'line'
      ? Math.max(1.35, sample.text.length / 6)
      : sample.source === 'word'
        ? Math.max(1, sample.text.length / 3)
        : 0.35
  const confidenceFactor = Math.max(0.35, Math.min(1.4, sample.confidence / 100))
  return Math.max(0.35, Math.min(2.3, lengthFactor * confidenceFactor))
}

export const estimateMonospaceLikelihood = (words: OcrWord[]): number => {
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

export const ensureFontsLoaded = async (): Promise<ActiveFontCandidate[]> => {
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
