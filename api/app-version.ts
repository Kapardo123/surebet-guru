import { NextResponse } from 'next/server';

export const runtime = 'edge';

const APP_VERSION = {
  version: "26.0.0",
  build: 2600,
  forceUpdate: false,
  releaseDate: "2026-09-04",
  updateMessage: "New version available! v26.0.0 ✨ Waiting Room (3:00 daily drop), Yesterday's Results with per-leg coupon statuses, redesigned Premium page & spin wheel.",
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
