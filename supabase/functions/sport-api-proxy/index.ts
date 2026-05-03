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
    
    // Hardcoded URL construction to prevent any path issues
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    let finalUrl = `https://sportapi.ai/api${cleanEndpoint}`
    
    if (params && Object.keys(params).length > 0) {
      const qs = new URLSearchParams(params).toString()
      finalUrl += `?${qs}`
    }

    console.log(`[Proxy] Calling: ${finalUrl}`);

    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'X-Api-Key': SPORT_API_KEY,
        'Authorization': `Bearer ${SPORT_API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()

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
