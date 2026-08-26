import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/

// Dev-only middleware replicating api/sportytrader-odds.ts (Vercel edge).
// On localhost /api/* would otherwise fall into the SPA fallback and return
// index.html instead of JSON, so the odds extraction silently failed.
const sportytraderOddsDev = () => ({
  name: "sportytrader-odds-dev",
  configureServer(server: import("vite").ViteDevServer) {
    server.middlewares.use("/api/sportytrader-odds", async (_req, res) => {
      // Best-effort server fetch: Cloudflare 403s plain Node TLS, so this
      // usually answers {"odds":{}} quickly and lets the BROWSER chain in
      // fetchClientOdds() take over (corsproxy.io serves browsers only).
      // Rendering proxies (r.jina.ai) are deliberately avoided here: their
      // post-hydration DOM loses the odd="..." attributes we parse.
      const target = "https://www.sportytrader.com/en/betting-tips/";

      let html = "";
      try {
        const r = await (globalThis as any).fetch(target, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });
        if (r.ok) {
          const text: string = await r.text();
          if (text.includes("data-navigation-url-value")) html = text;
        }
      } catch {
        /* fall through -> empty odds */
      }

      try {
        const marker =
          /data-navigation-url-value="(\/en\/betting-tips\/([a-z0-9-]+-(\d+))\/)"/g;
        const starts: { idx: number; id: string }[] = [];
        let m: RegExpExecArray | null;
        while ((m = marker.exec(html)) !== null) {
          starts.push({ idx: m.index, id: m[3] });
        }

        const odds: Record<string, number> = {};
        for (let i = 0; i < starts.length; i++) {
          const s = starts[i];
          if (odds[s.id] !== undefined) continue;
          const card = html.slice(
            s.idx,
            i + 1 < starts.length ? starts[i + 1].idx : html.length,
          );
          const bnl = card.match(/<bet-now-(?:light|large)[\s\S]*?\bodd="([\d.]+)"/);
          const fb = !bnl && card.match(/<span[^>]*\bfont-bold\b[^>]*>([\d.]+)<\/span>/);
          const v = parseFloat((bnl || fb)?.[1] ?? "");
          if (v > 0) odds[s.id] = v;
        }

        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ odds }));
      } catch (e) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: String(e), odds: {} }));
      }
    });
  },
});

export default defineConfig(({ mode }) => ({
  base: mode === 'android' ? './' : '/',
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    sportytraderOddsDev(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "logo.png", "splash.png"],
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackAllowlist: [/^\/(?!api|app-ads\.txt|google.*\.html|\.well-known).*/],
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
      manifest: {
        name: "Great Sport Bets",
        short_name: "GreatSportBets",
        description: "Best betting tips and predictions",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        icons: [
          {
            src: "logo.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "logo.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "logo.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
