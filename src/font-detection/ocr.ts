import type { ExtractedOcr, OcrLineSample, OcrPage, OcrSample, OcrWord } from './types'

export const cleanWord = (value: string): string => {
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

export const collectWordsFromRecognizeResult = (result: unknown): ExtractedOcr => {
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

export const dedupeWords = (words: OcrWord[]): OcrWord[] => {
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

export const dedupeLines = (lines: OcrLineSample[]): OcrLineSample[] => {
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

export const mergeLineAndWordSamples = (lines: OcrLineSample[], words: OcrWord[]): OcrSample[] => {
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
