/**
 * Phone tilt drives the holo foil: device orientation is mapped to two CSS
 * variables on <html> (--gx, --gy in 0..1, 0.5 = held the way it was when
 * first read). Holo foil, card sheen and the pick of the day read them.
 * Touch devices only; nothing happens on desktop or with reduced motion.
 */
let started = false;

export const startGyro = () => {
  if (started || typeof window === "undefined") return;
  if (!window.matchMedia("(pointer: coarse)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("DeviceOrientationEvent" in window)) return;
  started = true;

  const root = document.documentElement;
  let base: number | null = null;
  let gx = 0.5;
  let gy = 0.5;
  let frame = 0;

  const apply = () => {
    frame = 0;
    root.style.setProperty("--gx", gx.toFixed(3));
    root.style.setProperty("--gy", gy.toFixed(3));
  };

  const onOrient = (e: DeviceOrientationEvent) => {
    if (e.gamma == null || e.beta == null) return;
    if (base == null) base = e.beta; // the angle the phone is naturally held at
    root.dataset.gyro = "1";
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    // Ease towards the new reading so the foil glides instead of jittering.
    gx += (clamp(0.5 + e.gamma / 50) - gx) * 0.35;
    gy += (clamp(0.5 + (e.beta - base) / 40) - gy) * 0.35;
    if (!frame) frame = requestAnimationFrame(apply);
  };

  const listen = () => window.addEventListener("deviceorientation", onOrient, { passive: true });

  // Listen right away: where no permission is needed (Android, the app's
  // WebView) readings just start. Where the browser gates the sensor behind
  // requestPermission (iOS Safari), ask on the first tap.
  listen();
  const req = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission;
  if (typeof req === "function") {
    window.addEventListener("touchend", () => req.call(DeviceOrientationEvent).catch(() => {}), { once: true });
  }
};
