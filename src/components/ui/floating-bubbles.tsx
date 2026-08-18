"use client";

// Ana tema renkleri (mavi, indigo, mor, pembe-mor)
const STATIC_ORBS = [
  { size: 420, top: "-5%", left: "10%", color: "rgba(99, 102, 241, 0.22)", blur: 70 },
  { size: 380, top: "20%", left: "75%", color: "rgba(139, 92, 246, 0.20)", blur: 80 },
  { size: 460, top: "60%", left: "15%", color: "rgba(59, 130, 246, 0.18)", blur: 90 },
  { size: 360, top: "75%", left: "70%", color: "rgba(168, 85, 247, 0.18)", blur: 75 },
  { size: 320, top: "45%", left: "45%", color: "rgba(147, 51, 234, 0.14)", blur: 85 },
];

export default function FloatingBubbles() {
  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none z-0"
      aria-hidden="true"
    >
      {STATIC_ORBS.map((orb, index) => (
        <div
          key={index}
          className="static-bubble"
          style={{
            width: `${orb.size}px`,
            height: `${orb.size}px`,
            top: orb.top,
            left: orb.left,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            filter: `blur(${orb.blur}px)`,
          }}
        />
      ))}
    </div>
  );
}
