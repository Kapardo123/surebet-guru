import { NextResponse } from 'next/server';

export const runtime = 'edge';

const APP_VERSION = {
  version: "30.0.0",
  build: 3000,
  forceUpdate: false,
  releaseDate: "2026-09-07",
  updateMessage: "New version available! v30.0.0 ✨ Streamlined app: Queue + countdown + Live management, realistic custom icons, R8 optimised.",
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
