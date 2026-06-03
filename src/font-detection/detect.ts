import Tesseract from 'tesseract.js'
import { confidenceFromDistance, compareSignatures, signatureFromCanvas } from './signature'
import { cropWord, loadImage, preprocessCanvas, renderSyntheticText, trimCanvasToInk, buildCanvasFromImage } from './image'
import { collectWordsFromRecognizeResult, dedupeLines, dedupeWords, mergeLineAndWordSamples } from './ocr'
import { ensureFontsLoaded, estimateMonospaceLikelihood, fontNameBoost, sampleWeight } from './fontAvailability'
import type { FontCandidate, FontDetectionResult, OcrLineSample, OcrWord, ProgressCallback } from './types'

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
