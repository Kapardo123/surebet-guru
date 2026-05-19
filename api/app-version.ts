import { NextResponse } from 'next/server';

export const runtime = 'edge';

const APP_VERSION = {
  version: "11.0.0",
  build: 1100,
  forceUpdate: true,
  releaseDate: "2026-05-19",
  updateMessage: "New version available! 🚀 Enhanced AdMob integration, improved UI, and bug fixes.",
  downloadUrl: "https://play.google.com/store/apps/details?id=com.surebet.guru",
  minSupportedVersion: "9.0.0"
};

export async function GET() {
  return NextResponse.json(APP_VERSION, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      'Content-Type': 'application/json',
    },
  });
}
