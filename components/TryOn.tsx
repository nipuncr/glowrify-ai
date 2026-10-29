"use client";
import { useEffect, useRef, useState } from "react";
import { Download, RotateCcw, Move, Shirt } from "lucide-react";
import { Analysis, Garment } from "@/lib/types";
export default function TryOn({
  analysis,
  garment,
}: {
  analysis: Analysis | null;
  garment: Garment | null;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState(0);
  const [opacity, setOpacity] = useState(0.95);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setScale(1);
    setOffset(0);
  }, [garment?.id, analysis?.id]);
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError("");
    if (!analysis || !garment) return;
    const load = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload = () => resolve(i);
        i.onerror = () =>
          reject(
            new Error(
              "Unable to load the preview image. Reopen this session from your archive to refresh the photo link.",
            ),
          );
        i.src = src;
      });
    Promise.all([load(analysis.image_url), load(garment.overlay_url)])
      .then(([photo, cloth]) => {
        if (cancelled || !canvas.current) return;
        const c = canvas.current;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        c.width = photo.naturalWidth;
        c.height = photo.naturalHeight;
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.drawImage(photo, 0, 0);
        const l = analysis.landmarks[11],
          r = analysis.landmarks[12],
          h1 = analysis.landmarks[23],
          h2 = analysis.landmarks[24];
        // Normalize image-side ordering; MediaPipe left/right are anatomical labels.
        const [left, right] = l.x < r.x ? [l, r] : [r, l];
        const target = [
          [left.x * c.width, left.y * c.height],
          [right.x * c.width, right.y * c.height],
          [((h1.x + h2.x) / 2) * c.width, ((h1.y + h2.y) / 2) * c.height],
        ];
        const center = [
          (target[0][0] + target[1][0]) / 2,
          (target[0][1] + target[1][1]) / 2,
        ];
        target.forEach((p) => {
          p[0] = center[0] + (p[0] - center[0]) * scale;
          p[1] = center[1] + (p[1] - center[1]) * scale + offset * c.height;
        });
        const a = garment.anchors;
        const source = [a.left_shoulder, a.right_shoulder, a.hip].map((p) => [
          p[0] * cloth.naturalWidth,
          p[1] * cloth.naturalHeight,
        ]);
        const [s0, s1, s2] = source,
          [t0, t1, t2] = target;
        const u = s1[0] - s0[0],
          v = s1[1] - s0[1],
          w = s2[0] - s0[0],
          z = s2[1] - s0[1],
          det = u * z - v * w;
        if (Math.abs(det) < 1) throw new Error("Invalid garment anchors.");
        const ax = ((t1[0] - t0[0]) * z - (t2[0] - t0[0]) * v) / det,
          bx = (-(t1[0] - t0[0]) * w + (t2[0] - t0[0]) * u) / det;
        const ay = ((t1[1] - t0[1]) * z - (t2[1] - t0[1]) * v) / det,
          by = (-(t1[1] - t0[1]) * w + (t2[1] - t0[1]) * u) / det;
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.setTransform(
          ax,
          ay,
          bx,
          by,
          t0[0] - ax * s0[0] - bx * s0[1],
          t0[1] - ay * s0[0] - by * s0[1],
        );
        ctx.drawImage(cloth, 0, 0);
        ctx.restore();
        setReady(true);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [analysis, garment, scale, offset, opacity]);
  function download() {
    if (!canvas.current || !ready) return;
    try {
      const a = document.createElement("a");
      a.download = "glowrify-try-on.png";
      a.href = canvas.current.toDataURL("image/png");
      a.click();
    } catch {
      setError(
        "Export blocked by the garment image host. Configure image CORS to allow this app.",
      );
    }
  }
  return (
    <section id="try-on" className="tryon section-wrap">
      <div className="section-title">
        <div>
          <span className="eyebrow">02 / THE FITTING ROOM</span>
          <h2>
            A little less guessing.
            <br />
            <em>A lot more you.</em>
          </h2>
        </div>
        <p>
          See your chosen piece in context.
          <br />
          Your own fitting room, wherever you are.
        </p>
      </div>
      <div className="fitting-grid">
        <div className="preview-stage">
          {analysis && garment ? (
            <canvas
              ref={canvas}
              aria-label={`Virtual overlay of ${garment.name}`}
            />
          ) : (
            <div className="empty-preview">
              <Shirt size={46} strokeWidth={1} />
              <h3>Your next look starts here</h3>
              <p>Choose a piece from your edit to try it on.</p>
            </div>
          )}
          <span className="stage-label">{"VIRTUAL PREVIEW"}</span>
        </div>
        <div className="fitting-controls">
          <span className="eyebrow">MAKE IT YOURS</span>
          <h3>{garment?.name || "Find your first favorite"}</h3>
          <p>
            {garment
              ? `${garment.color} / ${garment.category.toLowerCase()}`
              : "Your selected piece will appear here."}
          </p>
          <div className="control-heading">
            <Move size={17} /> Adjust your preview
          </div>
          <label>
            Garment scale <span>{Math.round(scale * 100)}%</span>
            <input
              type="range"
              min="0.7"
              max="1.4"
              step="0.01"
              value={scale}
              onChange={(e) => setScale(+e.target.value)}
              disabled={!garment}
            />
          </label>
          <label>
            Vertical position <span>{Math.round(offset * 100)}</span>
            <input
              type="range"
              min="-0.15"
              max="0.15"
              step="0.005"
              value={offset}
              onChange={(e) => setOffset(+e.target.value)}
              disabled={!garment}
            />
          </label>
          <label>
            Opacity <span>{Math.round(opacity * 100)}%</span>
            <input
              type="range"
              min="0.3"
              max="1"
              step="0.01"
              value={opacity}
              onChange={(e) => setOpacity(+e.target.value)}
              disabled={!garment}
            />
          </label>
          <div className="button-row">
            <button
              className="button dark"
              onClick={download}
              disabled={!ready}
            >
              <Download size={16} /> Save preview
            </button>
            <button
              className="icon-button"
              aria-label="Reset preview"
              onClick={() => {
                setScale(1);
                setOffset(0);
                setOpacity(0.95);
              }}
            >
              <RotateCcw size={18} />
            </button>
          </div>
          <p className="fineprint">
            A 2D styling visualization, not a sizing or fit guarantee. Compare
            the garment size chart before choosing a size.
          </p>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
