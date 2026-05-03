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

    // Strategy 1: Subdomain v1 (Worked for leagues)
    const url1 = `https://api.sportapi.ai/v1/${cleanPath}?token=${SPORT_API_KEY}${queryStr ? `&${queryStr}` : ''}`
    
    // Strategy 2: Main domain v1
    const url2 = `https://sportapi.ai/api/v1/${cleanPath}?token=${SPORT_API_KEY}${queryStr ? `&${queryStr}` : ''}`
    
    const strategies = [
      { url: url1, name: "Strategy 1 (Subdomain v1)" },
      { url: url2, name: "Strategy 2 (Main v1)" }
    ];

    let response;
    let responseText;
    let successfulStrategy = "None";
    const diagnosticResults = [];

    const headers = new Headers();
    headers.set('Accept', 'application/json');
    headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    headers.set('X-Api-Key', SPORT_API_KEY);

    for (const strat of strategies) {
      console.log(`[Proxy] Trying ${strat.name}: ${strat.url}`);
      try {
        const res = await fetch(strat.url, { 
          method: 'GET', 
          headers: headers 
        });
        const text = await res.text();
        
        const isWelcome = text.includes("Welcome to Sport API");
        const isAuthError = res.status === 401 || text.includes("API key required");

        diagnosticResults.push({
          name: strat.name,
          status: res.status,
          isWelcome,
          isAuthError
        });

        if (res.status === 200 && !isWelcome && !isAuthError) {
          response = res;
          responseText = text;
          successfulStrategy = strat.name;
          break;
        }
        
        response = res;
        responseText = text;
      } catch (err) {
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
