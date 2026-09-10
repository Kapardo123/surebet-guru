import { NextResponse } from 'next/server';

export const runtime = 'edge';

const APP_VERSION = {
  version: "32.0.0",
  build: 3200,
  forceUpdate: true,
  releaseDate: "2026-09-10",
  updateMessage: "New version available! v32.0.0 ✨ CRITICAL: fixed startup crash (missing icon reference). Please update.",
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
