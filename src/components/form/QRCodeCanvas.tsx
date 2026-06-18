"use client";
import { useEffect, useRef, useState } from "react";

interface QRCodeCanvasProps {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  id?: string;
}

export function QRCodeCanvas({ value, size = 200, fgColor = "#000000", bgColor = "#ffffff", id }: QRCodeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function draw() {
      if (!canvasRef.current) return;
      try {
        const QRCode = (await import("qrcode")).default;
        if (cancelled) return;
        await QRCode.toCanvas(canvasRef.current, value, {
          width: size,
          margin: 1,
          color: { dark: fgColor, light: bgColor },
        });
        setReady(true);
      } catch (e) {
        console.error("QR generation failed", e);
      }
    }
    draw();
    return () => { cancelled = true; };
  }, [value, size, fgColor, bgColor]);

  return <canvas ref={canvasRef} id={id} className={ready ? "" : "opacity-0"} style={{ width: size, height: size }} />;
}
