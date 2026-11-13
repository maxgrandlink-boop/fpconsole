import { brands } from "./palette.mjs";

function hexToRgb(h) {
  h = h.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function lin(c) {
  c = c / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function lum(hex) {
  const [r, g, b] = hexToRgb(hex).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const L1 = lum(a);
  const L2 = lum(b);
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}
function rgbToXyz([r, g, b]) {
  r = lin(r);
  g = lin(g);
  b = lin(b);
  return [
    r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
    r * 0.2126729 + g * 0.7151522 + b * 0.072175,
    r * 0.0193339 + g * 0.119192 + b * 0.9503041,
  ];
}
function xyzToLab([x, y, z]) {
  const xn = 0.95047, yn = 1, zn = 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x / xn), fy = f(y / yn), fz = f(z / zn);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function lab(h) {
  return xyzToLab(rgbToXyz(hexToRgb(h)));
}
function dE(a, b) {
  const A = lab(a), B = lab(b);
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}
function hue(h) {
  const [, a, b] = lab(h);
  let d = (Math.atan2(b, a) * 180) / Math.PI;
  return d < 0 ? d + 360 : d;
}
function hd(a, b) {
  let d = Math.abs(hue(a) - hue(b));
  return d > 180 ? 360 - d : d;
}
const round = (n) => Math.round(n * 100) / 100;
const round1 = (n) => Math.round(n * 10) / 10;

let failed = false;
const report = {};
for (const [key, brand] of Object.entries(brands)) {
  const primary = brand.stops[0];
  const buttons = {};
  for (const state of ["default", "hover", "pressed"]) {
    const ratios = brand.button[state].map((fill) => contrast(fill, brand.ink));
    const worst = Math.min(...ratios);
    if (worst < 4.5) failed = true;
    buttons[state] = {
      fills: brand.button[state],
      ratios: ratios.map(round),
      worst: round(worst),
    };
  }
  const status = {};
  for (const theme of ["dark", "light"]) {
    status[theme] = {};
    for (const role of ["running", "warning", "error"]) {
      const color = brand[role][theme];
      const ground = theme === "dark" ? "#0F172A" : "#F8FAFC";
      status[theme][role] = {
        color,
        onGround: round(contrast(color, ground)),
        dE: round1(dE(color, primary)),
        hue: round1(hd(color, primary)),
      };
    }
  }
  report[key] = { name: brand.name, ink: brand.ink, primary, stops: brand.stops, buttons, status, tint: brand.tint, focus: brand.focus };
  console.log("\n## " + key);
  console.log(JSON.stringify(report[key], null, 2));
}
if (failed) {
  console.error("\nFAIL button contrast < 4.5");
  process.exit(1);
}
console.log("\nOK all button endpoints >= 4.5");
