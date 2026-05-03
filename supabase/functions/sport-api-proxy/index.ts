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

    // Create a standard Headers object
    const getHeaders = () => {
      const h = new Headers();
      h.set('Accept', 'application/json');
      h.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      h.set('X-Api-Key', SPORT_API_KEY);
      h.set('X-API-Key', SPORT_API_KEY);
      h.set('Authorization', `Bearer ${SPORT_API_KEY}`);
      return h;
    };

    const strategies = [
      { 
        url: `${BASE_URL}/api/v1/${cleanPath}?token=${SPORT_API_KEY}${queryStr ? `&${queryStr}` : ''}`, 
        name: "Strategy 1 (Main v1 + Token + Headers)"
      },
      { 
        url: `https://api.sportapi.ai/v1/${cleanPath}?token=${SPORT_API_KEY}${queryStr ? `&${queryStr}` : ''}`, 
        name: "Strategy 2 (Subdomain v1 + Token + Headers)"
      },
      { 
        url: `${BASE_URL}/api/${cleanPath}?token=${SPORT_API_KEY}${queryStr ? `&${queryStr}` : ''}`, 
        name: "Strategy 3 (Standard Path + Token + Headers)"
      }
    ];

    let response;
    let responseText;
    let successfulStrategy = "None";
    const diagnosticResults = [];

    for (const strat of strategies) {
      console.log(`[Proxy] Trying ${strat.name}: ${strat.url}`);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(strat.url, { 
          method: 'GET', 
          headers: getHeaders(),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const text = await res.text();
        
        const isWelcome = text.includes("Welcome to Sport API");
        const isAuthError = text.includes("API key required") || text.includes("Unauthorized") || res.status === 401;

        diagnosticResults.push({
          name: strat.name,
          status: res.status,
          isWelcome,
          isAuthError
        });

        console.log(`[Proxy] ${strat.name} Result - Status: ${res.status}, Welcome: ${isWelcome}, AuthError: ${isAuthError}`);

        if (res.status === 200 && !isWelcome && !isAuthError && !text.includes("Error 502")) {
          console.log(`[Proxy] ${strat.name} SUCCEEDED!`);
          response = res;
          responseText = text;
          successfulStrategy = strat.name;
          break;
        }
        
        response = res;
        responseText = text;
        successfulStrategy = `Failed all attempts`;
      } catch (err) {
        console.error(`[Proxy] ${strat.name} Error: ${err.message}`);
        diagnosticResults.push({ name: strat.name, error: err.message });
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
        successful_strategy: successfulStrategy,
        diagnostics: diagnosticResults,
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
