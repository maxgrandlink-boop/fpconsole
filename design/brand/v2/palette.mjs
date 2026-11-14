export function hexToRgb(h) {
  h = h.replace("#", "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export function mix(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return (
    "#" +
    A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("")
  );
}
export const lighten = (h, t) => mix(h, "#FFFFFF", t);
export const darken = (h, t) => mix(h, "#000000", t);

function ramp(stops) {
  return {
    default: stops,
    hover: stops.map((s) => lighten(s, 0.08)),
    pressed: stops.map((s) => darken(s, 0.12)),
  };
}

export const brands = {
  berry: {
    name: "冰莓奶昔",
    ink: "#1A0A12",
    stops: ["#FF5DA2", "#FF99C8", "#CDB4D8"],
    button: ramp(["#FF5DA2", "#FF99C8"]),
    blush: "#FF5DA2",
    tint: { dark: "#4D304E", light: "#FFE8F2" },
    focus: { dark: "#FFB3D6", light: "#9D174D" },
    glow: "rgba(255, 93, 162, 0.32)",
    plateShadow: "#3A1024",
    running: {
      note: "主色是草莓粉，运行中保持翠绿，没有和主色撞上。",
      dark: "#4ADE80",
      light: "#15803D",
    },
    warning: { dark: "#FBBF24", light: "#A16207" },
    error: {
      dark: "#F97316",
      light: "#C2410C",
      note: "错误从正红改成焦橙。草莓粉和正红色相挨着，焦橙和主色拉开，警告留在金黄。",
    },
  },
  mint: {
    name: "海盐薄荷",
    ink: "#042F2E",
    stops: ["#06D6A0", "#4CC9F0", "#BDE0FE"],
    button: ramp(["#06D6A0", "#4CC9F0"]),
    blush: "#4CC9F0",
    tint: { dark: "#17474B", light: "#D7F8F0" },
    focus: { dark: "#BDE0FE", light: "#115E59" },
    glow: "rgba(6, 214, 160, 0.30)",
    plateShadow: "#042028",
    running: {
      note: "运行中改为靛蓝，不用绿，也不用渐变里的湖水蓝。",
      dark: "#A5B4FC",
      light: "#4338CA",
    },
    warning: { dark: "#F5A524", light: "#B45309" },
    error: { dark: "#F87171", light: "#DC2626", note: "" },
  },
  lime: {
    name: "青柠气泡",
    ink: "#14210A",
    stops: ["#AACC00", "#80ED99", "#57CC99"],
    button: ramp(["#AACC00", "#57CC99"]),
    blush: "#80ED99",
    tint: { dark: "#35412C", light: "#F0F6D1" },
    focus: { dark: "#E4F7A8", light: "#3F6212" },
    glow: "rgba(170, 204, 0, 0.28)",
    plateShadow: "#14210A",
    running: {
      note: "运行中改为钴蓝，避开青柠绿和海盐绿。",
      dark: "#60A5FA",
      light: "#1D4ED8",
    },
    warning: { dark: "#EA580C", light: "#C2410C" },
    error: {
      dark: "#F87171",
      light: "#7F1D1D",
      note: "警告不用琥珀黄（和青柠太近），改成焦橙；错误用红 / 绛红。",
    },
  },
};
