import { NextResponse } from 'next/server';

export const runtime = 'edge';

const APP_VERSION = {
  version: "33.0.0",
  build: 3300,
  forceUpdate: false,
  releaseDate: "2026-09-11",
  updateMessage: "New version available! v33.0.0 ✨ Smoother hero loading (instant, no flash), faster startup, improved team logo search (real crests).",
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
