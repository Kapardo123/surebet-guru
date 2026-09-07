import { NextResponse } from 'next/server';

export const runtime = 'edge';

const APP_VERSION = {
  version: "29.0.0",
  build: 2900,
  forceUpdate: false,
  releaseDate: "2026-09-07",
  updateMessage: "New version available! v29.0.0 ✨ Yesterday admin tab (manual + AI settle), coupon editing in Queue, R8 obfuscation, fixed daily-win archiving.",
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
