import { NextResponse } from 'next/server';

export const runtime = 'edge';

const APP_VERSION = {
  version: "23.0.0",
  build: 2300,
  forceUpdate: true,
  releaseDate: "2026-08-30",
  updateMessage: "New version available! v23.0.0 ✨ Auto team logos on import, fixed SportyTrader odds fetching, faster proxies.",
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
