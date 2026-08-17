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

export default function FloatingBubbles({ count = 28 }: { count?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const bubbles: HTMLDivElement[] = [];

    for (let i = 0; i < count; i++) {
      const cfg: BubbleConfig = {
        size: randomBetween(35, 110),
        left: randomBetween(2, 98),
        duration: randomBetween(12, 28),
        delay: randomBetween(0, 25),
        drift: randomBetween(-90, 90),
        scaleEnd: randomBetween(0.8, 1.4),
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
        background: radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.75) 0%, rgba(${c.r}, ${c.g}, ${c.b}, 0.55) 45%, rgba(${c.r}, ${c.g}, ${c.b}, 0.25) 85%);
        border: 1.5px solid rgba(255, 255, 255, 0.7);
        box-shadow: 0 0 ${Math.floor(cfg.size * 0.4)}px rgba(${c.r}, ${c.g}, ${c.b}, 0.45), inset -2px -2px 8px rgba(${c.r}, ${c.g}, ${c.b}, 0.35);
        filter: blur(${randomBetween(0.8, 2.5).toFixed(1)}px);
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
