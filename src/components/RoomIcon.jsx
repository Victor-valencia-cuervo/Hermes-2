import { ListMusic } from 'lucide-react';

export const ROOM_ICONS = ['🎧', '🎸', '🎹', '🥁', '🎷', '🎤', '🔥', '🌙', '☕', '🚗', '🏋️', '📚', '💜', '🌴', '👾', '🪩'];
export const ROOM_COLORS = ['#6366f1', '#ec4899', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#8b5cf6', '#ef4444', '#64748b'];

/** Icono de sala: emoji sobre degradado del color elegido (o icono por defecto). */
export default function RoomIcon({ room, size = 44, radius = 16 }) {
  const c = /^#[0-9a-fA-F]{6}$/.test(room?.color || '') ? room.color : null;
  return (
    <span className="grid place-items-center shrink-0 text-white select-none"
      style={{
        width: size, height: size, borderRadius: radius,
        background: c ? `linear-gradient(135deg, ${c}, ${c}88)` : 'var(--a)',
        fontSize: size * 0.5, lineHeight: 1,
        boxShadow: c ? `0 6px 16px ${c}55` : undefined,
      }}>
      {room?.icon ? room.icon : <ListMusic size={size * 0.45} />}
    </span>
  );
}
