import { NextResponse } from 'next/server';

export const runtime = 'edge';

const APP_VERSION = {
  version: "28.0.0",
  build: 2800,
  forceUpdate: false,
  releaseDate: "2026-09-04",
  updateMessage: "New version available! v28.0.0 ✨ AI web-search settlement for ALL bet types (player props, cards), Yesterday's Wins tab (winners only), coupon editing in Queue.",
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
