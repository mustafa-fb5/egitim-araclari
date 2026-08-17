"use client";

import { useEffect, useRef } from "react";

interface BubbleConfig {
  size: number;
  left: number;
  duration: number;
  delay: number;
  drift: number;
  scaleEnd: number;
  colorIndex: number;
}

// Ana tema renkleri (mavi, indigo, mor, pembe-mor)
const BUBBLE_COLORS = [
  { r: 99, g: 102, b: 241 },   // indigo (#6366f1)
  { r: 139, g: 92, b: 246 },  // violet (#8b5cf6)
  { r: 59, g: 130, b: 246 },   // blue (#3b82f6)
  { r: 168, g: 85, b: 247 },  // purple (#a855f7)
  { r: 79, g: 70, b: 229 },   // deep indigo
  { r: 147, g: 51, b: 234 },  // vibrant purple
];

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export default function FloatingBubbles({ count = 20 }: { count?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const bubbles: HTMLDivElement[] = [];

    for (let i = 0; i < count; i++) {
      const cfg: BubbleConfig = {
        size: randomBetween(100, 220),
        left: randomBetween(0, 100),
        duration: randomBetween(18, 38),
        delay: randomBetween(0, 30),
        drift: randomBetween(-100, 100),
        scaleEnd: randomBetween(0.85, 1.3),
        colorIndex: Math.floor(Math.random() * BUBBLE_COLORS.length),
      };

      const c = BUBBLE_COLORS[cfg.colorIndex];
      const el = document.createElement("div");
      el.className = "bubble";
      el.style.cssText = `
        width: ${cfg.size}px;
        height: ${cfg.size}px;
        left: ${cfg.left}%;
        animation-duration: ${cfg.duration}s;
        animation-delay: -${cfg.delay}s;
        --drift: ${cfg.drift}px;
        --scale-end: ${cfg.scaleEnd};
        background: radial-gradient(circle at 40% 40%, rgba(${c.r}, ${c.g}, ${c.b}, 0.32) 0%, rgba(${c.r}, ${c.g}, ${c.b}, 0.14) 50%, transparent 80%);
        border: none;
        box-shadow: 0 0 ${Math.floor(cfg.size * 0.3)}px rgba(${c.r}, ${c.g}, ${c.b}, 0.18);
        filter: blur(${randomBetween(35, 52).toFixed(0)}px);
        opacity: 0.65;
        will-change: transform, opacity;
      `;
      container.appendChild(el);
      bubbles.push(el);
    }

    return () => {
      bubbles.forEach((b) => b.remove());
    };
  }, [count]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}
