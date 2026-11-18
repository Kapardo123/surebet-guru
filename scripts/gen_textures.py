"""Procedural, photo-like raster textures for Great Sport Bets.

Writes WebP files into the directory given as argv[1].
"""
import sys, os, math
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)


def fractal(h, w, octaves=5, base=4, persistence=0.55):
    """Value-noise fBm in [0,1]."""
    acc = np.zeros((h, w), np.float32)
    amp, total = 1.0, 0.0
    for o in range(octaves):
        cells = base * (2 ** o)
        small = rng.random((cells + 1, int(cells * w / h) + 1)).astype(np.float32)
        img = Image.fromarray((small * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
        acc += amp * (np.asarray(img, np.float32) / 255.0)
        total += amp
        amp *= persistence
    acc /= total
    return (acc - acc.min()) / (acc.max() - acc.min() + 1e-6)


def to_img(arr):
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def vignette(h, w, strength=0.45):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((x - w / 2) / (w / 2)) ** 2 + ((y - h / 2) / (h / 2)) ** 2)
    return 1 - strength * np.clip(d - 0.35, 0, 1)


def save(img, name, q=88):
    path = os.path.join(OUT, name)
    img.save(path, "WEBP", quality=q, method=6)
    print(name, img.size, os.path.getsize(path) // 1024, "KB")


# ---------- Grass with mowing stripes ----------
def grass(w=960, h=480):
    base = np.array([46, 128, 62], np.float32)
    n = fractal(h, w, 6, 3)
    # blade texture: fine noise stretched vertically
    fine = rng.random((h // 2, w)).astype(np.float32)
    fine = np.asarray(Image.fromarray((fine * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR), np.float32) / 255
    stripes = ((np.arange(w) // (w / 10)) % 2).astype(np.float32)
    stripes = np.asarray(Image.fromarray((stripes[None, :].repeat(h, 0) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(4)), np.float32) / 255
    px = rng.random((h, w)).astype(np.float32)
    shade = 0.80 + 0.22 * stripes + 0.18 * (n - 0.5) + 0.2 * (fine - 0.5) + 0.1 * (px - 0.5)
    v = vignette(h, w, 0.5)[..., None]
    rgb = base[None, None, :] * shade[..., None] * v
    rgb[..., 1] += 10 * (n - 0.5)
    return to_img(rgb).filter(ImageFilter.UnsharpMask(1.2, 60, 2))


# ---------- Hardwood court ----------
def hardwood(w=960, h=480):
    rows = 9
    ph = h / rows
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    row = (y // ph).astype(int)
    offs = rng.random(rows + 1) * w
    plank_len = w / 2.6
    plank_id = ((x + offs[row]) // plank_len).astype(int) + row * 13
    tone = (np.sin(plank_id * 12.9898) * 43758.5453) % 1  # stable random per plank
    n = fractal(h, w, 5, 2)
    grain = np.sin((y * 0.9 + n * 38 + np.sin(x * 0.012 + row) * 6) * 1.1) * 0.5 + 0.5
    grain = grain ** 3
    base = np.array([205, 140, 78], np.float32)
    shade = 0.78 + 0.16 * tone + 0.12 * grain - 0.06 * n
    seam_y = (np.abs((y % ph) - 0) < 1.3) | (np.abs((y % ph) - ph) < 1.3)
    seam_x = ((x + offs[row]) % plank_len) < 1.6
    shade = np.where(seam_y | seam_x, shade * 0.62, shade)
    v = vignette(h, w, 0.42)[..., None]
    rgb = base[None, None, :] * shade[..., None] * v
    # varnish sheen
    sheen = np.exp(-(((x - w * 0.35) / (w * 0.35)) ** 2 + ((y - h * 0.3) / (h * 0.5)) ** 2))
    rgb += 38 * sheen[..., None]
    return to_img(rgb)


# ---------- Hard court (tennis) ----------
def hardcourt(w=960, h=480):
    base = np.array([96, 140, 52], np.float32)
    speck = rng.random((h, w)).astype(np.float32)
    n = fractal(h, w, 5, 3)
    shade = 0.9 + 0.12 * (n - 0.5) + 0.22 * (speck - 0.5)
    v = vignette(h, w, 0.45)[..., None]
    rgb = base[None, None, :] * shade[..., None] * v
    sheen = np.exp(-((np.mgrid[0:h, 0:w][1] - w * 0.6) / (w * 0.4)) ** 2)[..., None]
    rgb += 22 * sheen
    return to_img(rgb)


# ---------- Ice rink ----------
def ice(w=960, h=480):
    n = fractal(h, w, 6, 3)
    base = np.array([214, 232, 242], np.float32)
    shade = 0.9 + 0.12 * (n - 0.5)
    img = to_img(base[None, None, :] * shade[..., None])
    scr = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(scr)
    for _ in range(420):
        x0, y0 = rng.random() * w, rng.random() * h
        ang = rng.normal(0.15, 0.6)
        ln = rng.random() * 260 + 40
        pts = []
        for t in np.linspace(0, 1, 8):
            pts.append((x0 + math.cos(ang + t * 0.4) * ln * t, y0 + math.sin(ang + t * 0.4) * ln * t))
        d.line(pts, fill=int(rng.random() * 120 + 60), width=1)
    scr = scr.filter(ImageFilter.GaussianBlur(0.6))
    arr = np.asarray(img, np.float32)
    s = np.asarray(scr, np.float32)[..., None] / 255
    arr = arr * (1 - 0.55 * s) + 255 * 0.55 * s - 18 * (np.asarray(scr.filter(ImageFilter.GaussianBlur(2)), np.float32)[..., None] / 255)
    arr *= vignette(h, w, 0.38)[..., None]
    return to_img(arr)


# ---------- Night stadium with floodlights ----------
def stadium(w=900, h=900):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    sky = np.zeros((h, w, 3), np.float32)
    top, bot = np.array([10, 14, 34]), np.array([26, 22, 58])
    t = (y / h)[..., None]
    sky += top * (1 - t) + bot * t
    # light beams from two towers
    for cx in (w * 0.24, w * 0.76):
        cy = h * 0.2
        ang = np.arctan2(y - cy, x - cx)
        dirn = math.pi / 2 + (0.35 if cx < w / 2 else -0.35)
        beam = np.exp(-((ang - dirn) / 0.22) ** 2) * np.clip((y - cy) / h, 0, 1)
        sky += beam[..., None] * np.array([90, 96, 130]) * 0.55
        dist = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        sky += np.exp(-dist / 26)[..., None] * np.array([255, 245, 220])
        sky += np.exp(-dist / 140)[..., None] * np.array([120, 110, 160]) * 0.6
        # bank of lamps
        for i in range(-3, 4):
            for j in range(-1, 2):
                dd = np.sqrt((x - (cx + i * 9)) ** 2 + (y - (cy + j * 9)) ** 2)
                sky += np.exp(-dd / 2.4)[..., None] * 230
    # crowd bokeh in lower third
    img = to_img(sky)
    bokeh = Image.new("RGB", (w, h), 0)
    d = ImageDraw.Draw(bokeh)
    for _ in range(420):
        bx, by = rng.random() * w, h * (0.55 + rng.random() * 0.45)
        r = rng.random() * 7 + 2
        c = [(255, 214, 140), (160, 190, 255), (255, 255, 255), (255, 150, 200)][int(rng.random() * 4)]
        k = rng.random() * 0.5 + 0.2
        d.ellipse([bx - r, by - r, bx + r, by + r], fill=tuple(int(v * k) for v in c))
    bokeh = bokeh.filter(ImageFilter.GaussianBlur(3.2))
    arr = np.asarray(img, np.float32) + np.asarray(bokeh, np.float32) * 0.9
    # pitch glow at bottom
    arr += np.exp(-((y - h * 1.05) / (h * 0.28)) ** 2)[..., None] * np.array([20, 90, 50])
    arr *= vignette(h, w, 0.55)[..., None]
    grain = (rng.random((h, w)) - 0.5)[..., None] * 10
    return to_img(arr + grain)


# ---------- Felt (tileable) ----------
def felt(s=320):
    big = rng.random((s * 3, s * 3)).astype(np.float32)
    big = np.tile(big[:s, :s], (3, 3))
    im = Image.fromarray((big * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.9))
    fib = np.asarray(im, np.float32)[s:2 * s, s:2 * s] / 255
    coarse = rng.random((8, 8)).astype(np.float32)
    coarse = np.tile(coarse, (3, 3))
    c = np.asarray(Image.fromarray((coarse * 255).astype(np.uint8)).resize((s * 3, s * 3), Image.BICUBIC), np.float32)[s:2 * s, s:2 * s] / 255
    base = np.array([16, 20, 40], np.float32)
    shade = 0.82 + 0.7 * (fib - 0.5) + 0.14 * (c - 0.5)
    return to_img(base[None, None, :] * shade[..., None] + 4)


save(grass(), "pitch-grass.webp")
save(hardwood(), "court-hardwood.webp")
save(hardcourt(), "court-hard.webp")
save(ice(), "rink-ice.webp")
save(stadium(), "stadium-night.webp", q=80)
save(felt(), "felt.webp", q=90)
