import { Tip } from "@/components/TipCard";
import { sportTheme } from "@/lib/sport";
import stadium from "@/assets/textures/stadium-night.webp";
import { PLAY_STORE_URL } from "@/lib/referral";

const W = 1080;
const H = 1920;

const loadImg = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });

const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
};

const cover = (c: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) => {
  const s = Math.max(w / img.width, h / img.height);
  const iw = img.width * s;
  const ih = img.height * s;
  c.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
};

const initials = (n: string) =>
  n.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

const fit = (c: CanvasRenderingContext2D, text: string, max: number, size: number, weight = 900, family = "Unbounded") => {
  let s = size;
  do {
    c.font = `${weight} ${s}px ${family}, sans-serif`;
    s -= 2;
  } while (c.measureText(text).width > max && s > 20);
};

/** Draw a story-sized (1080x1920) image of a card. */
export const renderCardImage = async (tip: Tip, showPick: boolean): Promise<Blob> => {
  await Promise.all([
    document.fonts?.load("900 80px Unbounded"),
    document.fonts?.load("700 40px Rubik"),
  ]).catch(() => {});
  const theme = sportTheme(tip.sport);
  const [bg, tex] = await Promise.all([loadImg(stadium), loadImg(theme.texture)]);

  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const c = cv.getContext("2d")!;

  // Backdrop
  cover(c, bg, 0, 0, W, H);
  const fade = c.createLinearGradient(0, 0, 0, H);
  fade.addColorStop(0, "rgba(10,12,30,.25)");
  fade.addColorStop(0.55, "rgba(10,12,30,.55)");
  fade.addColorStop(1, "rgba(10,12,30,.96)");
  c.fillStyle = fade;
  c.fillRect(0, 0, W, H);

  // Brand
  c.fillStyle = "#f6f2e8";
  c.textAlign = "center";
  c.font = "900 54px Unbounded, sans-serif";
  c.fillText("GREAT SPORT BETS", W / 2, 170);
  c.font = "700 32px Rubik, sans-serif";
  c.fillStyle = "rgba(246,242,232,.7)";
  c.fillText(tip.isPremium ? "◆ GOLD CARD" : "● TODAY'S CARD", W / 2, 230);

  // Card
  const cx = 150, cy = 320, cw = 780, ch = 1180;
  c.save();
  c.translate(W / 2, cy + ch / 2);
  c.rotate((-2.5 * Math.PI) / 180);
  c.translate(-W / 2, -(cy + ch / 2));
  c.shadowColor = "rgba(0,0,0,.6)";
  c.shadowBlur = 60;
  c.shadowOffsetY = 30;
  rr(c, cx, cy, cw, ch, 56);
  if (tip.isPremium) {
    const g = c.createLinearGradient(cx, cy, cx + cw, cy + ch);
    ["#8a6416", "#f6dc8a", "#b98a2a", "#fff1b8", "#a8781f", "#f2cf6a"].forEach((col, i, a) => g.addColorStop(i / (a.length - 1), col));
    c.fillStyle = g;
  } else c.fillStyle = theme.frame;
  c.fill();
  c.shadowColor = "transparent";

  const ix = cx + 22, iy = cy + 22, iw = cw - 44, ih = ch - 44;
  rr(c, ix, iy, iw, ih, 40);
  c.fillStyle = tip.isPremium ? "#f5ecd2" : "#f3efe4";
  c.fill();

  // Sport label
  c.textAlign = "left";
  c.fillStyle = "#151a2e";
  c.font = "800 34px Rubik, sans-serif";
  c.fillText((tip.sport || "").toUpperCase(), ix + 40, iy + 70);

  // Art window with the surface texture and two crests
  const ax = ix + 26, ay = iy + 100, aw = iw - 52, ah = 400;
  c.save();
  rr(c, ax, ay, aw, ah, 26);
  c.clip();
  cover(c, tex, ax, ay, aw, ah);
  c.strokeStyle = theme.lines;
  c.lineWidth = 4;
  c.strokeRect(ax + 30, ay + 30, aw - 60, ah - 60);
  c.beginPath();
  c.moveTo(ax + aw / 2, ay + 30);
  c.lineTo(ax + aw / 2, ay + ah - 30);
  c.stroke();
  c.restore();
  [tip.homeTeam, tip.awayTeam].forEach((name, i) => {
    const x = ax + aw / 2 + (i ? 150 : -150);
    const y = ay + ah / 2;
    c.beginPath();
    c.arc(x, y, 92, 0, Math.PI * 2);
    c.fillStyle = "#f6f2e8";
    c.shadowColor = "rgba(0,0,0,.35)";
    c.shadowBlur = 20;
    c.fill();
    c.shadowColor = "transparent";
    c.fillStyle = "#151a2e";
    c.textAlign = "center";
    c.font = "900 64px Unbounded, sans-serif";
    c.fillText(initials(name), x, y + 23);
  });
  c.fillStyle = "#fff";
  c.font = "900 40px Unbounded, sans-serif";
  c.fillText("VS", ax + aw / 2, ay + ah / 2 + 14);

  // Names
  c.textAlign = "left";
  c.fillStyle = "#151a2e";
  fit(c, tip.homeTeam.toUpperCase(), iw - 330, 62);
  c.fillText(tip.homeTeam.toUpperCase(), ix + 40, ay + ah + 100);
  c.fillStyle = "rgba(21,26,46,.55)";
  fit(c, tip.awayTeam.toUpperCase(), iw - 80, 62);
  c.fillText(tip.awayTeam.toUpperCase(), ix + 40, ay + ah + 175);
  c.font = "600 36px Rubik, sans-serif";
  c.fillStyle = "rgba(21,26,46,.6)";
  c.fillText(tip.league || "", ix + 40, ay + ah + 235);

  // Odds medallion
  const mx = ix + iw - 140, my = ay + ah + 10;
  c.beginPath();
  c.arc(mx, my, 110, 0, Math.PI * 2);
  c.fillStyle = tip.isPremium ? "#e7c35e" : "#f3efe4";
  c.fill();
  c.beginPath();
  c.arc(mx, my, 96, 0, Math.PI * 2);
  c.fillStyle = "#151a2e";
  c.fill();
  c.textAlign = "center";
  c.fillStyle = tip.isPremium ? "#f6dc8a" : "#fff";
  c.font = "900 58px Unbounded, sans-serif";
  c.fillText(showPick ? tip.odds.toFixed(2) : "?.??", mx, my + 14);
  c.font = "800 22px Rubik, sans-serif";
  c.fillStyle = "rgba(255,255,255,.6)";
  c.fillText("ODDS", mx, my + 52);

  // Pick
  const px = ix + 32, py = ay + ah + 290, pw = iw - 64, ph = 220;
  rr(c, px, py, pw, ph, 26);
  c.fillStyle = tip.isPremium ? "rgba(180,140,40,.16)" : `hsla(${theme.hue},50%,40%,.12)`;
  c.fill();
  c.textAlign = "left";
  c.fillStyle = "rgba(21,26,46,.55)";
  c.font = "800 30px Rubik, sans-serif";
  c.fillText("PICK", px + 34, py + 62);
  c.fillStyle = "#151a2e";
  if (showPick) {
    fit(c, tip.prediction, pw - 68, 64, 700, "Rubik");
    c.fillText(tip.prediction, px + 34, py + 150);
  } else {
    rr(c, px + 34, py + 105, pw * 0.7, 56, 14);
    c.fillStyle = "rgba(21,26,46,.18)";
    c.fill();
  }

  // Result stamp
  if (tip.status !== "upcoming") {
    const label = tip.status === "won" ? "WIN" : tip.status === "lost" ? "LOSS" : "PUSH";
    c.save();
    c.translate(ix + 150, ay + 70);
    c.rotate((-14 * Math.PI) / 180);
    c.beginPath();
    c.arc(0, 0, 100, 0, Math.PI * 2);
    c.fillStyle = tip.status === "won" ? "#e7c35e" : tip.status === "lost" ? "#ef5350" : "#9aa3b5";
    c.fill();
    c.fillStyle = "#151a2e";
    c.font = "900 46px Unbounded, sans-serif";
    c.textAlign = "center";
    c.fillText(label, 0, 16);
    c.restore();
  }
  c.restore();

  // Footer
  c.textAlign = "center";
  c.fillStyle = "#f6f2e8";
  c.font = "900 46px Unbounded, sans-serif";
  c.fillText("GET TODAY'S CARDS", W / 2, 1660);
  c.font = "600 34px Rubik, sans-serif";
  c.fillStyle = "rgba(246,242,232,.7)";
  c.fillText("Great Sport Bets on Google Play · 18+", W / 2, 1720);

  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("Render failed"))), "image/png"));
};

/** Share the card image (native share sheet when available, otherwise download). */
export const shareCard = async (tip: Tip, showPick: boolean) => {
  const blob = await renderCardImage(tip, showPick);
  const file = new File([blob], `gsb-${tip.id}.png`, { type: "image/png" });
  const text = `${tip.homeTeam} v ${tip.awayTeam} · Great Sport Bets ${PLAY_STORE_URL}`;
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return "shared";
    } catch {
      return "cancelled";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "downloaded";
};
