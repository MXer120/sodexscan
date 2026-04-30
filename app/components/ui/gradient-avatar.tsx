"use client";

import * as React from "react";

const GRADIENT_PRESETS = [
  ["#a855f7", "#ec4899", "#ef4444"], // purple-pink-red (matches square ui)
  ["#3b82f6", "#06b6d4", "#22c55e"], // blue-cyan-green
  ["#f97316", "#eab308", "#84cc16"], // orange-yellow-lime
  ["#8b5cf6", "#6366f1", "#3b82f6"], // violet-indigo-blue
  ["#ec4899", "#f97316", "#eab308"], // pink-orange-yellow
  ["#06b6d4", "#3b82f6", "#8b5cf6"], // cyan-blue-purple
  ["#22c55e", "#06b6d4", "#3b82f6"], // green-cyan-blue
  ["#f43f5e", "#f97316", "#eab308"], // rose-orange-yellow
];

function getOrCreateGradient(storageKey: string): string[] {
  if (typeof window === "undefined") return GRADIENT_PRESETS[0];
  const stored = localStorage.getItem(`gradient_avatar_${storageKey}`);
  if (stored) {
    try { return JSON.parse(stored); } catch {}
  }
  const preset = GRADIENT_PRESETS[Math.floor(Math.random() * GRADIENT_PRESETS.length)];
  localStorage.setItem(`gradient_avatar_${storageKey}`, JSON.stringify(preset));
  return preset;
}

interface GradientAvatarProps {
  storageKey: string;
  size?: number;
  className?: string;
  rounded?: "full" | "lg";
}

export function GradientAvatar({
  storageKey,
  size = 28,
  className = "",
  rounded = "full",
}: GradientAvatarProps) {
  const [colors, setColors] = React.useState<string[]>(GRADIENT_PRESETS[0]);

  React.useEffect(() => {
    setColors(getOrCreateGradient(storageKey));
  }, [storageKey]);

  const id = `grad_${storageKey.replace(/[^a-z0-9]/gi, "_")}`;
  const r = rounded === "full" ? size / 2 : size * 0.28;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ borderRadius: rounded === "full" ? "50%" : `${size * 0.28}px`, flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="50%" stopColor={colors[1]} />
          <stop offset="100%" stopColor={colors[2]} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={size} height={size} rx={r} ry={r} fill={`url(#${id})`} />
    </svg>
  );
}
