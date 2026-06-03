export type ProgressCallback = (progress: number, status: string) => void

export type FontCandidate = {
  family: string
  category: 'Sans-serif' | 'Serif' | 'Display' | 'Monospace'
  faces: string[]
}

export type ActiveFontCandidate = FontCandidate & {
  activeFace: string
}

export type OcrWord = {
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

export type OcrSymbol = {
  text: string
  confidence: number
  bbox: {
    x0: number
    y0: number
    x1: number
    y1: number
  }
}

export type OcrPage = {
  blocks?: OcrBlock[] | null
}

export type OcrBlock = {
  paragraphs?: OcrParagraph[]
}

export type OcrParagraph = {
  lines?: OcrLine[]
}

export type OcrLine = {
  text?: string
  confidence?: number
  bbox?: OcrWord['bbox']
  words?: OcrWord[]
}

export type RankedFont = {
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

export type OcrSample = {
  text: string
  confidence: number
  bbox: OcrWord['bbox']
  fontName?: string
  source: 'line' | 'word' | 'symbol'
}

export type OcrLineSample = {
  text: string
  confidence: number
  bbox: OcrWord['bbox']
}

export type ExtractedOcr = {
  words: OcrWord[]
  lines: OcrLineSample[]
}
