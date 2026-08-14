import { useState, type CSSProperties } from "react";
import { AppError, toAppError } from "../../core/errors";
import { youtubeMusicSearchUrl } from "../../core/medicine";
import type { CompositeAnalysis } from "../../lib/imageAnalysis";
import { openYoutubeMusicUrl } from "../../lib/externalLinks";
import { moodLabel } from "../../ui/moodLabels";

type PrescriptionProps = {
  analysis: CompositeAnalysis;
  onError(error: AppError | null): void;
  onStartOver(): void;
};

const ordinal = (value: number) => String(value).padStart(2, "0");

export function Prescription({ analysis, onError, onStartOver }: PrescriptionProps) {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const primaryQuery = analysis.mood.searchQueries[0];

  const copyColor = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      window.setTimeout(() => setCopiedHex((current) => (current === hex ? null : current)), 1_400);
    } catch {
      onError(new AppError("CLIPBOARD_COPY_FAILED", { hex }));
    }
  };

  const openMusic = (url: string) => {
    onError(null);
    void openYoutubeMusicUrl(url).catch((caught) => {
      onError(toAppError(caught, "MUSIC_OPEN_FAILED"));
    });
  };

  /** Keeps the anchor a real link while routing the click through the platform. */
  const musicLinkProps = (query: string) => ({
    href: youtubeMusicSearchUrl(query),
    onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      openMusic(event.currentTarget.href);
    },
  });

  return (
    <div className="medicine-result">
      <div className="palette" aria-label="Extracted color palette">
        {analysis.palette.map((color) => (
          <button
            key={color.hex}
            type="button"
            className="palette-color"
            style={{ "--palette-color": color.hex } as CSSProperties}
            title={`Copy ${color.hex}`}
            onClick={() => void copyColor(color.hex)}
          >
            <span aria-hidden="true" />
            <strong>{copiedHex === color.hex ? "COPIED" : color.hex}</strong>
          </button>
        ))}
      </div>

      <div className="mood-prescription">
        <div>
          <span className="prescription-label">COLOR PRESCRIPTION</span>
          <h2>{moodLabel(analysis.mood.id)}</h2>
          <p>{analysis.mood.tags.join(" · ")}</p>
        </div>
        <a className="music-primary" {...musicLinkProps(primaryQuery)}>
          PLAY ON YOUTUBE MUSIC <span aria-hidden="true">↗</span>
        </a>
      </div>

      <div className="music-alternatives" aria-label="Alternative music prescriptions">
        <a {...musicLinkProps(primaryQuery)}>
          <span>{ordinal(0)}</span>
          <span className="music-result-name">{primaryQuery.toUpperCase()}</span>
          <b aria-hidden="true">↗</b>
        </a>
        {analysis.recommendedTracks.map((track, index) => (
          <a key={track.id} {...musicLinkProps(`${track.artist} ${track.title}`)}>
            <span>{ordinal(index + 1)}</span>
            <span className="music-result-name">
              <strong>{track.title}</strong> — {track.artist}
            </span>
            <b aria-hidden="true">↗</b>
          </a>
        ))}
      </div>

      <button type="button" className="analyze-again" onClick={onStartOver}>ANALYZE AGAIN</button>
    </div>
  );
}
