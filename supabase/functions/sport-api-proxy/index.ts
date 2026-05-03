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
    const cleanPath = endpoint.replace(/^\/+/, '').replace(/^api\//, '').replace(/^v1\//, '')
    
    // Build query string with date FIRST (as seen in dashboard logs)
    const dateParam = params?.date || new Date().toISOString().split('T')[0];
    const finalUrl = `https://sportapi.ai/api/${cleanPath}?date=${dateParam}&token=${SPORT_API_KEY}`
    
    console.log(`[Proxy] Final calibrated URL: ${finalUrl}`);

    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'X-Api-Key': SPORT_API_KEY
      }
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { error: "Parse error", raw: responseText };
    }

    return new Response(JSON.stringify({
      ...data,
      _debug: {
        url: finalUrl,
        status: response.status,
        isWelcome: responseText.includes("Welcome to Sport API")
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
