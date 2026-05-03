import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const SPORT_API_KEY = "sk_live_7f431190a0515b40375c17e0f9ff8f39fbc6df19"
const BASE_URL = "https://sportapi.ai" // Changed: removed /api from here to avoid duplication if endpoint has it

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { endpoint, params } = await req.json()
    
    // Clean up endpoint
    const cleanPath = endpoint.replace(/^\/+/, '').replace(/^api\//, '').replace(/^v1\//, '')
    
    console.log(`[Proxy] Incoming request for: ${cleanPath}`);

    const commonHeaders = {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'X-Api-Key': SPORT_API_KEY,
      'Authorization': `Bearer ${SPORT_API_KEY}`
    };

    const queryStr = new URLSearchParams(params || "").toString();

    // Strategy 1: sportapi.ai/api/v1/ (Most likely to fix Welcome message)
    const url1 = `https://sportapi.ai/api/v1/${cleanPath}?token=${SPORT_API_KEY}&${queryStr}`
    
    // Strategy 2: api.sportapi.ai/v1/ (Subdomain fallback)
    const url2 = `https://api.sportapi.ai/v1/${cleanPath}?token=${SPORT_API_KEY}&${queryStr}`
    
    // Strategy 3: sportapi.ai/api/ (Original, as documented)
    const url3 = `https://sportapi.ai/api/${cleanPath}?token=${SPORT_API_KEY}&${queryStr}`
    
    const strategies = [
      { url: url1, name: "Strategy 1 (v1 Path)" },
      { url: url2, name: "Strategy 2 (Subdomain v1)" },
      { url: url3, name: "Strategy 3 (Standard API Path)" }
    ];

    let response;
    let responseText;
    let successfulStrategy = "None";

    for (const strat of strategies) {
      console.log(`[Proxy] Trying ${strat.name}: ${strat.url}`);
      try {
        const res = await fetch(strat.url, { method: 'GET', headers: commonHeaders });
        const text = await res.text();
        
        console.log(`[Proxy] ${strat.name} Result - Status: ${res.status}, Welcome: ${text.includes("Welcome")}`);

        if (res.status === 200 && !text.includes("Welcome to Sport API") && !text.includes("API key required")) {
          console.log(`[Proxy] ${strat.name} SUCCEEDED!`);
          response = res;
          responseText = text;
          successfulStrategy = strat.name;
          break;
        }
        
        // Keep the last attempt if none succeed
        response = res;
        responseText = text;
        successfulStrategy = `Failed at ${strat.name}`;
      } catch (err) {
        console.error(`[Proxy] ${strat.name} Error: ${err.message}`);
      }
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { error: "Failed to parse API response", raw: responseText };
    }

    return new Response(JSON.stringify({
      ...data,
      _debug: {
        strategy_used: successfulStrategy,
        final_status: response?.status,
        welcome_detected: responseText.includes("Welcome to Sport API"),
        tried_urls: strategies.map(s => s.url)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
