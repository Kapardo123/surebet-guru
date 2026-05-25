import { NextResponse } from 'next/server';

export const runtime = 'edge';

const APP_VERSION = {
  version: "13.0.0",
  build: 1300,
  forceUpdate: true,
  releaseDate: "2026-05-25",
  updateMessage: "New version available! 🚀 Enhanced UI, improved mobile layout, and bug fixes.",
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
