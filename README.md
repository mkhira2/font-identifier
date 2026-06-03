# Font Identifier

Font Identifier is a browser app that estimates the font used in an image.
You can upload screenshots or photos with text, and the app will:

1. Run OCR to detect lines, words, and high-signal glyphs.
2. Preprocess and normalize text regions on canvas.
3. Compare extracted glyph shapes against a curated font candidate library.
4. Return the best match and several alternatives with confidence scores.

## Live App

https://font-identifier-plum.vercel.app/

## Screenshot

![Font Identifier app screenshot](./public/app-screenshot.png)

## What The App Returns

- Top font match with category and confidence
- Alternative matches for quick comparison
- OCR sample words used during detection
- Debug context for sample count, confidence gap, and ranked candidates

## How Detection Works

- OCR pass with two page segmentation modes for broader text coverage
- Candidate font loading and availability checks in the browser
- Synthetic text rendering in each candidate font at regular and bold weights
- Signature extraction using pixel density, row and column profiles, spatial grids, and edge histograms
- Weighted scoring across line, word, and symbol samples

## Local Development

### Prerequisites

- Node.js 20+
- npm 10+

### Install

```bash
npm install
```

### Run Dev Server

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Notes On Accuracy

- Results are best-effort estimates, not guaranteed exact matches.
- Clear, high-contrast, straight-on text improves detection quality.
- Small, blurry, curved, or heavily stylized text reduces confidence.
