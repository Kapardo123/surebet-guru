/**
 * Generates every raster brand asset from src/assets/brand/mark.svg:
 * Android launcher icons (legacy, round, adaptive foreground) and splash
 * screens, PWA icons, favicon, Capacitor asset sources and the social image.
 *
 *   node scripts/gen_brand.cjs            (needs Playwright + Chromium)
 *
 * Python/Pillow is used afterwards for favicon.ico (see gen_favicon below).
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const RES = path.join(ROOT, "android/app/src/main/res");
const svg = fs.readFileSync(path.join(ROOT, "src/assets/brand/mark.svg"), "utf8");

const BG = "#141a3c";
// Full-bleed square (no rounded corners) for round / masked icons.
const square = svg.replace('rx="112" fill="url(#bg)"', 'fill="url(#bg)"');
// Adaptive-icon foreground: cards only, inside the 66% safe zone.
const foreground = svg
  .replace('<rect width="512" height="512" rx="112" fill="url(#bg)"/>', "")
  .replace(/<ellipse[^>]*\/>/, "")
  .replace(/<circle cx="256" cy="210"[^>]*\/>/, "")
  .replace("<!-- Back card", '<g transform="translate(256 256) scale(0.8) translate(-262 -262)"><!-- Back card')
  .replace("<!-- Sparkle -->", "</g><!-- Sparkle -->")
  .replace(/<path d="M404 92[^>]*\/>/, "")
  .replace(/<path d="M120 404[^>]*\/>/, "");

const FONT = '<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@500;700&family=Unbounded:wght@900&display=swap" rel="stylesheet">';

const page = (body, w, h, bg = "transparent") => `<!doctype html><html><head>${FONT}<style>
html,body{margin:0;width:${w}px;height:${h}px;background:${bg};overflow:hidden}
.wm{font-family:Unbounded,sans-serif;font-weight:900;text-transform:uppercase;color:#f6f2e8;letter-spacing:-.02em;line-height:.95}
.gold{background:linear-gradient(135deg,#b98a2a,#fff1b8 45%,#c99a33 70%,#f6dc8a);-webkit-background-clip:text;color:transparent}
.tag{font-family:Rubik,sans-serif;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:rgba(246,242,232,.6)}
</style></head><body>${body}</body></html>`;

const sized = (s, n) => s.replace("<svg ", `<svg width="${n}" height="${n}" `);

const felt = (w, h) =>
  `radial-gradient(${Math.max(w, h) * 0.6}px ${Math.max(w, h) * 0.45}px at 50% 42%, #2b3473, #141a3c 55%, #070918)`;

// Brand lock-up: mark above the two-line wordmark.
const lockup = (w, h) => {
  const m = Math.round(Math.min(w, h) * 0.34);
  const fs1 = Math.round(m * 0.24);
  return page(
    `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:${felt(w, h)}">
      ${sized(svg, m)}
      <div class="wm" style="font-size:${fs1}px;margin-top:${Math.round(m * 0.14)}px;text-align:center">Great Sport<br><span class="gold">Bets</span></div>
    </div>`,
    w,
    h,
  );
};

(async () => {
  const browser = await chromium.launch();
  const shot = async (html, w, h, out) => {
    const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await p.setContent(html, { waitUntil: "networkidle" }).catch(() => p.setContent(html));
    await p.evaluate(() => document.fonts && document.fonts.ready);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await p.screenshot({ path: out, omitBackground: true });
    await p.close();
    console.log(path.relative(ROOT, out), `${w}x${h}`);
  };
  const icon = (s, n, out) => shot(page(sized(s, n), n, n), n, n, out);
  const round = (n, out) =>
    shot(page(`<div style="width:${n}px;height:${n}px;border-radius:50%;overflow:hidden">${sized(square, n)}</div>`, n, n), n, n, out);

  // Android launcher icons
  const dens = { ldpi: 36, mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  for (const [d, n] of Object.entries(dens)) {
    await icon(svg, n, path.join(RES, `mipmap-${d}/ic_launcher.png`));
    await round(n, path.join(RES, `mipmap-${d}/ic_launcher_round.png`));
    if (d !== "ldpi") await icon(foreground, Math.round(n * 2.25), path.join(RES, `mipmap-${d}/ic_launcher_foreground.png`));
  }

  // Android splash screens (same sizes as before)
  const splashes = {
    "drawable/splash.png": [320, 480],
    "drawable-port-ldpi/splash.png": [240, 320], "drawable-port-mdpi/splash.png": [320, 480],
    "drawable-port-hdpi/splash.png": [480, 800], "drawable-port-xhdpi/splash.png": [720, 1280],
    "drawable-port-xxhdpi/splash.png": [960, 1600], "drawable-port-xxxhdpi/splash.png": [1280, 1920],
    "drawable-land-ldpi/splash.png": [320, 240], "drawable-land-mdpi/splash.png": [480, 320],
    "drawable-land-hdpi/splash.png": [800, 480], "drawable-land-xhdpi/splash.png": [1280, 720],
    "drawable-land-xxhdpi/splash.png": [1600, 960], "drawable-land-xxxhdpi/splash.png": [1920, 1280],
  };
  for (const [f, [w, h]] of Object.entries(splashes)) await shot(lockup(w, h), w, h, path.join(RES, f));

  // PWA / web
  await icon(svg, 512, path.join(ROOT, "public/logo.png"));
  await icon(svg, 192, path.join(ROOT, "public/icon-192.png"));
  await icon(square, 512, path.join(ROOT, "public/icon-512-maskable.png"));
  await icon(svg, 180, path.join(ROOT, "public/apple-touch-icon.png"));
  for (const n of [16, 32, 48]) await icon(n <= 32 ? square : svg, n, path.join(ROOT, `scripts/.favicon-${n}.png`));
  await shot(lockup(1080, 1920), 1080, 1920, path.join(ROOT, "public/splash.png"));

  // Capacitor asset sources
  await icon(svg, 1024, path.join(ROOT, "assets/icon-only.png"));
  await shot(lockup(2732, 2732), 2732, 2732, path.join(ROOT, "assets/splash.png"));

  // Social preview (Open Graph / Twitter)
  await shot(
    page(
      `<div style="width:1200px;height:630px;display:flex;align-items:center;gap:56px;padding:0 90px;box-sizing:border-box;background:${felt(1200, 630)}">
        ${sized(svg, 300)}
        <div><div class="wm" style="font-size:78px">Great Sport<br><span class="gold">Bets</span></div>
        <div class="tag" style="font-size:24px;margin-top:26px">Daily picks, dealt as cards</div></div>
      </div>`,
      1200,
      630,
    ),
    1200,
    630,
    path.join(ROOT, "public/og-image.png"),
  );

  await browser.close();
})();
