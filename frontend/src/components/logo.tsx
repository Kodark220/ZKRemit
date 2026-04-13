export function ZKRemitLogo({ className = "", size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer shield shape */}
      <path
        d="M24 2L6 12v14c0 11.1 7.7 21.5 18 24 10.3-2.5 18-12.9 18-24V12L24 2z"
        fill="url(#shield-gradient)"
        stroke="url(#stroke-gradient)"
        strokeWidth="1.5"
      />
      {/* Inner ZK letterform */}
      <path
        d="M15 17h10l-10 14h10"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M29 17v14M29 17l6 7-6 7"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Privacy dot */}
      <circle cx="24" cy="40" r="1.8" fill="white" opacity="0.6" />
      <defs>
        <linearGradient id="shield-gradient" x1="6" y1="2" x2="42" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(217, 91%, 60%)" />
          <stop offset="1" stopColor="hsl(250, 80%, 55%)" />
        </linearGradient>
        <linearGradient id="stroke-gradient" x1="6" y1="2" x2="42" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(217, 91%, 70%)" />
          <stop offset="1" stopColor="hsl(250, 80%, 65%)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function ZKRemitWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      <span className="text-foreground">ZK</span>
      <span className="bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">Remit</span>
    </span>
  );
}
