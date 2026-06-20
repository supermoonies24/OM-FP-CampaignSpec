// 24 hues evenly spaced 15° apart around the wheel at constant saturation/lightness,
// so every color is unique and clearly distinguishable from its neighbors.
export const COLOR_PALETTE = [
  "#de3535", "#de5f35", "#de8a35", "#deb435",
  "#dede35", "#b4de35", "#8ade35", "#5fde35",
  "#35de35", "#35de5f", "#35de8a", "#35deb4",
  "#35dede", "#35b4de", "#358ade", "#355fde",
  "#3535de", "#5f35de", "#8a35de", "#b435de",
  "#de35de", "#de35b4", "#de358a", "#de355f",
];

const COLORS = COLOR_PALETTE;

function hash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function getValueColor(value: string, overrides?: Record<string, string>): string {
  if (!value) return "#94a3b8";
  if (overrides?.[value]) return overrides[value];
  return COLORS[hash(value) % COLORS.length];
}

export function getContrastTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1e293b" : "#ffffff";
}
