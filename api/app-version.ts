import { NextResponse } from 'next/server';

export const runtime = 'edge';

const APP_VERSION = {
  version: "20.0.0",
  build: 2000,
  forceUpdate: true,
  releaseDate: "2026-07-26",
  updateMessage: "New version available! v20.0.0 — Daily Spin wheel, AI analysis, SportyTrader import with odds.",
  downloadUrl: "https://play.google.com/store/apps/details?id=com.surebet.guru",
  minSupportedVersion: "10.0.0"
};

export async function GET() {
  return NextResponse.json(APP_VERSION, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      'Content-Type': 'application/json',
    },
  });
}
