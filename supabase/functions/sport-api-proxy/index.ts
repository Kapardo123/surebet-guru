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
    
    // Diagnostic info
    console.log(`[Proxy] Incoming request for: ${cleanPath}`);
    console.log(`[Proxy] Params: ${JSON.stringify(params)}`);

    // We'll try the most standard URL first
    const finalUrl = `https://sportapi.ai/api/${cleanPath}`
    const queryParams = new URLSearchParams(params || {})
    queryParams.append('token', SPORT_API_KEY)
    
    const urlWithParams = `${finalUrl}?${queryParams.toString()}`
    
    console.log(`[Proxy] Primary URL: ${urlWithParams}`);

    // Try primary URL
    let response = await fetch(urlWithParams, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Api-Key': SPORT_API_KEY
      }
    })

    let responseText = await response.text();
    console.log(`[Proxy] Status: ${response.status}`);
    
    // If we get the "Welcome" message, try alternative URL structure
    if (responseText.includes("Welcome to Sport API")) {
      console.log("[Proxy] Got Welcome message, trying alternative URL...");
      const altUrl = `https://api.sportapi.ai/${cleanPath}?token=${SPORT_API_KEY}&${new URLSearchParams(params || "").toString()}`
      console.log(`[Proxy] Alternative URL: ${altUrl}`);
      
      const altResponse = await fetch(altUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json', 'X-Api-Key': SPORT_API_KEY }
      });
      
      const altText = await altResponse.text();
      if (!altText.includes("Welcome to Sport API")) {
        console.log("[Proxy] Alternative URL succeeded!");
        response = altResponse;
        responseText = altText;
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
        url: urlWithParams,
        status: response.status,
        headers_sent: ['Accept', 'X-Api-Key']
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
