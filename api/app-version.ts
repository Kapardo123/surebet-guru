import { NextResponse } from 'next/server';

export const runtime = 'edge';

const APP_VERSION = {
  version: "25.0.0",
  build: 2500,
  forceUpdate: true,
  releaseDate: "2026-08-31",
  updateMessage: "New version available! v25.0.0 ✨ Crash fix during SportyTrader import (native fetch timeouts).",
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
