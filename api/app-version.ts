import { NextResponse } from 'next/server';

export const runtime = 'edge';

const APP_VERSION = {
  version: "16.0.0",
  build: 1600,
  forceUpdate: true,
  releaseDate: "2026-05-30",
  updateMessage: "New version available! v16.0.0 — ad unlock fix, improved UX.",
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
