import type { VercelRequest, VercelResponse } from '@vercel/node';

const APP_VERSION = {
  version: "38.0.0",
  build: 3800,
  forceUpdate: false,
  releaseDate: "2026-09-13",
  updateMessage: "New version available! v38.0.0 ✨ Fixes the crash when opening the Premium tab on Android.",
  downloadUrl: "https://play.google.com/store/apps/details?id=com.surebet.guru",
  minSupportedVersion: "10.0.0",
};

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
  res.status(200).json(APP_VERSION);
}
