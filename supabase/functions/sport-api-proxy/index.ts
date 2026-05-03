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
    
    // Clean up endpoint and build query params
    const cleanPath = endpoint.replace(/^\/+/, '').replace(/^api\//, '').replace(/^v1\//, '')
    
    // We use sportapi.ai/api/v1/ which is the most likely production path
    const finalUrl = `https://sportapi.ai/api/v1/${cleanPath}`
    const queryParams = new URLSearchParams(params || {})
    
    // Always include token in URL as a fallback
    queryParams.append('token', SPORT_API_KEY)
    
    const urlWithParams = `${finalUrl}?${queryParams.toString()}`
    
    console.log(`[Proxy] Requesting: ${urlWithParams}`);

    const response = await fetch(urlWithParams, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Api-Key': SPORT_API_KEY,
        'Authorization': `Bearer ${SPORT_API_KEY}`
      }
    })

    const responseText = await response.text();
    console.log(`[Proxy] Status: ${response.status}`);
    console.log(`[Proxy] Response: ${responseText.substring(0, 200)}`);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { error: "Failed to parse API response", raw: responseText };
    }

    return new Response(JSON.stringify(data), {
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
