function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
}

export function mixColors(from: string, to: string, weight: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  if (!a || !b) return from;
  const ratio = weight / 100;
  return toHex(
    a.r + (b.r - a.r) * ratio,
    a.g + (b.g - a.g) * ratio,
    a.b + (b.b - a.b) * ratio,
  );
}

export function lightenColor(hex: string, amount: number): string {
  return mixColors(hex, '#ffffff', amount);
}

export function darkenColor(hex: string, amount: number): string {
  return mixColors(hex, '#000000', amount);
}
