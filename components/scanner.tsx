"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CameraOff, ImageUp, Keyboard, X } from "lucide-react";
import { ScanResult } from "@/components/scan-result";
import { createEngine, type Decoded } from "@/lib/scan-engine";
import { classifyManual, makeScan, type Scan } from "@/lib/scan";

// Lado maior do quadro analisado: menos pixels = mais quadros por segundo.
const FRAME_MAX = 1280;

function describeCameraError(error: unknown) {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "A câmera só funciona em HTTPS (ou em localhost). Abra o app por um endereço seguro.";
  }
  switch ((error as DOMException | undefined)?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Permissão da câmera negada. Libere o acesso nas configurações do navegador e tente de novo.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "Nenhuma câmera foi encontrada neste dispositivo.";
    case "NotReadableError":
      return "A câmera está sendo usada por outro aplicativo.";
    default:
      return "Não foi possível abrir a câmera.";
  }
}

/** Pede foco contínuo, quando a câmera oferece (ajuda muito com código de barras de perto). */
function requestContinuousFocus(stream: MediaStream) {
  const track = stream.getVideoTracks()[0];
  const caps = track?.getCapabilities?.() as { focusMode?: string[] } | undefined;
  if (caps?.focusMode?.includes("continuous")) {
    track.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] }).catch(() => {});
  }
}

const corner = "absolute size-9 border-lime";

