import { NextResponse } from 'next/server';

export const runtime = 'edge';

const APP_VERSION = {
  version: "27.0.0",
  build: 2700,
  forceUpdate: false,
  releaseDate: "2026-09-04",
  updateMessage: "New version available! v27.0.0 ✨ Per-leg coupon statuses in Yesterday's Results, more logo sources (PageImages/Openverse), native fetch timeouts fixed.",
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
