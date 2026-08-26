import { NextResponse } from 'next/server';

export const runtime = 'edge';

const APP_VERSION = {
  version: "22.0.0",
  build: 2200,
  forceUpdate: true,
  releaseDate: "2026-08-26",
  updateMessage: "New version available! v22.0.0 — Better team logos, canonical team names, SofaScore odds fallback, faster cache.",
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
