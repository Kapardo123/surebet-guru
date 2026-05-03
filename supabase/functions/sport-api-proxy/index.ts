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
    };

    // Strategy 1: URL Token (The most documented way)
    const url1 = `https://sportapi.ai/api/${cleanPath}?token=${SPORT_API_KEY}&${new URLSearchParams(params || "").toString()}`
    
    console.log(`[Proxy] Trying Strategy 1: ${url1}`);
    
    let response;
    let responseText;
    let strategy = "Strategy 1 (URL Token)";

    try {
      response = await fetch(url1, { method: 'GET', headers: commonHeaders });
      responseText = await response.text();
      
      // If we get a 502, 503, or the Welcome message, try Strategy 2
      if (response.status >= 500 || responseText.includes("Welcome to Sport API")) {
        console.log(`[Proxy] Strategy 1 failed (Status: ${response.status}, Welcome: ${responseText.includes("Welcome")}). Trying Strategy 2...`);
        
        // Strategy 2: X-Api-Key Header with api. subdomain
        const url2 = `https://api.sportapi.ai/v1/${cleanPath}?${new URLSearchParams(params || "").toString()}`
        strategy = "Strategy 2 (Header + Subdomain)";
        
        const altResponse = await fetch(url2, {
          method: 'GET',
          headers: {
            ...commonHeaders,
            'X-Api-Key': SPORT_API_KEY
          }
        });
        
        const altText = await altResponse.text();
        if (altResponse.status === 200 && !altText.includes("Welcome to Sport API")) {
          console.log("[Proxy] Strategy 2 succeeded!");
          response = altResponse;
          responseText = altText;
        }
      }
    } catch (err) {
      console.error(`[Proxy] Fetch error: ${err.message}`);
      throw err;
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
        strategy_used: strategy,
        final_status: response.status,
        welcome_detected: responseText.includes("Welcome to Sport API")
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
