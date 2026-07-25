// Vercel Edge Function: sportytrader-proxy
// Fetches SportyTrader listing from Vercel's edge network (different IP than Supabase)

export const runtime = 'edge';

export async function GET() {
  try {
    const res = await fetch("https://www.sportytrader.com/en/betting-tips/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    
    const html = await res.text();
    
    // Parse match cards and extract odds
    const marker = /data-navigation-url-value="(\/en\/betting-tips\/([a-z0-9-]+-(\d+))\/)"/g;
    const starts: { idx: number; id: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = marker.exec(html)) !== null) {
      starts.push({ idx: m.index, id: m[3] });
    }

    const result: Record<string, number> = {};
    for (let i = 0; i < starts.length; i++) {
      const s = starts[i];
      if (result[s.id] !== undefined) continue;
      const card = html.slice(s.idx, i + 1 < starts.length ? starts[i + 1].idx : html.length);
      
      // Extract odds: bet-now-light odd="X" or font-bold span
      let odds: number | null = null;
      const bnl = card.match(/<bet-now-(?:light|large)[\s\S]*?\bodd="([\d.]+)"/);
      if (bnl) {
        const v = parseFloat(bnl[1]);
        if (v > 0) odds = v;
      }
      if (odds === null) {
        const fb = card.match(/<span[^>]*\bfont-bold\b[^>]*>([\d.]+)<\/span>/);
        if (fb) {
          const v = parseFloat(fb[1]);
          if (v > 0) odds = v;
        }
      }
      if (odds !== null) result[s.id] = odds;
    }

    return new Response(JSON.stringify({ odds: result }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, s-maxage=300",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error), odds: {} }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
