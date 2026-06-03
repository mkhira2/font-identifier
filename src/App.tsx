import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import {
  type FontDetectionResult,
  detectFontsFromImage,
} from "./fontDetection";

function App() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Ready to inspect an image");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FontDetectionResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onSelectFile = useCallback(async (file: File) => {
    setError(null);
    setIsAnalyzing(true);
    setResult(null);
    setProgress(0);
    setStatusText("Preparing image");

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return objectUrl;
    });

    try {
      const nextResult = await detectFontsFromImage(file, (pct, status) => {
        setProgress(pct);
        setStatusText(status);
      });
      setResult(nextResult);
      setStatusText("Analysis complete");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to analyze this image.",
      );
      setStatusText("Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const onInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      await onSelectFile(file);
    },
    [onSelectFile],
  );

  useEffect(() => {
    return () => {
      setPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
    };
  }, []);

  const dropzoneClassName = useMemo(
    () => `dropzone ${isAnalyzing ? "busy" : ""} ${isDragActive ? "active" : ""}`,
    [isAnalyzing, isDragActive],
  );

  const previewSampleText = useMemo(() => {
    if (!result || result.sampleWords.length === 0) {
      return "The quick brown fox jumps over the lazy dog";
    }

    const joined = result.sampleWords.join(" ").trim();
    return joined.length > 0
      ? joined
      : "The quick brown fox jumps over the lazy dog";
  }, [result]);

  return (
    <div className="app-shell">
      <header className="hero-panel">
        <p className="eyebrow">Font Identifier</p>
        <h1>Find the font from any screenshot or photo.</h1>
        <p className="hero-subtitle">
          Upload design mockups, menu photos, storefront signs, or random
          screenshots. The app runs OCR first, then compares letter shapes
          against a curated font library.
        </p>
      </header>

      <section className="workbench">
        <label
          className={dropzoneClassName}
          onDragEnter={(event) => {
            event.preventDefault();
            if (!isAnalyzing) {
              setIsDragActive(true);
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!isAnalyzing) {
              setIsDragActive(true);
            }
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
              return;
            }
            setIsDragActive(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragActive(false);
            if (isAnalyzing) {
              return;
            }
            const droppedFile = event.dataTransfer.files?.[0];
            if (droppedFile) {
              void onSelectFile(droppedFile);
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(event) => {
              void onInputChange(event);
            }}
            disabled={isAnalyzing}
          />
          <strong>Drop an image here</strong>
          <span>or click to browse</span>
          <small>JPEG, PNG, HEIC screenshots and phone photos work best.</small>
        </label>

        <div className="analysis-panel">
          <div className="status-row">
            <h2>Analysis</h2>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <p className="status-line">{statusText}</p>
          <div className="progress-track" aria-hidden="true">
            <div
              className="progress-fill"
              style={{ width: `${Math.round(progress * 100)}%` }}
            ></div>
          </div>

          {error && <p className="error">{error}</p>}

          {result && (
            <>
              <article className="winner-card">
                <p>Best Match</p>
                <h3
                  style={{
                    fontFamily: `"${result.topMatch.family}", sans-serif`,
                  }}
                >
                  {result.topMatch.family}
                </h3>
                <p>
                  Confidence {Math.round(result.topMatch.confidence)}% •{" "}
                  {result.topMatch.category}
                </p>
                <p
                  className="font-preview"
                  style={{
                    fontFamily: `"${result.topMatch.family}", sans-serif`,
                  }}
                >
                  {previewSampleText}
                </p>
              </article>

              <div className="result-grid">
                {result.alternatives.map((candidate) => (
                  <div className="alt-card" key={candidate.family}>
                    <div>
                      <p
                        className="font-name"
                        style={{
                          fontFamily: `"${candidate.family}", sans-serif`,
                        }}
                      >
                        {candidate.family}
                      </p>
                      <p
                        className="font-preview"
                        style={{
                          fontFamily: `"${candidate.family}", sans-serif`,
                        }}
                      >
                        {previewSampleText}
                      </p>
                    </div>
                    <p>{Math.round(candidate.confidence)}% match</p>
                  </div>
                ))}
              </div>

              <div className="token-list">
                {result.sampleWords.map((word) => (
                  <span key={word}>{word}</span>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {previewUrl && (
        <section className="preview-panel">
          <h2>Uploaded Image</h2>
          <img src={previewUrl} alt="Uploaded example" />
        </section>
      )}

      <footer className="footnote">
        <p>
          Results are an informed best guess from OCR + glyph shape comparison.
          Higher-resolution images with straight-on text produce better matches.
        </p>
      </footer>
    </div>
  );
}

export default App;
