'use client';

import { useState } from 'react';

const GRADIENTS = [
  'from-rose-500/80 to-orange-500/80',
  'from-emerald-500/80 to-teal-500/80',
  'from-violet-500/80 to-fuchsia-500/80',
  'from-amber-500/80 to-yellow-500/80',
  'from-sky-500/80 to-cyan-500/80',
  'from-pink-500/80 to-rose-500/80',
];

function initials(name: string) {
  return (name || '?').slice(0, 2).toUpperCase();
}

export function AgentAvatar({
  name,
  uuid,
  size = 40,
  rounded = 'rounded-lg',
}: {
  name: string;
  uuid: string;
  size?: number;
  rounded?: string;
}) {
  const [failed, setFailed] = useState(false);
  const gradient = GRADIENTS[(name || '?').charCodeAt(0) % GRADIENTS.length];

  if (!uuid || failed) {
    return (
      <div
        className={`${rounded} flex items-center justify-center bg-gradient-to-br ${gradient} font-bold text-white shrink-0`}
        style={{ width: size, height: size, fontSize: size * 0.36 }}
        aria-label={name}
      >
        {initials(name)}
      </div>
    );
  }

  return (
    <img
      src={`https://media.valorant-api.com/agents/${uuid}/displayicon.png`}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${rounded} shrink-0 bg-slate-800 object-cover`}
      style={{ width: size, height: size }}
    />
  );
}

export function MapTile({ name, size = 44 }: { name: string; size?: number }) {
  const gradient = GRADIENTS[(name || '?').charCodeAt(1) % GRADIENTS.length];
  return (
    <div
      className={`rounded-lg flex items-center justify-center bg-gradient-to-br ${gradient} shrink-0`}
      style={{ width: size, height: size * 0.72 }}
      aria-hidden
    >
      <span className="font-black text-white/90" style={{ fontSize: size * 0.4 }}>
        {(name || '?').slice(0, 2).toUpperCase()}
      </span>
    </div>
  );
}