export function Scanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scan, setScan] = useState<Scan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState("");

  const found = (d: Decoded) => {
    navigator.vibrate?.(60);
    setScan(makeScan(d.text, d.format));
  };

  // Abre a câmera e analisa quadro a quadro até reconhecer algo; então para sozinho e mostra o dado.
  useEffect(() => {
    if (scan) return;
    let cancelled = false;
    let stream: MediaStream | undefined;
    let frame = 0;
    const video = videoRef.current;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(describeCameraError(undefined));
        return;
      }
      try {
        // Carrega o motor enquanto a câmera pede permissão/abre.
        const [engine, media] = await Promise.all([
          createEngine(),
          navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          }),
        ]);
        stream = media;
        if (cancelled || !video) return;

        video.srcObject = media;
        await video.play();
        requestContinuousFocus(media);
        setReady(true);

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        let tick = 0;

        const loop = async () => {
          if (cancelled) return;
          if (video.readyState >= 2 && video.videoWidth > 0) {
            const scale = Math.min(1, FRAME_MAX / Math.max(video.videoWidth, video.videoHeight));
            canvas.width = Math.round(video.videoWidth * scale);
            canvas.height = Math.round(video.videoHeight * scale);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const hit = await engine.decode(canvas, tick++).catch(() => null);
            if (hit && !cancelled) {
              found(hit);
              return;
            }
          }
          frame = requestAnimationFrame(() => void loop());
        };
        void loop();
      } catch (e) {
        if (!cancelled) setError(describeCameraError(e));
      }
    };
    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
    };
  }, [scan, attempt]);

  const again = () => {
    setScan(null);
    setError(null);
    setNotice(null);
    setReady(false);
    setAttempt((a) => a + 1);
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    setNotice(null);
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("imagem inválida"));
        img.src = url;
      });
      const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext("2d", { willReadFrequently: true })!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const hit = await (await createEngine()).decodeStill(canvas);
      if (hit) found(hit);
      else setNotice("Não encontrei nenhum QR code ou código de barras nessa imagem.");
    } catch {
      setNotice("Não consegui abrir essa imagem.");
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (manual.trim()) setScan(classifyManual(manual));
  };

  const scanning = !scan && !error;
  const pill =
    "inline-flex h-11 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-bold backdrop-blur transition-colors hover:bg-white/25 active:scale-95";

  return (
    <main className="fixed inset-0 overflow-hidden bg-black text-white">
      <video ref={videoRef} muted playsInline autoPlay className="absolute inset-0 h-full w-full object-cover" />
      <div aria-hidden className={`absolute inset-0 transition-colors ${scan || error ? "bg-black/60" : "bg-transparent"}`} />

      {scanning ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          {/* Quadro quadrado e amplo: serve para QR, código deitado e código em pé. A leitura usa a imagem toda. */}
          <div className="relative aspect-square w-[min(78vw,21rem)] rounded-[2rem] shadow-[0_0_0_100vmax_rgb(0_0_0/0.55)]">
            <span className={`${corner} left-0 top-0 rounded-tl-[1.6rem] border-l-4 border-t-4`} />
            <span className={`${corner} right-0 top-0 rounded-tr-[1.6rem] border-r-4 border-t-4`} />
            <span className={`${corner} bottom-0 left-0 rounded-bl-[1.6rem] border-b-4 border-l-4`} />
            <span className={`${corner} bottom-0 right-0 rounded-br-[1.6rem] border-b-4 border-r-4`} />
            <span className="animate-scan-line absolute inset-x-5 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-lime shadow-[0_0_14px_var(--color-lime)]" />
          </div>
        </div>
      ) : null}

      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.9rem)]">
        <Link
          href="/"
          aria-label="Fechar leitor"
          className="grid size-11 place-items-center rounded-full bg-white/15 backdrop-blur transition-colors hover:bg-white/25"
        >
          <X size={22} aria-hidden />
        </Link>
        <h1 className="text-base font-extrabold tracking-tight">Escanear código</h1>
        <span aria-hidden className="size-11" />
      </header>

      {error ? (
        <section className="absolute inset-0 grid place-items-center px-6">
          <div className="max-w-sm rounded-[2rem] bg-paper p-6 text-center text-ink shadow-float">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-blush text-[#a02a4a]">
              <CameraOff size={28} aria-hidden />
            </div>
            <h2 className="mt-4 text-lg font-extrabold">Câmera indisponível</h2>
            <p className="mt-1 text-sm font-medium text-muted">{error}</p>
            <button
              type="button"
              onClick={again}
              className="mt-5 inline-flex h-12 items-center justify-center rounded-full bg-lime px-6 text-sm font-extrabold text-forest-deep transition-transform active:scale-95"
            >
              Tentar de novo
            </button>
            <p className="mt-3 text-xs font-medium text-muted">Ou envie uma foto / digite o código logo abaixo.</p>
          </div>
        </section>
      ) : null}

      {!scan ? (
        <footer className="absolute inset-x-0 bottom-0 z-10 px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
          <p className="mb-3 text-center text-sm font-semibold text-white/85" aria-live="polite">
            {notice ?? (scanning ? (ready ? "Aponte para um QR code ou código de barras (em pé ou deitado)" : "Abrindo a câmera…") : "")}
          </p>

          {manualOpen ? (
            <form onSubmit={submitManual} className="mx-auto mb-3 flex max-w-md items-center gap-2 rounded-full bg-paper p-1.5 text-ink">
              <input
                autoFocus
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                inputMode="text"
                placeholder="Digite o número ou o link"
                aria-label="Código digitado"
                className="min-w-0 flex-1 bg-transparent px-4 py-2.5 font-mono text-sm font-bold outline-none placeholder:font-sans placeholder:font-medium placeholder:text-muted"
              />
              <button
                type="submit"
                className="h-10 shrink-0 rounded-full bg-lime px-5 text-sm font-extrabold text-forest-deep transition-transform active:scale-95"
              >
                OK
              </button>
            </form>
          ) : null}

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <label className={`${pill} cursor-pointer`}>
              <ImageUp size={17} aria-hidden />
              Enviar foto
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  void onFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <button type="button" onClick={() => setManualOpen((v) => !v)} aria-expanded={manualOpen} className={pill}>
              <Keyboard size={17} aria-hidden />
              Digitar código
            </button>
          </div>
        </footer>
      ) : (
        <ScanResult scan={scan} onAgain={again} />
      )}
    </main>
  );
}
