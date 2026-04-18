export default function BackgroundLines() {
  const paths = [
    {
      d: "M -50 180 L 420 180 L 520 280 L 960 280 L 1060 380 L 2000 380",
      dur: "7s",
      delay: "0s",
      length: 2200,
    },
    {
      d: "M 2000 620 L 1420 620 L 1320 520 L 880 520 L 780 620 L -50 620",
      dur: "10s",
      delay: "2s",
      length: 2300,
    },
    {
      d: "M -50 900 L 520 900 L 620 800 L 1100 800 L 1200 900 L 2000 900",
      dur: "9s",
      delay: "4s",
      length: 2250,
    },
    {
      d: "M 180 -50 L 180 260 L 280 360 L 280 760 L 180 860 L 180 1200",
      dur: "11s",
      delay: "1s",
      length: 1500,
    },
    {
      d: "M 1720 1200 L 1720 840 L 1620 740 L 1620 340 L 1720 240 L 1720 -50",
      dur: "12s",
      delay: "3.5s",
      length: 1520,
    },
  ];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <filter id="pulse-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </radialGradient>
        </defs>

        {paths.map((p, i) => (
          <g key={i}>
            <path
              d={p.d}
              stroke="#27272A"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.55"
            />
            <path
              d={p.d}
              stroke="#3B82F6"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#pulse-glow)"
              style={{
                strokeDasharray: `60 ${p.length}`,
                animation: `bg-pulse-${i} ${p.dur} linear ${p.delay} infinite`,
              }}
            />
          </g>
        ))}

        {[
          { cx: 420, cy: 180 },
          { cx: 520, cy: 280 },
          { cx: 1320, cy: 520 },
          { cx: 780, cy: 620 },
          { cx: 620, cy: 800 },
          { cx: 180, cy: 360 },
          { cx: 1620, cy: 740 },
        ].map((n, i) => (
          <circle
            key={`node-${i}`}
            cx={n.cx}
            cy={n.cy}
            r="2"
            fill="#3B82F6"
            opacity="0.35"
          />
        ))}
      </svg>

      <style>{`
        ${paths
          .map(
            (p, i) => `
          @keyframes bg-pulse-${i} {
            0% { stroke-dashoffset: ${p.length + 60}; }
            100% { stroke-dashoffset: -60; }
          }
        `
          )
          .join("\n")}

        @media (prefers-reduced-motion: reduce) {
          ${paths
            .map(
              (_, i) => `[style*="bg-pulse-${i}"] { animation: none !important; }`
            )
            .join("\n")}
        }
      `}</style>
    </div>
  );
}