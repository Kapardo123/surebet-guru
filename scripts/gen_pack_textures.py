"""Crinkled-foil and crimp textures for the booster packs.

Writes WebP files into argv[1]. Grey-scale images centred on mid-grey, meant
to be laid over a colour with mix-blend-mode: overlay / soft-light.
"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(11)


def crinkle(w=500, h=800):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    height = np.zeros((h, w), np.float32)
    # Long soft creases running roughly lengthwise, like a filled foil wrapper.
    # Low-frequency undulation: the wrapper bulges over the cards inside.
    for _ in range(6):
        fx, fy, ph = rng.random() * 2 + 0.5, rng.random() * 2 + 0.5, rng.random() * 6.28
        height += 0.35 * np.sin(x / w * fx * 3.14 + ph) * np.sin(y / h * fy * 3.14 + ph)
    for _ in range(34):
        ang = rng.normal(np.pi / 2, 0.3)
        nx, ny = np.cos(ang), np.sin(ang)
        px, py = rng.random() * w, rng.random() * h
        d = (x - px) * ny - (y - py) * nx
        width = rng.random() * 14 + 3
        along = np.exp(-(((x - px) * nx + (y - py) * ny) / (rng.random() * h * 0.6 + h * 0.25)) ** 2)
        height += (rng.random() * 0.7 + 0.3) * np.exp(-(d / width) ** 2) * along * (1 if rng.random() > 0.4 else -1)
    # Short sharp wrinkles near the crimped ends.
    for end in (0, h):
        for _ in range(40):
            cx = rng.random() * w
            ang = rng.normal(np.pi / 2, 0.25)
            nx, ny = np.cos(ang), np.sin(ang)
            d = (x - cx) * ny - (y - end) * nx
            fall = np.exp(-np.abs(y - end) / (rng.random() * 90 + 40))
            height += 0.9 * np.exp(-(d / (rng.random() * 4 + 1.5)) ** 2) * fall * (1 if rng.random() > 0.5 else -1)
    # Fine grain.
    height += 0.015 * rng.standard_normal((h, w)).astype(np.float32)
    img = Image.fromarray(((height - height.min()) / (np.ptp(height) + 1e-6) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    hgt = np.asarray(img, np.float32) / 255
    # Shade the height field with a light from the top-left.
    gy, gx = np.gradient(hgt)
    light = -(gx * -0.6 + gy * -0.8) * 14
    shade = 0.5 + np.clip(light, -0.45, 0.45)
    # Specular glints on the steepest creases.
    spec = np.clip(light - 0.18, 0, 1) ** 1.5 * 1.6
    out = np.clip(shade + spec, 0, 1)
    return Image.fromarray((out * 255).astype(np.uint8), "L")


def crimp(w=48, h=40):
    x = np.arange(w, dtype=np.float32)
    ridges = np.sin(x / w * 2 * np.pi * 6) * 0.5 + 0.5  # 6 ridges per tile
    col = 0.25 + 0.6 * ridges ** 1.6
    arr = np.tile(col[None, :], (h, 1))
    arr *= 0.85 + 0.15 * np.sin(np.linspace(0, np.pi, h))[:, None]
    return Image.fromarray((arr * 255).astype(np.uint8), "L")


for name, img, q in [("pack-crinkle.webp", crinkle(), 82), ("pack-crimp.webp", crimp(), 90)]:
    path = os.path.join(OUT, name)
    img.save(path, "WEBP", quality=q, method=6)
    print(name, img.size, os.path.getsize(path) // 1024, "KB")
