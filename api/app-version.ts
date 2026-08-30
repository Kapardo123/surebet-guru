import { NextResponse } from 'next/server';

export const runtime = 'edge';

const APP_VERSION = {
  version: "24.0.0",
  build: 2400,
  forceUpdate: true,
  releaseDate: "2026-08-31",
  updateMessage: "New version available! v24.0.0 ✨ Import cleanup: no auto logos, ZawodTyper filters pre-set (hide betbuilders, confirmed kickoffs only).",
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
