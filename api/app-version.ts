import { NextResponse } from 'next/server';

export const runtime = 'edge';

const APP_VERSION = {
  version: "31.0.0",
  build: 3100,
  forceUpdate: false,
  releaseDate: "2026-09-10",
  updateMessage: "New version available! v31.0.0 ✨ Startup crash fix (ProGuard hardening for Capacitor bridge).",
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
