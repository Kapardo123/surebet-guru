import type { VercelRequest, VercelResponse } from '@vercel/node';

const APP_VERSION = {
  version: "40.0.0",
  build: 4000,
  forceUpdate: false,
  releaseDate: "2026-09-13",
  updateMessage: "New version available! v40.0.0 ✨ Fixes Premium disappearing after purchase.",
  downloadUrl: "https://play.google.com/store/apps/details?id=com.surebet.guru",
  minSupportedVersion: "10.0.0",
};

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
  res.status(200).json(APP_VERSION);
}
